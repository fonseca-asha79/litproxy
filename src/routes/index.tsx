import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Reveal } from "@/components/Reveal";
import { MODELS } from "@/lib/models";
import { ArrowRight, Zap, Shield, Repeat, LineChart } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Litproxy — One OpenAI-compatible endpoint for all your Lightning AI keys" },
      {
        name: "description",
        content:
          "Bring your Lightning AI keys. Get one OpenAI-compatible endpoint with key rotation, automatic fallback, request logs and per-model cost tracking.",
      },
      { property: "og:title", content: "Litproxy — Gateway for Lightning AI" },
      { property: "og:description", content: "Multi-key rotation, fallback, logs and cost tracking." },
    ],
  }),
  component: Home,
});

function Home() {
  const [origin, setOrigin] = useState("https://your-app.lovable.app");
  useEffect(() => setOrigin(window.location.origin), []);
  const featured = MODELS.slice(0, 6);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-hairline">
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-60" />
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.85 0.18 165 / 0.6), transparent 70%)" }}
        />

        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-28 text-center md:pt-32 md:pb-36">
          <Link
            to="/models"
            className="anim-fade-in inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-3 py-1 text-[12px] text-foreground/80 backdrop-blur transition-colors hover:border-brand/40 hover:text-foreground"
            style={{ animationDelay: "60ms" }}
          >
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-brand" />
            {MODELS.length} models available
            <ArrowRight className="h-3 w-3" />
          </Link>

          <h1
            className="anim-blur-in mt-8 text-balance text-[clamp(2.5rem,7vw,5rem)] font-semibold leading-[1.05] tracking-tight"
            style={{ animationDelay: "120ms" }}
          >
            One endpoint.<br />
            <span className="bg-gradient-to-r from-brand to-brand-deep bg-clip-text text-transparent">
              All your keys.
            </span>
          </h1>

          <p
            className="anim-fade-up mx-auto mt-6 max-w-xl text-balance text-[17px] leading-relaxed text-foreground/65"
            style={{ animationDelay: "260ms" }}
          >
            An OpenAI-compatible proxy for Lightning AI. Rotates keys, falls back on failure,
            logs every token and cent.
          </p>

          <div
            className="anim-fade-up mt-10 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "380ms" }}
          >
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-[14px] font-medium text-primary-foreground shadow-[0_0_0_0_oklch(0.85_0.18_165/0.4)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep hover:shadow-[0_10px_30px_-10px_oklch(0.85_0.18_165/0.6)]"
            >
              Start for free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/models"
              className="inline-flex items-center gap-2 rounded-md border border-hairline bg-surface/60 px-5 py-2.5 text-[14px] text-foreground/80 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-foreground/40 hover:text-foreground"
            >
              Browse models
            </Link>
          </div>

          {/* Terminal */}
          <div className="mx-auto mt-16 max-w-3xl text-left">
            <div className="overflow-hidden rounded-xl border border-hairline bg-surface/80 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">example.py</span>
                <span className="font-mono text-[11px] text-muted-foreground">openai-sdk</span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-6 text-foreground/85">
<span className="text-muted-foreground"># Drop-in. No SDK changes.</span>{"\n"}
<span className="text-brand">from</span> openai <span className="text-brand">import</span> OpenAI{"\n\n"}
client = OpenAI({"\n"}
{"    "}base_url=<span className="text-brand">"{origin}/api/public/v1"</span>,{"\n"}
{"    "}api_key=<span className="text-brand">"lvp_your_proxy_key"</span>,{"\n"}
){"\n\n"}
resp = client.chat.completions.create({"\n"}
{"    "}model=<span className="text-brand">"default"</span>,  <span className="text-muted-foreground"># or any model id</span>{"\n"}
{"    "}messages=[{"{"}<span className="text-brand">"role"</span>: <span className="text-brand">"user"</span>, <span className="text-brand">"content"</span>: <span className="text-brand">"Hello."</span>{"}"}],{"\n"}
)
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">Features</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Built for resilience, not noise.
            </h2>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Zap, t: "Bring your keys", d: "Add as many Lightning AI keys as you want. Label, pause, rotate them." },
              { icon: Repeat, t: "Smart rotation", d: "Each request picks the key idle the longest. Load is spread automatically." },
              { icon: Shield, t: "Auto fallback", d: "If a key returns an error, the next one is tried. The caller never notices." },
              { icon: LineChart, t: "Full observability", d: "Every request logs tokens, latency, errors and USD cost." },
            ].map((f) => (
              <div key={f.t} className="bg-background p-6 transition-colors hover:bg-surface">
                <div className="grid h-9 w-9 place-items-center rounded-md border border-hairline bg-surface text-brand">
                  <f.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-5 text-[15px] font-semibold">{f.t}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/60">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODELS */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Catalog</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
                {MODELS.length} models. One key.
              </h2>
            </div>
            <Link
              to="/models"
              className="inline-flex items-center gap-1.5 text-[13px] text-foreground/70 hover:text-brand"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((m) => (
              <div
                key={m.id}
                className="group rounded-xl border border-hairline bg-surface/60 p-5 transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:bg-surface"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {m.provider}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">{m.context}</span>
                </div>
                <h3 className="mt-3 text-[16px] font-semibold tracking-tight">{m.name}</h3>
                <p className="mt-1 truncate font-mono text-[11px] text-foreground/45">{m.id}</p>
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative mx-auto max-w-4xl px-6 py-28 text-center">
          <h2 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            Ship in <span className="text-brand">30 seconds</span>.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-foreground/60">
            Sign up, paste a Lightning key, point your client at one URL.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-brand-deep"
          >
            Create your endpoint <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-[12px] text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Litproxy</p>
          <p className="font-mono">a quiet gateway for noisy infrastructure</p>
        </div>
      </footer>
    </div>
  );
}
