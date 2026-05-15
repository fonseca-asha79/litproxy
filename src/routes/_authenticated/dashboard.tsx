import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MODELS } from "@/lib/models";
import { toast } from "sonner";
import { Copy, Trash2, Plus, RefreshCw, Eye, EyeOff, ArrowUpRight, KeyRound, Activity, Settings as SettingsIcon, Check, Search, BarChart3, Download, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { formatDistanceToNow } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodeTabs, buildRequestSnippets } from "@/components/CodeBlock";
import { Analytics } from "@/components/Analytics";
import { ModelPicker as ModelComboPicker } from "@/components/ModelPicker";
import { ModelMultiPicker } from "@/components/ModelMultiPicker";

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
}
interface ProxyKey {
  id: string;
  name: string;
  api_key: string;
  is_active: boolean;
  allowed_models: string[];
  rate_limit_per_min: number | null;
  default_model: string | null;
  last_used_at: string | null;
  created_at: string;
}
interface LogRow {
  id: string;
  model_requested: string | null;
  model_used: string | null;
  lightning_key_id: string | null;
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
  const [proxyKeys, setProxyKeys] = useState<ProxyKey[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [adding, setAdding] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkPrefix, setBulkPrefix] = useState("");
  const [pkName, setPkName] = useState("");
  const [pkAllowed, setPkAllowed] = useState<string[]>([]);
  const [pkRate, setPkRate] = useState<string>("");
  const [pkDefault, setPkDefault] = useState<string>("default");
  const [editingPk, setEditingPk] = useState<ProxyKey | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const endpoint = `${baseUrl}/api/public/v1`;

