import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeCost } from "@/lib/models";

const LIGHTNING_BASE = "https://lightning.ai/api/v1";

interface AttemptRecord {
  key_id: string;
  key_label: string;
  http_status: number;
  error?: string;
  ms: number;
}

// Models that reject `temperature` / `top_p` / `frequency_penalty` / `presence_penalty`.
// Anthropic's newer reasoning models (opus 4.6+, sonnet 4.6+) and OpenAI gpt-5 reasoning
// family deprecate these. We strip and retry on the relevant 400.
const UNSUPPORTED_PARAM_REGEX = /(temperature|top_p|frequency_penalty|presence_penalty|max_tokens)/i;
const DEPRECATED_ERROR_REGEX = /(deprecated|unsupported|not supported|unrecognized|unknown parameter)/i;

function stripParam(body: any, errText: string): string[] {
  const stripped: string[] = [];
  for (const p of ["temperature", "top_p", "frequency_penalty", "presence_penalty", "max_tokens", "n", "seed"]) {
    if (errText.toLowerCase().includes(p) && body[p] !== undefined) {
      delete body[p];
      stripped.push(p);
    }
  }
  return stripped;
}

function isAuthFailure(status: number, errText: string): boolean {
  if (status === 401 || status === 403) return true;
  // Cloudflare HTML block page
  if (errText.includes("<!DOCTYPE html") && errText.toLowerCase().includes("cloudflare")) return true;
  return false;
}

