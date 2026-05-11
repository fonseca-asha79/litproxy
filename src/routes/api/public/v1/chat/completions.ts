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

  // Capture caller UA so we can forward it upstream + log it for debugging WAF blocks.
  const callerUA = request.headers.get("user-agent") || "";
  const upstreamUA = callerUA || "OpenAI/Proxy (litproxy)";

  // Snapshot body for logging (truncate huge messages so jsonb stays sane).
  const loggedBody = (() => {
    try {
      const s = JSON.stringify(body);
      if (s.length <= 20000) return body;
      return { _truncated: true, _original_size: s.length, preview: s.slice(0, 20000) };
    } catch {
      return null;
    }
  })();

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
    const aStart = Date.now();
    let upstream: Response;
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
      const ms = Date.now() - aStart;
      attempts.push({ key_id: key.id, key_label: key.label, http_status: 0, error: String(e?.message || e), ms });
      await supabaseAdmin
        .from("lightning_keys")
        .update({ failure_count: ((key as any).failure_count || 0) + 1, last_error: String(e?.message || e), last_used_at: new Date().toISOString() })
        .eq("id", key.id);
      continue;
    }

    const ms = Date.now() - aStart;

    if (upstream.ok) {
      // Mark key as used (success resets failure_count)
      await supabaseAdmin
        .from("lightning_keys")
        .update({ last_used_at: new Date().toISOString(), failure_count: 0, last_error: null })
        .eq("id", key.id);

      attempts.push({ key_id: key.id, key_label: key.label, http_status: upstream.status, ms });

      if (isStream) {
        // Stream-through; we cannot count tokens reliably without parsing SSE.
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

    // Failure on this key — capture body, increment failure_count, try next
    let errText = "";
    try {
      errText = await upstream.text();
    } catch {}
    attempts.push({ key_id: key.id, key_label: key.label, http_status: upstream.status, error: errText.slice(0, 1000), ms });
    await supabaseAdmin
      .from("lightning_keys")
      .update({
        failure_count: ((key as any).failure_count || 0) + 1,
        last_error: errText.slice(0, 500),
        last_used_at: new Date().toISOString(),
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
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }),
      POST: async ({ request }) => handle(request),
    },
  },
});
