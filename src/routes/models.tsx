import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { MODELS } from "@/lib/models";
import { Search, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "The Catalogue — Litproxy" },
      { name: "description", content: "Every Lightning AI model available through the Litproxy gateway, with input/output pricing." },
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

      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-12">
          <p className="eyebrow">Volume II</p>
          <h1 className="mt-4 font-serif-italic text-7xl leading-none">The Catalogue.</h1>
          <p className="mt-6 max-w-xl font-display text-xl italic text-ink/75">
            {MODELS.length} models. Prices in US dollars per one million tokens. Click an
            identifier to copy it.
          </p>

          <div className="relative mt-10 max-w-md">
            <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" />
            <input
              placeholder="Search by name, provider or id…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full border-0 border-b border-border bg-transparent py-3 pl-7 pr-3 text-[15px] placeholder:text-ash focus:border-magenta focus:outline-none"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m, i) => (
              <article
                key={m.id}
                className="group relative bg-background p-8 transition-colors hover:bg-paper"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[11px] tracking-wider text-ash">
                    Nº {String(i + 1).padStart(3, "0")}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ash">
                    {m.context}
                  </span>
                </div>

                <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-ash">
                  {m.provider}
                </p>
                <h3 className="mt-1 font-serif-italic text-3xl leading-tight">{m.name}</h3>

                <button
                  onClick={() => copy(m.id)}
                  className="mt-4 inline-flex max-w-full items-center gap-2 truncate font-mono text-[11px] text-ink/55 transition-colors hover:text-magenta"
                  title="Copy id"
                >
                  <Copy className="h-3 w-3 shrink-0" />
                  <span className="truncate">{m.id}</span>
                </button>

                <div className="mt-8 flex items-baseline gap-6 border-t border-border pt-5">
                  <div>
                    <div className="eyebrow">In</div>
                    <div className="font-display text-2xl italic text-magenta">
                      ${m.inputPrice}
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="eyebrow">Out</div>
                    <div className="font-display text-2xl italic text-magenta">
                      ${m.outputPrice}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="border border-dashed border-border p-16 text-center">
              <p className="font-display text-2xl italic text-ash">No model matches “{q}”.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
