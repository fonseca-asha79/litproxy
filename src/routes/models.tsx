import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { MODELS } from "@/lib/models";
import { Search, Copy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Models — Litproxy" },
      {
        name: "description",
        content:
          "Every Lightning AI model available through the Litproxy gateway, with input/output pricing per 1M tokens.",
      },
    ],
  }),
  component: ModelsPage,
});

function ModelsPage() {
  const [q, setQ] = useState("");
  const [provider, setProvider] = useState<string>("all");
  const [sort, setSort] = useState<string>("default");

  const providers = useMemo(() => {
    const set = new Set(MODELS.map((m) => m.provider));
    return ["all", ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const arr = MODELS.filter((m) => {
      if (provider !== "all" && m.provider !== provider) return false;
      if (!s) return true;
      return (
        m.name.toLowerCase().includes(s) ||
        m.id.toLowerCase().includes(s) ||
        m.provider.toLowerCase().includes(s)
      );
    });
    const ctxNum = (c: string) => {
      const n = parseFloat(c);
      return c.toUpperCase().includes("M") ? n * 1000 : n;
    };
    switch (sort) {
      case "price-asc":  return [...arr].sort((a, b) => a.inputPrice - b.inputPrice);
      case "price-desc": return [...arr].sort((a, b) => b.inputPrice - a.inputPrice);
      case "out-asc":    return [...arr].sort((a, b) => a.outputPrice - b.outputPrice);
      case "out-desc":   return [...arr].sort((a, b) => b.outputPrice - a.outputPrice);
      case "name":       return [...arr].sort((a, b) => a.name.localeCompare(b.name));
      case "context":    return [...arr].sort((a, b) => ctxNum(b.context) - ctxNum(a.context));
      case "provider":   return [...arr].sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));
      default:           return arr;
    }
  }, [q, provider, sort]);

  const copy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success(`Copied ${id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative border-b border-hairline">
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-40" />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-12">
          <p className="anim-fade-in eyebrow">Catalog</p>
          <h1 className="anim-blur-in mt-3 text-5xl font-semibold tracking-tight md:text-6xl" style={{ animationDelay: "80ms" }}>Models</h1>
          <p className="anim-fade-up mt-4 max-w-xl text-[15px] text-foreground/65" style={{ animationDelay: "200ms" }}>
            {MODELS.length} models. Prices in USD per 1M tokens. Click a model id to copy it.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[280px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search by name, provider, or id…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full rounded-md border border-hairline bg-surface/60 py-2.5 pl-9 pr-3 text-[14px] placeholder:text-muted-foreground focus:border-brand focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {providers.map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={
                    "rounded-md border px-3 py-1.5 text-[12px] transition-colors " +
                    (provider === p
                      ? "border-brand/40 bg-brand/10 text-brand"
                      : "border-hairline bg-surface/60 text-foreground/70 hover:border-foreground/40 hover:text-foreground")
                  }
                >
                  {p}
                </button>
              ))}
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-9 w-auto min-w-[200px] rounded-md border-hairline bg-surface/60 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-hairline">
                <SelectItem value="default">Sort: Default</SelectItem>
                <SelectItem value="price-asc">Input price: low → high</SelectItem>
                <SelectItem value="price-desc">Input price: high → low</SelectItem>
                <SelectItem value="out-asc">Output price: low → high</SelectItem>
                <SelectItem value="out-desc">Output price: high → low</SelectItem>
                <SelectItem value="context">Context: largest first</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
                <SelectItem value="provider">Provider</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m, i) => (
            <article
              key={m.id}
              className="anim-fade-up group rounded-xl border border-hairline bg-surface/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:bg-surface hover:shadow-[0_20px_40px_-20px_oklch(0.85_0.18_165/0.3)]"
              style={{ animationDelay: `${Math.min(i, 18) * 35}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-hairline bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground/70">
                  {m.provider}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{m.context}</span>
              </div>

              <h3 className="mt-3 text-[16px] font-semibold tracking-tight">{m.name}</h3>

              <button
                onClick={() => copy(m.id)}
                className="mt-1.5 inline-flex max-w-full items-center gap-1.5 truncate font-mono text-[11px] text-foreground/45 transition-colors hover:text-brand"
                title="Copy id"
              >
                <Copy className="h-3 w-3 shrink-0" />
                <span className="truncate">{m.id}</span>
              </button>

              <div className="mt-5 flex items-baseline gap-4 border-t border-hairline pt-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">In</div>
                  <div className="text-[15px] font-medium text-brand">${m.inputPrice}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Out</div>
                  <div className="text-[15px] font-medium text-brand">${m.outputPrice}</div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-hairline p-16 text-center">
            <p className="text-foreground/60">No models match “{q}”.</p>
          </div>
        )}
      </section>
    </div>
  );
}
