import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MODELS } from "@/lib/models";
import { toast } from "sonner";
import { Copy, Trash2, Plus, RefreshCw, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LitProxy" }] }),
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
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage keys, default model, and view request logs.</p>
        </div>

        {/* Endpoint card */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-6 shadow-elegant">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your endpoint</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Base URL (OpenAI-compatible)</Label>
              <div className="mt-1 flex gap-2">
                <Input readOnly value={endpoint} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copy(endpoint, "URL copied")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Proxy API key</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  readOnly
                  type={showProxy ? "text" : "password"}
                  value={settings?.proxy_api_key || ""}
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={() => setShowProxy((v) => !v)}>
                  {showProxy ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => copy(settings?.proxy_api_key || "", "Key copied")}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={rotateProxy} title="Rotate key">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-border/60 bg-background/40 p-4 text-xs">
{`curl ${endpoint}/chat/completions \\
  -H "Authorization: Bearer ${settings?.proxy_api_key || "<your_key>"}" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "${settings?.default_model || "openai/gpt-5-mini"}", "messages":[{"role":"user","content":"Hi"}]}'`}
          </pre>
        </section>

        {/* Default model */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Default model</h2>
          <p className="mt-1 text-xs text-muted-foreground">Used when a request omits the <code>model</code> field.</p>
          <select
            value={settings?.default_model || ""}
            onChange={(e) => updateModel(e.target.value)}
            className="mt-3 w-full max-w-md rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — ${m.inputPrice}/${m.outputPrice} ({m.id})
              </option>
            ))}
          </select>
        </section>

        {/* Lightning keys */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Lightning AI keys ({keys.length})</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Keys rotate by least-recently-used. If one fails, we try the next active key.
          </p>

          <form onSubmit={addKey} className="mt-4 grid gap-2 md:grid-cols-[1fr_2fr_auto]">
            <Input placeholder="Label (e.g. personal)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
            <Input placeholder="Lightning AI API key" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
            <Button type="submit" disabled={adding}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </form>

          <div className="mt-6 space-y-2">
            {keys.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                No keys yet. Add one to start making requests.
              </div>
            )}
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{k.label}</span>
                    {k.is_active ? (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">active</span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">paused</span>
                    )}
                    {k.failure_count > 0 && (
                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">
                        {k.failure_count} fail
                      </span>
                    )}
                  </div>
                  <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {k.api_key.slice(0, 6)}…{k.api_key.slice(-4)}
                    {k.last_used_at && ` · used ${formatDistanceToNow(new Date(k.last_used_at))} ago`}
                  </div>
                  {k.last_error && (
                    <div className="mt-1 truncate text-xs text-destructive">last error: {k.last_error}</div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => toggleKey(k.id, k.is_active)}>
                    {k.is_active ? "Pause" : "Activate"}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeKey(k.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Logs */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent requests ({logs.length})
            </h2>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Total tokens: <span className="text-foreground">{totalTokens.toLocaleString()}</span></span>
              <span>Total cost: <span className="text-primary">${totalCost.toFixed(4)}</span></span>
              <Button size="sm" variant="ghost" onClick={refresh}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="px-2 py-2">Time</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Model</th>
                  <th className="px-2 py-2">Key</th>
                  <th className="px-2 py-2 text-right">Tokens</th>
                  <th className="px-2 py-2 text-right">Cost</th>
                  <th className="px-2 py-2 text-right">Latency</th>
                  <th className="px-2 py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-2 py-8 text-center text-muted-foreground">No requests yet.</td>
                  </tr>
                )}
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-border/30">
                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">
                      {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-2 py-2">
                      {l.status === "success" ? (
                        <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" />{l.http_status}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" />{l.http_status || "ERR"}</span>
                      )}
                      {(l.attempts || 1) > 1 && <span className="ml-1 text-muted-foreground">×{l.attempts}</span>}
                    </td>
                    <td className="px-2 py-2 font-mono">{l.model_used || "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{l.lightning_key_label || "—"}</td>
                    <td className="px-2 py-2 text-right">
                      {l.prompt_tokens != null ? `${l.prompt_tokens}+${l.completion_tokens}` : "—"}
                    </td>
                    <td className="px-2 py-2 text-right text-primary">
                      {l.cost_usd != null ? `$${Number(l.cost_usd).toFixed(5)}` : "—"}
                    </td>
                    <td className="px-2 py-2 text-right text-muted-foreground">{l.latency_ms ?? "—"}ms</td>
                    <td className="max-w-xs truncate px-2 py-2 text-destructive" title={l.error_message || ""}>
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
