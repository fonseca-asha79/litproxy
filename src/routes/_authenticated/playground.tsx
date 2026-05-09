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
  const [keyId, setKeyId] = useState("auto");
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

      <section className="border-b border-hairline">
        <div className="mx-auto max-w-6xl px-6 pt-12 pb-8">
          <p className="eyebrow">Playground</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Test your endpoint</h1>
          <p className="mt-3 max-w-xl text-[14px] text-foreground/60">
            Compose a request, pick a model, choose which key to send it through. Hits the same
            public endpoint your apps would.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Controls */}
          <aside className="lg:col-span-4">
            <div className="rounded-2xl border border-hairline bg-surface/40 p-6">
              <h2 className="text-[14px] font-semibold uppercase tracking-wider text-muted-foreground">Configuration</h2>

              <div className="mt-5 space-y-5">
                <Field label="Model">
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-md border border-hairline bg-background px-3 py-2 text-[13.5px] focus:border-brand focus:outline-none"
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
                    className="w-full rounded-md border border-hairline bg-background px-3 py-2 text-[13.5px] focus:border-brand focus:outline-none"
                  >
                    <option value="auto">Auto — rotate / fallback ({keys.length})</option>
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

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Temperature">
                    <input
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="0.7"
                      className="w-full rounded-md border border-hairline bg-background px-3 py-2 text-[13.5px] focus:border-brand focus:outline-none"
                    />
                  </Field>
                  <Field label="Max tokens">
                    <input
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(e.target.value)}
                      placeholder="auto"
                      className="w-full rounded-md border border-hairline bg-background px-3 py-2 text-[13.5px] focus:border-brand focus:outline-none"
                    />
                  </Field>
                </div>

                <div className="border-t border-hairline pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Endpoint</p>
                  <p className="mt-1.5 break-all font-mono text-[11px] text-foreground/55">{endpoint}</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Messages + response */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-hairline bg-surface/40 p-6">
              <h2 className="text-[14px] font-semibold uppercase tracking-wider text-muted-foreground">Composition</h2>

              <div className="mt-5 space-y-4">
                <Field label="System (optional)">
                  <textarea
                    value={system}
                    onChange={(e) => setSystem(e.target.value)}
                    rows={2}
                    placeholder="You are a helpful assistant…"
                    className="w-full resize-y rounded-md border border-hairline bg-background p-3 font-mono text-[12.5px] focus:border-brand focus:outline-none"
                  />
                </Field>

                <Field label="User message">
                  <textarea
                    value={user_msg}
                    onChange={(e) => setUserMsg(e.target.value)}
                    rows={5}
                    className="w-full resize-y rounded-md border border-hairline bg-background p-3 font-mono text-[12.5px] focus:border-brand focus:outline-none"
                  />
                </Field>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={run}
                  disabled={running}
                  className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-[13.5px] font-medium text-primary-foreground transition-colors hover:bg-brand-deep disabled:opacity-60"
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
                  className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-4 py-2.5 text-[13px] text-foreground/70 hover:border-foreground/40 hover:text-foreground"
                >
                  <Eraser className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
            </div>

            {/* Response */}
            <div className="mt-6 rounded-2xl border border-hairline bg-surface/40 p-6">
              <div className="flex items-baseline justify-between">
                <h3 className="text-[14px] font-semibold uppercase tracking-wider text-muted-foreground">Response</h3>
                {response && (
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 " +
                        (response.status >= 200 && response.status < 300
                          ? "border border-success/30 bg-success/10 text-success"
                          : "border border-destructive/30 bg-destructive/10 text-destructive")
                      }
                    >
                      {response.status || "ERR"}
                    </span>
                    <span className="text-muted-foreground">{response.ms}ms</span>
                  </div>
                )}
              </div>

              {!response && !running && (
                <p className="mt-5 text-[13px] text-muted-foreground">Awaiting your first request…</p>
              )}
              {running && <p className="mt-5 text-[13px] text-muted-foreground">Sending…</p>}
              {response && (
                <>
                  <pre className="mt-5 max-h-[400px] overflow-auto whitespace-pre-wrap rounded-lg border border-hairline bg-background p-4 font-mono text-[12.5px] leading-6 text-foreground/90">
                    {response.content}
                  </pre>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
                      Raw JSON
                    </summary>
                    <pre className="mt-2 max-h-[300px] overflow-auto rounded-lg border border-hairline bg-background p-4 font-mono text-[11px] leading-5 text-foreground/70">
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