  const refresh = async () => {
    const [s, k, p, l] = await Promise.all([
      supabase.from("user_settings").select("*").maybeSingle(),
      supabase.from("lightning_keys").select("*").order("created_at", { ascending: false }),
      supabase.from("proxy_keys").select("*").order("created_at", { ascending: true }),
      supabase.from("request_logs").select("*").order("created_at", { ascending: false }).limit(1000),
    ]);
    if (s.data) setSettings(s.data as Settings);
    if (k.data) setKeys(k.data as LightningKey[]);
    if (p.data) setProxyKeys(p.data as ProxyKey[]);
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

  const addBulkKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return toast.error("Paste at least one key");
    const prefix = bulkPrefix.trim();
    const payload = lines.map((line, i) => {
      // Accept "label,key" / "label\tkey" / just "key"
      const m = line.match(/^(.+?)[,\t]\s*(\S+)$/);
      let label: string;
      let api_key: string;
      if (m) {
        label = m[1].trim();
        api_key = m[2].trim();
      } else {
        api_key = line;
        label = prefix
          ? `${prefix} ${i + 1}`
          : `Key ${keys.length + i + 1}`;
      }
      return { user_id: user!.id, label, api_key };
    }).filter((r) => r.api_key);

    if (!payload.length) return toast.error("No valid keys found");
    setAdding(true);
    const { error } = await supabase.from("lightning_keys").insert(payload);
    setAdding(false);
    if (error) return toast.error(error.message);
    setBulkText("");
    setBulkPrefix("");
    toast.success(`Added ${payload.length} key${payload.length > 1 ? "s" : ""}`);
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

  const toggleSelectKey = (id: string) => {
    setSelectedKeys((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedKeys.size === keys.length) setSelectedKeys(new Set());
    else setSelectedKeys(new Set(keys.map((k) => k.id)));
  };

  const bulkSetActive = async (active: boolean) => {
    if (selectedKeys.size === 0) return;
    const ids = Array.from(selectedKeys);
    const { error } = await supabase.from("lightning_keys").update({ is_active: active }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${active ? "Activated" : "Paused"} ${ids.length} key${ids.length > 1 ? "s" : ""}`);
    setSelectedKeys(new Set());
    refresh();
  };

  const bulkDelete = async () => {
    if (selectedKeys.size === 0) return;
    const ids = Array.from(selectedKeys);
    if (!confirm(`Delete ${ids.length} key${ids.length > 1 ? "s" : ""}? This cannot be undone.`)) return;
    const { error } = await supabase.from("lightning_keys").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Deleted ${ids.length} key${ids.length > 1 ? "s" : ""}`);
    setSelectedKeys(new Set());
    refresh();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportKeys = (format: "json" | "csv") => {
    if (!keys.length) return toast.error("No keys to export");
    const rows = keys.map((k) => ({
      label: k.label,
      api_key: k.api_key,
      is_active: k.is_active,
    }));
    let blob: Blob;
    let filename: string;
    if (format === "json") {
      blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
      filename = `lightning-keys-${new Date().toISOString().slice(0, 10)}.json`;
    } else {
      const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
      const csv = [
        "label,api_key,is_active",
        ...rows.map((r) => [esc(r.label), esc(r.api_key), r.is_active].join(",")),
      ].join("\n");
      blob = new Blob([csv], { type: "text/csv" });
      filename = `lightning-keys-${new Date().toISOString().slice(0, 10)}.csv`;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} keys`);
  };

  const importKeys = async (file: File) => {
    try {
      const text = await file.text();
      type Row = { label?: string; api_key?: string; is_active?: boolean | string };
      let rows: Row[] = [];
      const isJson =
        file.name.toLowerCase().endsWith(".json") || text.trim().startsWith("[") || text.trim().startsWith("{");
      if (isJson) {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (!lines.length) throw new Error("Empty file");
        const parseCsvLine = (line: string): string[] => {
          const out: string[] = [];
          let cur = "";
          let inQ = false;
          for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (inQ) {
              if (c === '"' && line[i + 1] === '"') {
                cur += '"';
                i++;
              } else if (c === '"') inQ = false;
              else cur += c;
            } else {
              if (c === '"') inQ = true;
              else if (c === ",") {
                out.push(cur);
                cur = "";
              } else cur += c;
            }
          }
          out.push(cur);
          return out;
        };
        const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
        rows = lines.slice(1).map((line) => {
          const cols = parseCsvLine(line);
          const r: Row = {};
          header.forEach((h, idx) => {
            (r as Record<string, unknown>)[h] = cols[idx];
          });
          return r;
        });
      }

      const payload = rows
        .map((r, i) => ({
          user_id: user!.id,
          label: (r.label?.toString().trim() || `Imported ${keys.length + i + 1}`),
          api_key: r.api_key?.toString().trim() || "",
          is_active:
            typeof r.is_active === "boolean"
              ? r.is_active
              : ["false", "0", "no"].includes(String(r.is_active ?? "").toLowerCase())
                ? false
                : true,
        }))
        .filter((r) => r.api_key);

      if (!payload.length) return toast.error("No valid keys found in file");
      const { error } = await supabase.from("lightning_keys").insert(payload);
      if (error) return toast.error(error.message);
      toast.success(`Imported ${payload.length} keys`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to import");
    }
  };

  const updateModel = async (model: string) => {
    if (!settings) return;
    await supabase.from("user_settings").update({ default_model: model }).eq("user_id", settings.user_id);
    setSettings({ ...settings, default_model: model });
    toast.success("Default model updated");
  };

  const generateProxyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const newK = "lvp_" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const rate = pkRate.trim() ? Math.max(1, parseInt(pkRate, 10)) : null;
    const def = pkDefault === "default" ? null : pkDefault;
    // Validate per-key default is in allowed list (if list non-empty)
    if (def && pkAllowed.length > 0 && !pkAllowed.includes(def)) {
      return toast.error("Per-key default model must be in the allowed list (or allow all).");
    }
    const { error } = await supabase.from("proxy_keys").insert({
      user_id: user!.id,
      name: pkName.trim() || `Key ${proxyKeys.length + 1}`,
      api_key: newK,
      allowed_models: pkAllowed,
      rate_limit_per_min: rate,
      default_model: def,
    });
    if (error) return toast.error(error.message);
    setPkName("");
    setPkAllowed([]);
    setPkRate("");
    setPkDefault("default");
    toast.success("Proxy key generated");
    refresh();
  };

  const toggleProxyKey = async (pk: ProxyKey) => {
    await supabase.from("proxy_keys").update({ is_active: !pk.is_active }).eq("id", pk.id);
    refresh();
  };

  const deleteProxyKey = async (pk: ProxyKey) => {
    if (!confirm(`Delete "${pk.name}"? Apps using it will stop working immediately.`)) return;
    const { error } = await supabase.from("proxy_keys").delete().eq("id", pk.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const saveProxyKey = async () => {
    if (!editingPk) return;
    const rate = editingPk.rate_limit_per_min;
    const def = editingPk.default_model;
    if (def && editingPk.allowed_models.length > 0 && !editingPk.allowed_models.includes(def)) {
      return toast.error("Per-key default model must be in the allowed list (or allow all).");
    }
    const { error } = await supabase
      .from("proxy_keys")
      .update({
        name: editingPk.name.trim() || "Key",
        allowed_models: editingPk.allowed_models,
        rate_limit_per_min: rate && rate > 0 ? rate : null,
        default_model: def || null,
      })
      .eq("id", editingPk.id);
    if (error) return toast.error(error.message);
    setEditingPk(null);
    toast.success("Saved");
    refresh();
  };

  const copy = (s: string, what = "Copied") => {
    navigator.clipboard.writeText(s);
    toast.success(what);
  };

  const totalCost = logs.reduce((a, l) => a + (l.cost_usd || 0), 0);
  const totalTokens = logs.reduce((a, l) => a + (l.prompt_tokens || 0) + (l.completion_tokens || 0), 0);
  const successRate = logs.length
    ? Math.round((logs.filter((l) => l.status === "success").length / logs.length) * 100)
    : 100;

  const groupedModels = useMemo(() => {
    const g: Record<string, typeof MODELS> = {};
    for (const m of MODELS) (g[m.provider] ||= []).push(m);
    return g;
  }, []);

  const defaultModelInfo = settings ? MODELS.find((m) => m.id === settings.default_model) : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-6xl px-6 pt-12 pb-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="anim-fade-up">
              <p className="eyebrow">Workspace</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                Hi{user?.email ? `, ${user.email.split("@")[0]}` : ""}.
              </h1>
              <p className="mt-2 max-w-xl text-[14px] text-foreground/55">
                One OpenAI-compatible endpoint. Bring your Lightning AI keys, we rotate, fail-over, log.
              </p>
            </div>
            <Link
              to="/playground"
              className="anim-fade-up group inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-3.5 py-2 text-[13px] transition-colors hover:border-brand/40 hover:text-brand"
              style={{ animationDelay: "120ms" }}
            >
              Open playground{" "}
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              <Stat key="r" label="Requests" value={logs.length.toString()} />,
              <Stat key="t" label="Tokens" value={totalTokens.toLocaleString()} />,
              <Stat key="s" label="Spent" value={`$${totalCost.toFixed(4)}`} accent />,
              <Stat key="ok" label="Success" value={`${successRate}%`} />,
            ].map((node, i) => (
              <div key={i} className="anim-fade-up" style={{ animationDelay: `${180 + i * 80}ms` }}>
                {node}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-8 grid w-full grid-cols-4 sm:w-auto sm:inline-flex">
            <TabsTrigger value="overview" className="gap-1.5">
              <SettingsIcon className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="keys" className="gap-1.5">
              <KeyRound className="h-3.5 w-3.5" /> Keys
              <span className="ml-0.5 rounded bg-foreground/10 px-1 font-mono text-[10px]">{keys.length}</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Logs
            </TabsTrigger>
          </TabsList>

          {/* ============ OVERVIEW ============ */}
          <TabsContent value="overview" className="space-y-8 mt-0">
            <Card title="Endpoint" desc="Drop-in replacement for the OpenAI base URL.">
              <Field label="Base URL">
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={endpoint}
                    className="w-full rounded-md border border-hairline bg-background px-3 py-2 font-mono text-[12.5px] text-foreground/85 focus:outline-none"
                  />
                  <IconBtn onClick={() => copy(endpoint, "URL copied")}><Copy className="h-3.5 w-3.5" /></IconBtn>
                </div>
              </Field>

              {(() => {
                const firstActive = proxyKeys.find((p) => p.is_active) || proxyKeys[0];
                const sample = firstActive?.api_key || "<your_key>";
                return (
                  <div className="mt-5">
                    <CodeTabs snippets={buildRequestSnippets(`${endpoint}`, sample, "default")} />
                  </div>
                );
              })()}
            </Card>

            <Card
              title="Litproxy API keys"
              desc="Generate as many keys as you need. Each key can have its own default model, an allowed-models list, and an optional per-minute rate cap."
            >
              <form onSubmit={generateProxyKey} className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Name (optional)">
                    <input
                      placeholder="e.g. team, mobile-app, scratch"
                      value={pkName}
                      onChange={(e) => setPkName(e.target.value)}
                      className="w-full rounded-md border border-hairline bg-background px-3 py-2 text-[13.5px] focus:border-brand focus:outline-none"
                    />
                  </Field>
                  <Field label="Rate limit">
                    <input
                      type="number"
                      min={1}
                      placeholder="req/min · empty = unlimited"
                      value={pkRate}
                      onChange={(e) => setPkRate(e.target.value)}
                      className="w-full rounded-md border border-hairline bg-background px-3 py-2 text-[13px] focus:border-brand focus:outline-none"
                    />
                  </Field>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                  <Field label="Default model for this key">
                    <ModelComboPicker
                      value={pkDefault}
                      onChange={setPkDefault}
                      defaultModelId={settings?.default_model}
                    />
                  </Field>
                  <Field label="Allowed models">
                    <ModelMultiPicker value={pkAllowed} onChange={setPkAllowed} />
                  </Field>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[10.5px] text-muted-foreground">
                    Empty allowed list = all models · "Account default" follows your dashboard default
                  </p>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand px-4 py-2 text-[13px] font-medium text-primary-foreground hover:bg-brand-deep"
                  >
                    <Plus className="h-3.5 w-3.5" /> Generate key
                  </button>
                </div>
              </form>

              <div className="mt-5 divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
                {proxyKeys.length === 0 && (
                  <div className="bg-background py-10 text-center text-[13.5px] text-muted-foreground">
                    No proxy keys yet.
                  </div>
                )}
                {proxyKeys.map((pk) => {
                  const visible = !!showKey[pk.id];
                  return (
                    <div key={pk.id} className="bg-background px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-medium">{pk.name}</span>
                        {pk.is_active ? (
                          <span className="rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-success">active</span>
                        ) : (
                          <span className="rounded-full border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">paused</span>
                        )}
                        {pk.allowed_models.length > 0 ? (
                          <span className="rounded-full border border-brand/30 bg-brand/10 px-1.5 py-0.5 font-mono text-[10px] text-brand">
                            {pk.allowed_models.length} model{pk.allowed_models.length > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="rounded-full border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            all models
                          </span>
                        )}
                        <span className="rounded-full border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          default: {pk.default_model
                            ? (MODELS.find((m) => m.id === pk.default_model)?.name || pk.default_model)
                            : "account"}
                        </span>
                        {pk.rate_limit_per_min && (
                          <span className="rounded-full border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {pk.rate_limit_per_min}/min
                          </span>
                        )}
                        <div className="ml-auto flex items-center gap-1">
                          <IconBtn onClick={() => setShowKey((s) => ({ ...s, [pk.id]: !s[pk.id] }))}>
                            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </IconBtn>
                          <IconBtn onClick={() => copy(pk.api_key, "Key copied")}><Copy className="h-3.5 w-3.5" /></IconBtn>
                          <button
                            onClick={() => setEditingPk(pk)}
                            className="rounded-md border border-hairline px-2.5 py-1 text-[12px] text-foreground/70 hover:border-foreground/40 hover:text-foreground"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleProxyKey(pk)}
                            className="rounded-md border border-hairline px-2.5 py-1 text-[12px] text-foreground/70 hover:border-foreground/40 hover:text-foreground"
                          >
                            {pk.is_active ? "Pause" : "Activate"}
                          </button>
                          <IconBtn onClick={() => deleteProxyKey(pk)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </IconBtn>
                        </div>
                      </div>
                      <div className="mt-2 truncate font-mono text-[11.5px] text-foreground/70">
                        {visible ? pk.api_key : `${pk.api_key.slice(0, 8)}${"•".repeat(24)}${pk.api_key.slice(-4)}`}
                      </div>
                      {editingPk?.id === pk.id && (
                        <div className="mt-3 space-y-3 rounded-md border border-hairline bg-surface/40 p-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="Name">
                              <input
                                value={editingPk.name}
                                onChange={(e) => setEditingPk({ ...editingPk, name: e.target.value })}
                                placeholder="Name"
                                className="w-full rounded-md border border-hairline bg-background px-3 py-2 text-[13px] focus:border-brand focus:outline-none"
                              />
                            </Field>
                            <Field label="Rate limit (req/min)">
                              <input
                                type="number"
                                min={1}
                                placeholder="empty = unlimited"
                                value={editingPk.rate_limit_per_min ?? ""}
                                onChange={(e) =>
                                  setEditingPk({
                                    ...editingPk,
                                    rate_limit_per_min: e.target.value ? parseInt(e.target.value, 10) : null,
                                  })
                                }
                                className="w-full rounded-md border border-hairline bg-background px-3 py-2 text-[13px] focus:border-brand focus:outline-none"
                              />
                            </Field>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="Default model for this key">
                              <ModelComboPicker
                                value={editingPk.default_model || "default"}
                                onChange={(id) =>
                                  setEditingPk({
                                    ...editingPk,
                                    default_model: id === "default" ? null : id,
                                  })
                                }
                                defaultModelId={settings?.default_model}
                              />
                            </Field>
                            <Field label="Allowed models">
                              <ModelMultiPicker
                                value={editingPk.allowed_models}
                                onChange={(ids) =>
                                  setEditingPk({ ...editingPk, allowed_models: ids })
                                }
                              />
                            </Field>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingPk(null)}
                              className="rounded-md border border-hairline px-3 py-1.5 text-[12.5px] text-foreground/70 hover:border-foreground/40"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveProxyKey}
                              className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground hover:bg-brand-deep"
                            >
                              <Check className="h-3.5 w-3.5" /> Save
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            <ModelPicker
              value={settings?.default_model || ""}
              onChange={updateModel}
              info={defaultModelInfo}
            />
          </TabsContent>

          {/* ============ KEYS ============ */}
          <TabsContent value="keys" className="mt-0">
            <Card
              title="Lightning AI keys"
              desc="Keys rotate by least-recent use. If one fails, the next is tried automatically."
              action={
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv,application/json,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) importKeys(f);
                      e.target.value = "";
                    }}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-background px-2.5 py-1.5 text-[12px] text-foreground/80 hover:border-foreground/40 hover:text-foreground"
                      >
                        <Upload className="h-3.5 w-3.5" /> Import
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[160px]">
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                        From JSON or CSV…
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-background px-2.5 py-1.5 text-[12px] text-foreground/80 hover:border-foreground/40 hover:text-foreground"
                      >
                        <Download className="h-3.5 w-3.5" /> Export
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[140px]">
                      <DropdownMenuItem onClick={() => exportKeys("json")}>
                        Export as JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportKeys("csv")}>
                        Export as CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              }
            >
              <div className="mb-3 inline-flex rounded-md border border-hairline bg-background p-0.5 text-[12px]">
                {(["single", "bulk"] as const).map((m) => {
                  const active = (m === "bulk") === bulkMode;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setBulkMode(m === "bulk")}
                      className={
                        "rounded px-3 py-1 transition-colors " +
                        (active
                          ? "bg-surface-2 font-medium text-foreground"
                          : "text-muted-foreground hover:text-foreground")
                      }
                    >
                      {m === "single" ? "Single" : "Bulk"}
                    </button>
                  );
                })}
              </div>

              {!bulkMode ? (
                <form onSubmit={addKey} className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
                  <input
                    placeholder="Label (e.g. personal)"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="rounded-md border border-hairline bg-background px-3 py-2 text-[13.5px] focus:border-brand focus:outline-none"
                  />
                  <input
                    placeholder="Lightning AI API key"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="rounded-md border border-hairline bg-background px-3 py-2 font-mono text-[12px] focus:border-brand focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={adding}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand px-4 py-2 text-[13px] font-medium text-primary-foreground hover:bg-brand-deep disabled:opacity-60"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </form>
              ) : (
                <form onSubmit={addBulkKeys} className="grid gap-2">
                  <input
                    placeholder="Optional label prefix (e.g. team) — auto-numbered"
                    value={bulkPrefix}
                    onChange={(e) => setBulkPrefix(e.target.value)}
                    className="rounded-md border border-hairline bg-background px-3 py-2 text-[13.5px] focus:border-brand focus:outline-none"
                  />
                  <textarea
                    placeholder={"Paste keys, one per line.\nOptional naming: label,key   (or just the key)"}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={6}
                    className="resize-y rounded-md border border-hairline bg-background px-3 py-2 font-mono text-[12px] focus:border-brand focus:outline-none"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {bulkText.split(/\r?\n/).filter((l) => l.trim()).length} line
                      {bulkText.split(/\r?\n/).filter((l) => l.trim()).length === 1 ? "" : "s"}
                    </span>
                    <button
                      type="submit"
                      disabled={adding}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand px-4 py-2 text-[13px] font-medium text-primary-foreground hover:bg-brand-deep disabled:opacity-60"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add all
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-6 overflow-hidden rounded-lg border border-hairline">
                {keys.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-surface/60 px-4 py-2.5 text-[12px]">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-foreground/70">
                      <input
                        type="checkbox"
                        checked={selectedKeys.size === keys.length && keys.length > 0}
                        ref={(el) => {
                          if (el) el.indeterminate = selectedKeys.size > 0 && selectedKeys.size < keys.length;
                        }}
                        onChange={toggleSelectAll}
                        className="h-3.5 w-3.5 cursor-pointer accent-brand"
                      />
                      <span>
                        {selectedKeys.size === 0
                          ? `Select all (${keys.length})`
                          : `${selectedKeys.size} selected`}
                      </span>
                    </label>
                    {selectedKeys.size > 0 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => bulkSetActive(true)}
                          className="rounded-md border border-hairline bg-background px-2.5 py-1 text-foreground/80 hover:border-success/40 hover:text-success"
                        >
                          Activate
                        </button>
                        <button
                          onClick={() => bulkSetActive(false)}
                          className="rounded-md border border-hairline bg-background px-2.5 py-1 text-foreground/80 hover:border-foreground/40 hover:text-foreground"
                        >
                          Pause
                        </button>
                        <button
                          onClick={bulkDelete}
                          className="rounded-md border border-hairline bg-background px-2.5 py-1 text-destructive hover:border-destructive/40"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="divide-y divide-hairline">
                {keys.length === 0 && (
                  <div className="bg-background py-12 text-center text-[14px] text-muted-foreground">
                    No keys yet. Add one to begin.
                  </div>
                )}
                {keys.map((k, i) => (
                  <div key={k.id} className="grid grid-cols-12 items-center gap-4 bg-background px-4 py-4">
                    <div className="col-span-1 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(k.id)}
                        onChange={() => toggleSelectKey(k.id)}
                        className="h-3.5 w-3.5 cursor-pointer accent-brand"
                      />
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="col-span-7 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[14px] font-medium">{k.label}</span>
                        {k.is_active ? (
                          <span className="rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-success">active</span>
                        ) : (
                          <span className="rounded-full border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">paused</span>
                        )}
                        {k.failure_count > 0 && (
                          <span className="rounded-full border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-destructive">
                            {k.failure_count} fail
                          </span>
                        )}
                      </div>
                      <div className="mt-1 truncate font-mono text-[11px] text-foreground/45">
                        {k.api_key.slice(0, 6)}…{k.api_key.slice(-4)}
                        {k.last_used_at && ` · used ${formatDistanceToNow(new Date(k.last_used_at))} ago`}
                      </div>
                      {k.last_error && (
                        <div className="mt-1 truncate text-[11px] text-destructive">last error: {k.last_error}</div>
                      )}
                    </div>
                    <div className="col-span-4 flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleKey(k.id, k.is_active)}
                        className="rounded-md border border-hairline px-2.5 py-1 text-[12px] text-foreground/70 hover:border-foreground/40 hover:text-foreground"
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
              </div>
            </Card>
          </TabsContent>

          {/* ============ ANALYTICS ============ */}
          <TabsContent value="analytics" className="mt-0">
            <Analytics logs={logs} keys={keys.map((k) => ({ id: k.id, label: k.label }))} />
          </TabsContent>

          {/* ============ LOGS ============ */}
          <TabsContent value="logs" className="mt-0">
            <Card
              title="Recent requests"
              desc="Last 1000 calls — tokens, latency, cost."
              action={
                <button onClick={refresh} className="inline-flex items-center gap-1.5 text-[12px] text-foreground/60 hover:text-foreground">
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
              }
            >
              <div className="overflow-x-auto rounded-lg border border-hairline">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-hairline bg-surface text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2.5">Time</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Model</th>
                      <th className="px-3 py-2.5">Key</th>
                      <th className="px-3 py-2.5 text-right">Tokens</th>
                      <th className="px-3 py-2.5 text-right">Cost</th>
                      <th className="px-3 py-2.5 text-right">Latency</th>
                      <th className="px-3 py-2.5">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={8} className="bg-background py-12 text-center text-muted-foreground">
                          No requests yet.
                        </td>
                      </tr>
                    )}
                    {logs.map((l) => (
                      <tr key={l.id} className="border-b border-hairline bg-background last:border-0 hover:bg-surface/60">
                        <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                          {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={l.status === "success" ? "text-success" : "text-destructive"}>
                            {l.http_status || "ERR"}
                          </span>
                          {(l.attempts || 1) > 1 && <span className="ml-1 text-muted-foreground">×{l.attempts}</span>}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-foreground/80">{l.model_used || "—"}</td>
                        <td className="px-3 py-2.5 text-foreground/70">{l.lightning_key_label || "—"}</td>
                        <td className="px-3 py-2.5 text-right">
                          {l.prompt_tokens != null ? `${l.prompt_tokens}+${l.completion_tokens}` : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-brand">
                          {l.cost_usd != null ? `$${Number(l.cost_usd).toFixed(5)}` : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-muted-foreground">{l.latency_ms ?? "—"}ms</td>
                        <td className="max-w-xs truncate px-3 py-2.5 text-destructive" title={l.error_message || ""}>
                          {l.error_message || ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="group rounded-xl border border-hairline bg-surface/60 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/30 hover:bg-surface hover:shadow-[0_15px_30px_-15px_oklch(0.85_0.18_165/0.25)]">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"mt-2 text-2xl font-semibold tracking-tight " + (accent ? "text-brand" : "")}>{value}</div>
    </div>
  );
}

function Card({
  title,
  desc,
  action,
  children,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-hairline bg-surface/40 p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
          {desc && <p className="mt-1 text-[13px] text-foreground/60">{desc}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
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
      className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-hairline bg-background text-foreground/70 hover:border-foreground/40 hover:text-foreground"
    >
      {children}
    </button>
  );
}

function ModelPicker({
  value,
  onChange,
  info,
}: {
  value: string;
  onChange: (id: string) => void;
  info: (typeof MODELS)[number] | null | undefined;
}) {
  const [q, setQ] = useState("");
  const [provider, setProvider] = useState<string>("all");
  const providers = useMemo(() => ["all", ...Array.from(new Set(MODELS.map((m) => m.provider)))], []);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return MODELS.filter((m) => {
      if (provider !== "all" && m.provider !== provider) return false;
      if (!s) return true;
      return m.name.toLowerCase().includes(s) || m.id.toLowerCase().includes(s);
    });
  }, [q, provider]);

  return (
    <section className="rounded-2xl border border-hairline bg-surface/40 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight">Default model</h2>
          <p className="mt-1 text-[13px] text-foreground/60">
            Used when requests send <code className="font-mono text-[12px] text-foreground/80">"default"</code>,{" "}
            <code className="font-mono text-[12px] text-foreground/80">"none"</code>, <code className="font-mono text-[12px] text-foreground/80">"auto"</code>, or omit the model field.
          </p>
        </div>
        {info && (
          <div className="rounded-xl border border-brand/30 bg-brand/5 px-4 py-2.5 text-right">
            <div className="font-mono text-[10px] uppercase tracking-wider text-brand/80">Currently active</div>
            <div className="mt-0.5 text-[14px] font-semibold">{info.name}</div>
            <div className="font-mono text-[10.5px] text-foreground/55">
              ${info.inputPrice} in · ${info.outputPrice} out · {info.context}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search models…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-md border border-hairline bg-background py-2 pl-9 pr-3 text-[13px] placeholder:text-muted-foreground focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {providers.map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={
                "rounded-md border px-2.5 py-1.5 text-[11.5px] capitalize transition-colors " +
                (provider === p
                  ? "border-brand/40 bg-brand/10 text-brand"
                  : "border-hairline bg-background text-foreground/65 hover:border-foreground/30 hover:text-foreground")
              }
            >
              {p === "all" ? `All (${MODELS.length})` : p}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => {
          const selected = m.id === value;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              className={
                "group relative flex flex-col rounded-xl border p-3.5 text-left transition-all " +
                (selected
                  ? "border-brand/50 bg-brand/[0.07] shadow-[0_0_0_1px_oklch(0.85_0.18_165/0.25)_inset]"
                  : "border-hairline bg-background hover:border-foreground/30 hover:bg-surface")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-foreground/65">
                  {m.provider}
                </span>
                {selected ? (
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-brand text-primary-foreground">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-muted-foreground">{m.context}</span>
                )}
              </div>
              <div className="mt-2 text-[13.5px] font-semibold leading-tight">{m.name}</div>
              <div className="mt-3 flex items-baseline justify-between border-t border-hairline pt-2.5 font-mono text-[10.5px]">
                <span className="text-muted-foreground">
                  in <span className="text-foreground/85">${m.inputPrice}</span>
                </span>
                <span className="text-muted-foreground">
                  out <span className="text-foreground/85">${m.outputPrice}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="mt-4 rounded-lg border border-dashed border-hairline px-4 py-8 text-center text-[13px] text-muted-foreground">
          No models match "{q}".
        </p>
      )}
    </section>
  );
}