async function handle(request: Request) {
  const started = Date.now();

  // Auth: Bearer <proxy_api_key> OR ?api_key=...
  const authHeader = request.headers.get("authorization") || "";
  const url = new URL(request.url);
  let proxyKey =
    authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : (url.searchParams.get("api_key") || "").trim();

  if (!proxyKey) {
    return jsonError(401, "Missing API key. Pass it as `Authorization: Bearer <key>` or `?api_key=<key>`.");
  }

  // Look up user by proxy key
  const { data: settings, error: sErr } = await supabaseAdmin
    .from("user_settings")
    .select("user_id, default_model")
    .eq("proxy_api_key", proxyKey)
    .maybeSingle();

  if (sErr || !settings) {
    return jsonError(401, "Invalid API key.");
  }

  // Parse body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  const requestedModel: string | null = body?.model || null;
  const isDefaultAlias =
    !requestedModel || ["default", "none", "auto"].includes(String(requestedModel).trim().toLowerCase());
  const modelToUse = isDefaultAlias ? settings.default_model : requestedModel!;
  body.model = modelToUse;
  const isStream = !!body?.stream;

  // Optional: force a specific Lightning key (used by the playground).
  const forcedKeyId =
    request.headers.get("x-lightning-key-id") ||
    url.searchParams.get("lightning_key_id") ||
    "";

  // Fetch user's active Lightning keys (rotate by least-recently-used)
  let query = supabaseAdmin
    .from("lightning_keys")
    .select("id, label, api_key, last_used_at")
    .eq("user_id", settings.user_id)
    .eq("is_active", true)
    .order("last_used_at", { ascending: true, nullsFirst: true });
  if (forcedKeyId) query = query.eq("id", forcedKeyId);
  const { data: keys } = await query;

  if (!keys || keys.length === 0) {
    await logRequest({
      user_id: settings.user_id,
      model_requested: requestedModel,
      model_used: modelToUse,
      status: "error",
      http_status: 400,
      error_message: "No active Lightning AI keys configured.",
      latency_ms: Date.now() - started,
    });
    return jsonError(400, "No active Lightning AI keys configured. Add one in your dashboard.");
  }

  const attempts: AttemptRecord[] = [];

  for (const key of keys) {
    let upstream: Response | null = null;
    let errText = "";
    let aStart = Date.now();
    let ms = 0;
    let fetchErr = "";

    // Up to 3 tries per key — strip an unsupported param each retry.
    for (let tryNum = 0; tryNum < 3; tryNum++) {
      aStart = Date.now();
      try {
        upstream = await fetch(`${LIGHTNING_BASE}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key.api_key}`,
          },
          body: JSON.stringify(body),
        });
      } catch (e: any) {
        ms = Date.now() - aStart;
        fetchErr = String(e?.message || e);
        upstream = null;
        break;
      }
      ms = Date.now() - aStart;

      if (upstream.ok) break;

      try { errText = await upstream.text(); } catch { errText = ""; }

      if (
        upstream.status >= 400 &&
        DEPRECATED_ERROR_REGEX.test(errText) &&
        UNSUPPORTED_PARAM_REGEX.test(errText)
      ) {
        const stripped = stripParam(body, errText);
        if (stripped.length > 0) {
          attempts.push({ key_id: key.id, key_label: key.label, http_status: upstream.status, error: `Stripped unsupported param(s): ${stripped.join(", ")} — retrying`, ms });
          continue;
        }
      }
      break;
    }

    if (!upstream) {
      attempts.push({ key_id: key.id, key_label: key.label, http_status: 0, error: fetchErr, ms });
      await supabaseAdmin
        .from("lightning_keys")
        .update({ failure_count: ((key as any).failure_count || 0) + 1, last_error: fetchErr.slice(0, 500), last_used_at: new Date().toISOString() })
        .eq("id", key.id);
      continue;
    }

    if (upstream.ok) {
      await supabaseAdmin
        .from("lightning_keys")
        .update({ last_used_at: new Date().toISOString(), failure_count: 0, last_error: null })
        .eq("id", key.id);

      attempts.push({ key_id: key.id, key_label: key.label, http_status: upstream.status, ms });

      if (isStream) {
        await logRequest({
          user_id: settings.user_id,
          model_requested: requestedModel,
          model_used: modelToUse,
          lightning_key_id: key.id,
          lightning_key_label: key.label,
          status: "success",
          http_status: 200,
          latency_ms: Date.now() - started,
          attempts: attempts.length,
          attempt_details: attempts,
        });
        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": upstream.headers.get("content-type") || "text/event-stream",
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      const json = await upstream.json();
      const usage = json?.usage || {};
      const pt = usage.prompt_tokens ?? 0;
      const ct = usage.completion_tokens ?? 0;
      const tt = usage.total_tokens ?? pt + ct;
      const cost = computeCost(modelToUse, pt, ct);

      await logRequest({
        user_id: settings.user_id,
        model_requested: requestedModel,
        model_used: modelToUse,
        lightning_key_id: key.id,
        lightning_key_label: key.label,
        status: "success",
        http_status: 200,
        prompt_tokens: pt,
        completion_tokens: ct,
        total_tokens: tt,
        cost_usd: cost,
        latency_ms: Date.now() - started,
        attempts: attempts.length,
        attempt_details: attempts,
      });

      return new Response(JSON.stringify(json), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Failure on this key
    const cleanErr = errText.includes("<!DOCTYPE")
      ? `Upstream returned an HTML error page (HTTP ${upstream.status}) — usually means this Lightning AI key is invalid or blocked.`
      : errText.slice(0, 1000);
    attempts.push({ key_id: key.id, key_label: key.label, http_status: upstream.status, error: cleanErr, ms });

    const newFailureCount = ((key as any).failure_count || 0) + 1;
    const authBad = isAuthFailure(upstream.status, errText);
    await supabaseAdmin
      .from("lightning_keys")
      .update({
        failure_count: newFailureCount,
        last_error: cleanErr.slice(0, 500),
        last_used_at: new Date().toISOString(),
        // Auto-deactivate keys that fail auth — prevents Cloudflare HTML loop.
        is_active: authBad ? false : true,
      })
      .eq("id", key.id);
  }

  // All keys failed
  const last = attempts[attempts.length - 1];
  await logRequest({
    user_id: settings.user_id,
    model_requested: requestedModel,
    model_used: modelToUse,
    lightning_key_id: last?.key_id,
    lightning_key_label: last?.key_label,
    status: "error",
    http_status: last?.http_status || 502,
    error_message: last?.error || "All Lightning AI keys failed.",
    latency_ms: Date.now() - started,
    attempts: attempts.length,
    attempt_details: attempts,
  });

  return new Response(
    JSON.stringify({
      error: {
        message: `All ${attempts.length} Lightning AI key(s) failed. Last error: ${last?.error || "unknown"}`,
        type: "upstream_error",
        attempts,
      },
    }),
    { status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
  );
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: { message, type: "invalid_request_error" } }), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

async function logRequest(row: any) {
  try {
    await supabaseAdmin.from("request_logs").insert(row);
  } catch (e) {
    console.error("Failed to log request:", e);
  }
}

export const Route = createFileRoute("/api/public/v1/chat/completions")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Lightning-Key-Id",
          },
        }),
      POST: async ({ request }) => handle(request),
    },
  },
});
