import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { MODELS } from "@/lib/models";
import { Search, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Models — LitProxy" },
      { name: "description", content: "All Lightning AI models available through the LitProxy gateway with token pricing." },
    ],
  }),
  component: ModelsPage,
});

function ModelsPage() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return MODELS;
    return MODELS.filter(
      (m) =>
        m.name.toLowerCase().includes(s) ||
        m.id.toLowerCase().includes(s) ||
        m.provider.toLowerCase().includes(s),
    );
  }, [q]);

  const copy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success(`Copied ${id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Models</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {MODELS.length} models. Prices in USD per 1M tokens. Click an id to copy.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search models…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="group flex flex-col rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur transition hover:border-primary/50 hover:shadow-glow"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    {m.provider}
                  </div>
                  <div className="mt-1 text-base font-semibold">{m.name}</div>
                </div>
                <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {m.context}
                </span>
              </div>

              <button
                onClick={() => copy(m.id)}
                className="mt-3 inline-flex items-center gap-1.5 truncate font-mono text-xs text-muted-foreground transition hover:text-primary"
                title="Copy model id"
              >
                <Copy className="h-3 w-3 shrink-0" />
                <span className="truncate">{m.id}</span>
              </button>

              <div className="mt-auto flex items-end justify-between pt-5">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Input</div>
                  <div className="text-lg font-semibold text-primary">${m.inputPrice}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Output</div>
                  <div className="text-lg font-semibold text-primary">${m.outputPrice}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-8 rounded-xl border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
            No models match “{q}”.
          </div>
        )}
      </div>
    </div>
  );
}
