import { useMemo, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { MODELS } from "@/lib/models";

interface LogRow {
  id: string;
  model_used: string | null;
  lightning_key_id: string | null;
  lightning_key_label: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cost_usd: number | null;
  status: string;
  created_at: string;
}

type Range = "24h" | "7d" | "30d" | "90d" | "1y" | "all" | "custom";

const RANGE_LABEL: Record<Range, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "1y": "Last year",
  all: "All time",
  custom: "Custom",
};

function rangeStart(range: Range, customStart: string): Date {
  const now = new Date();
  switch (range) {
    case "24h": return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d": return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "1y":  return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case "custom": return customStart ? new Date(customStart) : new Date(0);
    default: return new Date(0);
  }
}

const CHART_COLORS = [
  "oklch(0.85 0.18 165)", "oklch(0.70 0.18 250)", "oklch(0.75 0.16 30)",
  "oklch(0.80 0.15 80)", "oklch(0.65 0.18 320)", "oklch(0.78 0.16 200)",
  "oklch(0.72 0.20 0)", "oklch(0.70 0.16 130)",
];

export function Analytics({ logs, keys }: { logs: LogRow[]; keys: { id: string; label: string }[] }) {
  const [range, setRange] = useState<Range>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const filtered = useMemo(() => {
    const start = rangeStart(range, customStart).getTime();
    const end = range === "custom" && customEnd ? new Date(customEnd).getTime() : Date.now();
    return logs.filter((l) => {
      const t = new Date(l.created_at).getTime();
      return t >= start && t <= end;
    });
  }, [logs, range, customStart, customEnd]);

  const totals = useMemo(() => {
    let pt = 0, ct = 0, cost = 0, ok = 0;
    for (const l of filtered) {
      pt += l.prompt_tokens || 0;
      ct += l.completion_tokens || 0;
      cost += Number(l.cost_usd) || 0;
      if (l.status === "success") ok++;
    }
    return { pt, ct, cost, ok, count: filtered.length };
  }, [filtered]);

  // ---- per model ----
  const perModel = useMemo(() => {
    const map = new Map<string, { model: string; tokens: number; in: number; out: number; cost: number; count: number }>();
    for (const l of filtered) {
      const k = l.model_used || "unknown";
      const e = map.get(k) || { model: k, tokens: 0, in: 0, out: 0, cost: 0, count: 0 };
      e.in += l.prompt_tokens || 0;
      e.out += l.completion_tokens || 0;
      e.tokens = e.in + e.out;
      e.cost += Number(l.cost_usd) || 0;
      e.count += 1;
      map.set(k, e);
    }
    return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
  }, [filtered]);

  // ---- per key ----
  const perKey = useMemo(() => {
    const map = new Map<string, { label: string; tokens: number; cost: number; count: number }>();
    for (const l of filtered) {
      const k = l.lightning_key_id || "unknown";
      const label = l.lightning_key_label || keys.find((x) => x.id === k)?.label || "—";
      const e = map.get(k) || { label, tokens: 0, cost: 0, count: 0 };
      e.tokens += (l.prompt_tokens || 0) + (l.completion_tokens || 0);
      e.cost += Number(l.cost_usd) || 0;
      e.count += 1;
      map.set(k, e);
    }
    return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
  }, [filtered, keys]);

  // ---- per key x model breakdown ----
  const perKeyModel = useMemo(() => {
    const map = new Map<string, { keyLabel: string; model: string; tokens: number; cost: number; count: number }>();
    for (const l of filtered) {
      const keyLabel = l.lightning_key_label || keys.find((x) => x.id === l.lightning_key_id)?.label || "—";
      const model = l.model_used || "unknown";
      const k = `${keyLabel}|${model}`;
      const e = map.get(k) || { keyLabel, model, tokens: 0, cost: 0, count: 0 };
      e.tokens += (l.prompt_tokens || 0) + (l.completion_tokens || 0);
      e.cost += Number(l.cost_usd) || 0;
      e.count += 1;
      map.set(k, e);
    }
    return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
  }, [filtered, keys]);

  // ---- timeline (bucketed) ----
  const timeline = useMemo(() => {
    if (filtered.length === 0) return { buckets: [] as any[], modelKeys: [] as string[] };
    const start = rangeStart(range, customStart).getTime();
    const end = range === "custom" && customEnd ? new Date(customEnd).getTime() : Date.now();
    const span = end - start;
    // pick bucket size
    let size = 60 * 60 * 1000; // 1h
    if (span > 7 * 86400_000) size = 24 * 60 * 60 * 1000; // 1d
    if (span > 90 * 86400_000) size = 7 * 24 * 60 * 60 * 1000; // 1 week
    if (span > 365 * 86400_000) size = 30 * 24 * 60 * 60 * 1000; // 1 month

    const topModels = perModel.slice(0, 5).map((m) => m.model);
    const map = new Map<number, any>();
    for (const l of filtered) {
      const t = new Date(l.created_at).getTime();
      const bucket = Math.floor((t - start) / size) * size + start;
      const e = map.get(bucket) || { t: bucket, total: 0, cost: 0 };
      const tokens = (l.prompt_tokens || 0) + (l.completion_tokens || 0);
      e.total += tokens;
      e.cost += Number(l.cost_usd) || 0;
      const m = l.model_used || "unknown";
      const key = topModels.includes(m) ? m : "other";
      e[key] = (e[key] || 0) + tokens;
      map.set(bucket, e);
    }
    const buckets = Array.from(map.values()).sort((a, b) => a.t - b.t).map((b) => ({
      ...b,
      label: formatBucket(b.t, size),
    }));
    const modelKeys = filtered.some((l) => !topModels.includes(l.model_used || "")) ? [...topModels, "other"] : topModels;
    return { buckets, modelKeys };
  }, [filtered, range, customStart, customEnd, perModel]);

  return (
    <div className="space-y-6">
      {/* Range selector */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-hairline bg-surface/40 p-3">
        {(["24h", "7d", "30d", "90d", "1y", "all", "custom"] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={
              "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors " +
              (range === r ? "bg-brand text-primary-foreground" : "border border-hairline bg-background text-foreground/65 hover:text-foreground")
            }
          >
            {RANGE_LABEL[r]}
          </button>
        ))}
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="rounded-md border border-hairline bg-background px-2 py-1 text-[12px] focus:border-brand focus:outline-none" />
            <span className="text-foreground/40">→</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-md border border-hairline bg-background px-2 py-1 text-[12px] focus:border-brand focus:outline-none" />
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Requests" value={totals.count.toLocaleString()} />
        <Stat label="Total tokens" value={totals.pt + totals.ct ? (totals.pt + totals.ct).toLocaleString() : "0"} hint={`${totals.pt.toLocaleString()} in · ${totals.ct.toLocaleString()} out`} />
        <Stat label="Cost" value={`$${totals.cost.toFixed(4)}`} accent />
        <Stat label="Success rate" value={totals.count ? `${Math.round((totals.ok / totals.count) * 100)}%` : "—"} />
      </div>

      {/* Timeline chart */}
      <Card title="Usage timeline" desc={`Token usage over ${RANGE_LABEL[range].toLowerCase()}, by top models.`}>
        {timeline.buckets.length === 0 ? (
          <Empty msg="No data in this range." />
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer>
              <BarChart data={timeline.buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.27 0.01 250)" />
                <XAxis dataKey="label" stroke="oklch(0.65 0.012 250)" tick={{ fontSize: 11 }} />
                <YAxis stroke="oklch(0.65 0.012 250)" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "oklch(0.17 0.012 250)", border: "1px solid oklch(0.27 0.01 250)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {timeline.modelKeys.map((m, i) => (
                  <Bar key={m} dataKey={m} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Cost timeline */}
      <Card title="Cost timeline" desc="USD spent per bucket.">
        {timeline.buckets.length === 0 ? (
          <Empty msg="No data in this range." />
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer>
              <LineChart data={timeline.buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.27 0.01 250)" />
                <XAxis dataKey="label" stroke="oklch(0.65 0.012 250)" tick={{ fontSize: 11 }} />
                <YAxis stroke="oklch(0.65 0.012 250)" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${Number(v).toFixed(4)}`} />
                <Tooltip contentStyle={{ background: "oklch(0.17 0.012 250)", border: "1px solid oklch(0.27 0.01 250)", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => `$${Number(v).toFixed(5)}`} />
                <Line type="monotone" dataKey="cost" stroke="oklch(0.85 0.18 165)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Per-model breakdown */}
      <Card title="Per-model usage" desc="Tokens and cost per model.">
        {perModel.length === 0 ? <Empty msg="No requests yet." /> : (
          <div className="overflow-x-auto rounded-lg border border-hairline">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-hairline bg-surface text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2.5">Model</th>
                  <th className="px-3 py-2.5 text-right">Requests</th>
                  <th className="px-3 py-2.5 text-right">Input tokens</th>
                  <th className="px-3 py-2.5 text-right">Output tokens</th>
                  <th className="px-3 py-2.5 text-right">Total tokens</th>
                  <th className="px-3 py-2.5 text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {perModel.map((m) => {
                  const info = MODELS.find((x) => x.id === m.model);
                  return (
                    <tr key={m.model} className="border-b border-hairline bg-background last:border-0">
                      <td className="px-3 py-2.5 font-mono text-foreground/85">
                        <div>{info?.name || m.model}</div>
                        <div className="text-[10.5px] text-muted-foreground">{m.model}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right">{m.count}</td>
                      <td className="px-3 py-2.5 text-right text-foreground/70">{m.in.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right text-foreground/70">{m.out.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-medium">{m.tokens.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right text-brand">${m.cost.toFixed(5)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Per-key breakdown */}
      <Card title="Per-key usage" desc="Which Lightning AI key handled what.">
        {perKey.length === 0 ? <Empty msg="No requests yet." /> : (
          <div className="overflow-x-auto rounded-lg border border-hairline">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-hairline bg-surface text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2.5">Key</th>
                  <th className="px-3 py-2.5 text-right">Requests</th>
                  <th className="px-3 py-2.5 text-right">Tokens</th>
                  <th className="px-3 py-2.5 text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {perKey.map((k) => (
                  <tr key={k.label} className="border-b border-hairline bg-background last:border-0">
                    <td className="px-3 py-2.5 font-medium">{k.label}</td>
                    <td className="px-3 py-2.5 text-right">{k.count}</td>
                    <td className="px-3 py-2.5 text-right text-foreground/70">{k.tokens.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right text-brand">${k.cost.toFixed(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Per-key per-model */}
      <Card title="Key × Model breakdown" desc="Spend distribution across keys and models.">
        {perKeyModel.length === 0 ? <Empty msg="No requests yet." /> : (
          <div className="overflow-x-auto rounded-lg border border-hairline">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-hairline bg-surface text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2.5">Key</th>
                  <th className="px-3 py-2.5">Model</th>
                  <th className="px-3 py-2.5 text-right">Requests</th>
                  <th className="px-3 py-2.5 text-right">Tokens</th>
                  <th className="px-3 py-2.5 text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {perKeyModel.map((row, i) => (
                  <tr key={i} className="border-b border-hairline bg-background last:border-0">
                    <td className="px-3 py-2.5 font-medium">{row.keyLabel}</td>
                    <td className="px-3 py-2.5 font-mono text-[11.5px] text-foreground/75">{row.model}</td>
                    <td className="px-3 py-2.5 text-right">{row.count}</td>
                    <td className="px-3 py-2.5 text-right text-foreground/70">{row.tokens.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right text-brand">${row.cost.toFixed(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function formatBucket(t: number, size: number) {
  const d = new Date(t);
  if (size < 86400_000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (size < 7 * 86400_000) return d.toLocaleDateString([], { month: "short", day: "numeric" });
  if (size < 30 * 86400_000) return `wk ${d.toLocaleDateString([], { month: "short", day: "numeric" })}`;
  return d.toLocaleDateString([], { month: "short", year: "2-digit" });
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface/60 p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"mt-2 text-2xl font-semibold tracking-tight " + (accent ? "text-brand" : "")}>{value}</div>
      {hint && <div className="mt-1 font-mono text-[10.5px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-hairline bg-surface/40 p-6">
      <div className="mb-4">
        <h2 className="text-[16px] font-semibold tracking-tight">{title}</h2>
        {desc && <p className="mt-1 text-[12.5px] text-foreground/55">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="rounded-lg border border-dashed border-hairline px-4 py-10 text-center text-[13px] text-muted-foreground">{msg}</p>;
}
