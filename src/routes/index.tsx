import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { MODELS } from "@/lib/models";
import { Zap, Key, Shuffle, Activity, ArrowRight, Code2 } from "lucide-react";

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
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Zap className="h-3 w-3 text-primary" />
            <span>Powered by Lightning AI · {MODELS.length} models</span>
          </div>
          <h1 className="mt-6 bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-5xl font-semibold tracking-tight text-transparent sm:text-7xl">
            One endpoint. <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">All your keys.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            An OpenAI-compatible proxy on top of Lightning AI. Bring multiple API keys, set a default
            model, and we'll rotate keys, fall back on errors, and log every cent.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/register">
                Get your endpoint <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/models">Browse models</Link>
            </Button>
          </div>

          {/* Code block */}
          <div className="mx-auto mt-16 max-w-2xl rounded-xl border border-border/60 bg-card/60 p-1 text-left shadow-elegant backdrop-blur">
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2 text-xs text-muted-foreground">
              <Code2 className="h-3 w-3" /> Drop-in OpenAI replacement
            </div>
            <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
{`from openai import OpenAI

client = OpenAI(
  base_url="${typeof window !== "undefined" ? window.location.origin : "https://your-app.lovable.app"}/api/public/v1",
  api_key="lvp_your_proxy_key",
)

# leave model empty to use your default
resp = client.chat.completions.create(
  model="openai/gpt-5-mini",
  messages=[{"role": "user", "content": "Hi!"}],
)`}
            </pre>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Key, title: "Bring your keys", desc: "Add as many Lightning AI keys as you want." },
            { icon: Shuffle, title: "Auto rotation", desc: "Keys rotate by least-recent-use." },
            { icon: Zap, title: "Smart fallback", desc: "Failed key? We try the next one instantly." },
            { icon: Activity, title: "Cost & logs", desc: "Per-request token, latency, error & USD cost." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border/60 bg-card/40 p-6 backdrop-blur transition hover:border-primary/40">
              <f.icon className="h-6 w-6 text-primary" />
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
            <div key={m.id} className="rounded-lg border border-border/60 bg-card/40 p-4">
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
