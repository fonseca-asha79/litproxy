import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { MODELS } from "@/lib/models";
import { Zap, Key, Shuffle, Activity, ArrowRight, Code2, ArrowDown } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LitProxy — OpenAI-compatible gateway for Lightning AI" },
      {
        name: "description",
        content:
          "Bring your Lightning AI keys, get an OpenAI-compatible endpoint with automatic key rotation, fallback, request logs and per-model cost tracking.",
      },
      { property: "og:title", content: "LitProxy — OpenAI-compatible gateway for Lightning AI" },
      { property: "og:description", content: "Multi-key rotation, fallback, logs and cost tracking on top of Lightning AI." },
    ],
  }),
  component: Home,
});

function Home() {
  const featured = MODELS.slice(0, 8);
  const [origin, setOrigin] = useState("https://your-app.lovable.app");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] opacity-50"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 10%, oklch(0.80 0.17 75 / 0.45), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-16 text-center sm:pt-32">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-primary backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            OpenAI-compatible gateway
          </div>
          <h1 className="mt-8 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
            One endpoint. <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">All your keys.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Bring multiple Lightning AI keys. Pick a default model. We rotate keys, fall back on
            errors, and log every token, latency and cent — behind one OpenAI-shaped URL.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              asChild
              className="h-12 rounded-full bg-primary px-7 text-base font-medium text-primary-foreground shadow-glow hover:bg-primary/90"
            >
              <Link to="/register">
                Launch your endpoint <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <a href="#how" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              See how it works <ArrowDown className="h-4 w-4" />
            </a>
          </div>

          {/* Terminal */}
          <div className="mx-auto mt-16 max-w-2xl rounded-xl border border-border/60 bg-card/70 text-left shadow-elegant backdrop-blur">
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              <span className="ml-3 font-mono text-xs text-muted-foreground">~/litproxy/example.py</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed">
<span className="text-muted-foreground"># Drop-in OpenAI client</span>{"\n"}
<span className="text-primary">from</span> openai <span className="text-primary">import</span> OpenAI{"\n\n"}
client = <span className="text-primary">OpenAI</span>({"\n"}
{"  "}base_url=<span className="text-success">"{origin}/api/public/v1"</span>,{"\n"}
{"  "}api_key=<span className="text-success">"lvp_your_proxy_key"</span>,{"\n"}
){"\n\n"}
<span className="text-muted-foreground"># model="default" → uses your dashboard default</span>{"\n"}
resp = client.chat.completions.<span className="text-primary">create</span>({"\n"}
{"  "}model=<span className="text-success">"default"</span>,{"\n"}
{"  "}messages=[{"{"}<span className="text-success">"role"</span>: <span className="text-success">"user"</span>, <span className="text-success">"content"</span>: <span className="text-success">"Hi!"</span>{"}"}],{"\n"}
)
            </pre>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Everything in one place</h2>
          <p className="mt-2 text-muted-foreground">From key to response, all observed.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Key, title: "Bring your keys", desc: "Add as many Lightning AI keys as you want — labelled and toggleable." },
            { icon: Shuffle, title: "Auto rotation", desc: "Keys rotate by least-recent-use to spread load evenly." },
            { icon: Zap, title: "Smart fallback", desc: "If one key fails we transparently retry on the next." },
            { icon: Activity, title: "Cost & logs", desc: "Per-request tokens, latency, errors and USD cost." },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur transition hover:border-primary/50 hover:shadow-glow"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured models */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Featured models</h2>
            <p className="text-sm text-muted-foreground">USD per 1M tokens (input / output)</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/models">All {MODELS.length} <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((m) => (
            <div key={m.id} className="rounded-xl border border-border/60 bg-card/40 p-4 transition hover:border-primary/40">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{m.provider}</div>
              <div className="mt-1 font-medium">{m.name}</div>
              <div className="mt-3 flex items-baseline gap-1 text-sm">
                <span className="text-primary">${m.inputPrice}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-primary">${m.outputPrice}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{m.context} ctx</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        Built on top of <a className="text-primary hover:underline" href="https://lightning.ai/models" target="_blank" rel="noreferrer">Lightning AI</a>.
      </footer>
    </div>
  );
}
