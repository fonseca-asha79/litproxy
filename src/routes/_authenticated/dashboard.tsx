import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MODELS } from "@/lib/models";
import { toast } from "sonner";
import { Copy, Trash2, Plus, RefreshCw, Eye, EyeOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Litproxy" }] }),
  component: Dashboard,
});

interface LightningKey {
  id: string;
  label: string;
  api_key: string;
  is_active: boolean;
  failure_count: number;
  last_used_at: string | null;
  last_error: string | null;
  created_at: string;
}
interface Settings {
  user_id: string;
  default_model: string;
  proxy_api_key: string;
}
interface LogRow {
  id: string;
  model_requested: string | null;
  model_used: string | null;
  lightning_key_label: string | null;
  status: string;
  http_status: number | null;
  error_message: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cost_usd: number | null;
  latency_ms: number | null;
  attempts: number | null;
  created_at: string;
}

function Dashboard() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [keys, setKeys] = useState<LightningKey[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [showProxy, setShowProxy] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [adding, setAdding] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const endpoint = `${baseUrl}/api/public/v1`;

  const refresh = async () => {
    const [s, k, l] = await Promise.all([
      supabase.from("user_settings").select("*").maybeSingle(),
      supabase.from("lightning_keys").select("*").order("created_at", { ascending: false }),
      supabase.from("request_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (s.data) setSettings(s.data as Settings);
    if (k.data) setKeys(k.data as LightningKey[]);
    if (l.data) setLogs(l.data as LogRow[]);
  };

  useEffect(() => {
    if (user) refresh();
  }, [user]);

  const addKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("lightning_keys").insert({
      user_id: user!.id,
      label: newLabel.trim() || `Key ${keys.length + 1}`,
      api_key: newKey.trim(),
    });
    setAdding(false);
    if (error) return toast.error(error.message);
    setNewLabel("");
    setNewKey("");
    toast.success("Key added");
    refresh();
  };

  const removeKey = async (id: string) => {
    const { error } = await supabase.from("lightning_keys").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const toggleKey = async (id: string, is_active: boolean) => {
    await supabase.from("lightning_keys").update({ is_active: !is_active }).eq("id", id);
    refresh();
  };

  const updateModel = async (model: string) => {
    if (!settings) return;
    await supabase.from("user_settings").update({ default_model: model }).eq("user_id", settings.user_id);
    setSettings({ ...settings, default_model: model });
    toast.success("Default model updated");
  };

  const rotateProxy = async () => {
    if (!confirm("Rotate proxy API key? Old key will stop working immediately.")) return;
    const newK = "lvp_" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("user_settings").update({ proxy_api_key: newK }).eq("user_id", settings!.user_id);
    if (error) return toast.error(error.message);
    setSettings({ ...settings!, proxy_api_key: newK });
    toast.success("Proxy key rotated");
  };

  const copy = (s: string, what = "Copied") => {
    navigator.clipboard.writeText(s);
    toast.success(what);
  };

  const totalCost = logs.reduce((a, l) => a + (l.cost_usd || 0), 0);
  const totalTokens = logs.reduce((a, l) => a + (l.prompt_tokens || 0) + (l.completion_tokens || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Masthead */}
      <section className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-6 pt-16 pb-10">
          <div>
            <p className="eyebrow">Volume III · Your desk</p>
            <h1 className="mt-3 font-serif-italic text-6xl leading-none">Dashboard.</h1>
          </div>
          <Link to="/playground" className="cta-primary text-ink/70 hover:text-magenta">
            Open playground →
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-6 py-12">
        {/* Endpoint */}
        <section>
          <SectionHeader n="01" title="Your endpoint" lede="One URL. One key. OpenAI-compatible." />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Field label="Base URL">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={endpoint}
                  className="w-full border-0 border-b border-border bg-transparent py-2 font-mono text-[13px] text-ink/80 focus:outline-none"
                />
                <IconBtn onClick={() => copy(endpoint, "URL copied")}><Copy className="h-3.5 w-3.5" /></IconBtn>
              </div>
            </Field>
            <Field label="Proxy API key">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  type={showProxy ? "text" : "password"}
                  value={settings?.proxy_api_key || ""}
                  className="w-full border-0 border-b border-border bg-transparent py-2 font-mono text-[13px] text-ink/80 focus:outline-none"
                />
                <IconBtn onClick={() => setShowProxy((v) => !v)}>
                  {showProxy ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </IconBtn>
                <IconBtn onClick={() => copy(settings?.proxy_api_key || "", "Key copied")}>
                  <Copy className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn onClick={rotateProxy} title="Rotate"><RefreshCw className="h-3.5 w-3.5" /></IconBtn>
              </div>
            </Field>
          </div>

          <pre className="mt-8 overflow-x-auto border border-border bg-paper p-5 font-mono text-[12px] leading-6 text-ink/85">
{`curl ${endpoint}/chat/completions \\
  -H "Authorization: Bearer ${settings?.proxy_api_key || "<your_key>"}" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "default", "messages":[{"role":"user","content":"Hi"}]}'`}
          </pre>
        </section>

        {/* Default model */}
        <section>
          <SectionHeader n="02" title="Default model" lede={`Used when a request omits the model field, or sends "default" / "none".`} />
          <select
            value={settings?.default_model || ""}
            onChange={(e) => updateModel(e.target.value)}
            className="mt-6 w-full max-w-xl border-0 border-b border-border bg-transparent py-2 text-[15px] focus:border-ink focus:outline-none"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — ${m.inputPrice}/${m.outputPrice} ({m.id})
              </option>
            ))}
          </select>
        </section>

        {/* Lightning keys */}
        <section>
          <SectionHeader
            n="03"
            title={`Lightning AI keys · ${keys.length}`}
            lede="Keys rotate by least-recent use. If one fails, the next is tried."
          />

          <form onSubmit={addKey} className="mt-6 grid gap-3 md:grid-cols-[1fr_2fr_auto]">
            <input
              placeholder="Label (e.g. personal)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="border border-border bg-paper px-3 py-2.5 text-[14px] focus:border-ink focus:outline-none"
            />
            <input
              placeholder="Lightning AI API key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="border border-border bg-paper px-3 py-2.5 font-mono text-[12px] focus:border-ink focus:outline-none"
            />
            <button
              type="submit"
              disabled={adding}
              className="cta-primary inline-flex items-center gap-2 bg-ink px-6 py-2.5 text-paper hover:bg-magenta"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </form>

          <div className="mt-8 divide-y divide-border border-y border-border">
            {keys.length === 0 && (
              <div className="py-12 text-center font-display text-lg italic text-ash">
                No keys yet. Add one to begin.
              </div>
            )}
            {keys.map((k, i) => (
              <div key={k.id} className="grid grid-cols-12 items-center gap-4 py-5">
                <span className="col-span-1 font-mono text-[11px] text-ash">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="col-span-7 min-w-0">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-xl italic">{k.label}</span>
                    {k.is_active ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-success">active</span>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-ash">paused</span>
                    )}
                    {k.failure_count > 0 && (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-destructive">
                        {k.failure_count} fail
                      </span>
                    )}
                  </div>
                  <div className="mt-1 truncate font-mono text-[11px] text-ink/55">
                    {k.api_key.slice(0, 6)}…{k.api_key.slice(-4)}
                    {k.last_used_at && ` · used ${formatDistanceToNow(new Date(k.last_used_at))} ago`}
                  </div>
                  {k.last_error && (
                    <div className="mt-1 truncate text-[11px] text-destructive">
                      last error: {k.last_error}
                    </div>
                  )}
                </div>
                <div className="col-span-4 flex items-center justify-end gap-2">
                  <button
                    onClick={() => toggleKey(k.id, k.is_active)}
                    className="cta-primary text-ink/60 hover:text-magenta"
                  >
                    {k.is_active ? "Pause" : "Activate"}
                  </button>
                  <IconBtn onClick={() => removeKey(k.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </IconBtn>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Logs */}
        <section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeader n="04" title={`The ledger · ${logs.length}`} lede="Every request, with its tokens, latency, and cost." />
            <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-wider text-ash">
              <span>
                Tokens <span className="text-ink">{totalTokens.toLocaleString()}</span>
              </span>
              <span>
                Cost <span className="text-magenta">${totalCost.toFixed(4)}</span>
              </span>
              <button onClick={refresh} className="hover:text-ink">
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto border-y border-border">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-ash">
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Model</th>
                  <th className="px-3 py-3">Key</th>
                  <th className="px-3 py-3 text-right">Tokens</th>
                  <th className="px-3 py-3 text-right">Cost</th>
                  <th className="px-3 py-3 text-right">Latency</th>
                  <th className="px-3 py-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center font-display text-lg italic text-ash">
                      No requests yet.
                    </td>
                  </tr>
                )}
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-paper">
                    <td className="px-3 py-3 whitespace-nowrap text-ash">
                      {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-3 py-3">
                      <span className={l.status === "success" ? "text-success" : "text-destructive"}>
                        {l.http_status || "ERR"}
                      </span>
                      {(l.attempts || 1) > 1 && <span className="ml-1 text-ash">×{l.attempts}</span>}
                    </td>
                    <td className="px-3 py-3 font-mono">{l.model_used || "—"}</td>
                    <td className="px-3 py-3 text-ink/70">{l.lightning_key_label || "—"}</td>
                    <td className="px-3 py-3 text-right">
                      {l.prompt_tokens != null ? `${l.prompt_tokens}+${l.completion_tokens}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-magenta">
                      {l.cost_usd != null ? `$${Number(l.cost_usd).toFixed(5)}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-ash">{l.latency_ms ?? "—"}ms</td>
                    <td className="max-w-xs truncate px-3 py-3 text-destructive" title={l.error_message || ""}>
                      {l.error_message || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionHeader({ n, title, lede }: { n: string; title: string; lede: string }) {
  return (
    <div className="border-b border-border pb-4">
      <div className="flex items-baseline gap-4">
        <span className="font-serif-italic text-2xl text-magenta">{n}</span>
        <h2 className="font-display text-3xl italic">{title}</h2>
      </div>
      <p className="mt-2 max-w-2xl text-[14px] text-ink/65">{lede}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow block">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="grid h-9 w-9 shrink-0 place-items-center border border-border bg-paper text-ink/60 hover:border-ink hover:text-ink"
    >
      {children}
    </button>
  );
}
