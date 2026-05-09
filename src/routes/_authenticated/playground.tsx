import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MODELS } from "@/lib/models";
import { toast } from "sonner";
import { Play, Eraser } from "lucide-react";

export const Route = createFileRoute("/_authenticated/playground")({
  head: () => ({ meta: [{ title: "Playground — Litproxy" }] }),
  component: Playground,
});

interface Settings {
  user_id: string;
  default_model: string;
  proxy_api_key: string;
}
interface KeyRow {
  id: string;
  label: string;
  is_active: boolean;
}

function Playground() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [model, setModel] = useState("default");
  const [keyId, setKeyId] = useState("auto"); // "auto" = rotation, otherwise force key
  const [system, setSystem] = useState("");
  const [user_msg, setUserMsg] = useState("Write a haiku about quiet infrastructure.");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("");
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<{
    status: number;
    ms: number;
    content: string;
    raw: any;
  } | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const endpoint = `${baseUrl}/api/public/v1/chat/completions`;

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("user_settings").select("*").maybeSingle(),
      supabase.from("lightning_keys").select("id, label, is_active").order("created_at", { ascending: false }),
    ]).then(([s, k]) => {
      if (s.data) {
        setSettings(s.data as Settings);
        setModel("default");
      }
      if (k.data) setKeys((k.data as KeyRow[]).filter((x) => x.is_active));
    });
  }, [user]);

  const messages = useMemo(() => {
    const m: Array<{ role: string; content: string }> = [];
    if (system.trim()) m.push({ role: "system", content: system.trim() });
    m.push({ role: "user", content: user_msg });
    return m;
  }, [system, user_msg]);

  const run = async () => {
    if (!settings) return toast.error("Loading your settings…");
    if (keys.length === 0) return toast.error("Add at least one Lightning key in your dashboard.");
    if (!user_msg.trim()) return toast.error("Write a user message first.");

    setRunning(true);
    setResponse(null);
    const t0 = performance.now();

    const body: any = { model, messages };
    if (temperature.trim()) body.temperature = Number(temperature);
    if (maxTokens.trim()) body.max_tokens = Number(maxTokens);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.proxy_api_key}`,
    };
    if (keyId !== "auto") headers["X-Lightning-Key-Id"] = keyId;

    try {
      const r = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body) });
      const ms = Math.round(performance.now() - t0);
      const json = await r.json();
      const content =
        json?.choices?.[0]?.message?.content ??
        json?.error?.message ??
        JSON.stringify(json, null, 2);
      setResponse({ status: r.status, ms, content, raw: json });
    } catch (e: any) {
      setResponse({
        status: 0,
        ms: Math.round(performance.now() - t0),
        content: String(e?.message || e),
        raw: { error: String(e) },
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-10">
          <p className="eyebrow">Workshop</p>
          <h1 className="mt-3 font-serif-italic text-6xl leading-none">Playground.</h1>
          <p className="mt-5 max-w-xl font-display text-lg italic text-ink/70">
            Compose a request. Pick a model. Choose which key to send it through. The
            response, latency and status are kept for the session.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Controls */}
          <aside className="lg:col-span-4">
            <h2 className="font-display text-2xl italic">Configuration</h2>

            <div className="mt-6 space-y-6">
              <Field label="Model">
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full border-0 border-b border-border bg-transparent py-2 text-[15px] focus:border-ink focus:outline-none"
                >
                  <option value="default">
                    default — uses {settings?.default_model || "your dashboard default"}
                  </option>
                  {MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Lightning key">
                <select
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  className="w-full border-0 border-b border-border bg-transparent py-2 text-[15px] focus:border-ink focus:outline-none"
                >
                  <option value="auto">Auto — rotate / fall back ({keys.length})</option>
                  {keys.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </select>
                {keys.length === 0 && (
                  <p className="mt-2 text-[12px] text-destructive">
                    No active keys. Add one in the dashboard first.
                  </p>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Temperature">
                  <input
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="0.7"
                    className="w-full border-0 border-b border-border bg-transparent py-2 text-[15px] focus:border-ink focus:outline-none"
                  />
                </Field>
                <Field label="Max tokens">
                  <input
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(e.target.value)}
                    placeholder="auto"
                    className="w-full border-0 border-b border-border bg-transparent py-2 text-[15px] focus:border-ink focus:outline-none"
                  />
                </Field>
              </div>

              <div className="border-t border-border pt-6">
                <p className="eyebrow">Endpoint</p>
                <p className="mt-2 break-all font-mono text-[11px] text-ink/60">{endpoint}</p>
              </div>
            </div>
          </aside>

          {/* Messages + response */}
          <div className="lg:col-span-8">
            <h2 className="font-display text-2xl italic">Composition</h2>

            <Field label="System (optional)" className="mt-6">
              <textarea
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                rows={2}
                placeholder="You are a helpful assistant…"
                className="w-full resize-y border border-border bg-paper p-3 font-mono text-[13px] focus:border-ink focus:outline-none"
              />
            </Field>

            <Field label="User message" className="mt-6">
              <textarea
                value={user_msg}
                onChange={(e) => setUserMsg(e.target.value)}
                rows={5}
                className="w-full resize-y border border-border bg-paper p-3 font-mono text-[13px] focus:border-ink focus:outline-none"
              />
            </Field>

            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={run}
                disabled={running}
                className="cta-primary inline-flex items-center gap-2 bg-ink px-8 py-3 text-paper transition-colors hover:bg-magenta disabled:opacity-60"
              >
                <Play className="h-3.5 w-3.5" />
                {running ? "Sending…" : "Send request"}
              </button>
              <button
                onClick={() => {
                  setResponse(null);
                  setSystem("");
                  setUserMsg("");
                }}
                className="cta-primary inline-flex items-center gap-2 text-ink/60 hover:text-magenta"
              >
                <Eraser className="h-3.5 w-3.5" /> Clear
              </button>
            </div>

            {/* Response */}
            <div className="mt-10 border-t border-border pt-8">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-2xl italic">Response</h3>
                {response && (
                  <div className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-wider">
                    <span className={response.status >= 200 && response.status < 300 ? "text-success" : "text-destructive"}>
                      {response.status || "ERR"}
                    </span>
                    <span className="text-ash">{response.ms}ms</span>
                  </div>
                )}
              </div>

              {!response && !running && (
                <p className="mt-6 font-display text-lg italic text-ash">
                  Awaiting your first request…
                </p>
              )}
              {running && (
                <p className="mt-6 font-display text-lg italic text-ash">Sending…</p>
              )}
              {response && (
                <>
                  <pre className="mt-6 max-h-[400px] overflow-auto whitespace-pre-wrap border border-border bg-paper p-5 font-mono text-[13px] leading-6 text-ink">
                    {response.content}
                  </pre>
                  <details className="mt-4">
                    <summary className="cursor-pointer text-[11px] uppercase tracking-[0.2em] text-ash hover:text-ink">
                      Raw JSON
                    </summary>
                    <pre className="mt-3 max-h-[300px] overflow-auto border border-border bg-background p-4 font-mono text-[11px] leading-5 text-ink/70">
                      {JSON.stringify(response.raw, null, 2)}
                    </pre>
                  </details>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={"block " + className}>
      <span className="eyebrow block">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
