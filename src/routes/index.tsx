import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { MODELS } from "@/lib/models";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Litproxy — An editorial OpenAI-shaped gateway for Lightning AI" },
      {
        name: "description",
        content:
          "Bring your Lightning AI keys. Get one OpenAI-compatible endpoint with key rotation, fallback, request logs and per-model cost tracking.",
      },
      { property: "og:title", content: "Litproxy — Editorial gateway for Lightning AI" },
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
    <div className="min-h-screen bg-background text-ink">
      <Header />

      {/* HERO ─────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-16 px-6 pt-24 pb-28 md:grid-cols-12 md:pt-32 md:pb-36">
          <div className="md:col-span-7">
            <div className="eyebrow flex items-center gap-3">
              <span className="h-px w-8 bg-ash" />
              Issue Nº 01 — Gateway
            </div>

            <h1 className="mt-8 font-serif-italic text-[clamp(3rem,9vw,6.5rem)] leading-[0.95] tracking-tight">
              One endpoint.
              <br />
              <span className="not-italic font-normal">All your</span>{" "}
              <span className="text-magenta">keys.</span>
            </h1>

            <p className="mt-10 max-w-xl font-display text-2xl italic font-light leading-tight text-ink/80">
              An OpenAI-shaped proxy for Lightning AI. Quietly rotates keys, falls back on
              failure, logs every cent.
            </p>

            <div className="mt-12 flex flex-wrap items-center gap-8">
              <Link
                to="/register"
                className="cta-primary group inline-flex items-center gap-3 bg-ink px-10 py-4 text-paper transition-colors hover:bg-magenta"
              >
                Get started
                <span className="h-px w-6 bg-paper transition-all group-hover:w-10" />
              </Link>
              <Link to="/models" className="text-[13px] text-ink/70 underline-offset-4 hover:text-magenta hover:underline">
                Browse {MODELS.length} models →
              </Link>
            </div>
          </div>

          {/* Side note in italic */}
          <aside className="md:col-span-5 md:pt-32">
            <div className="border-l border-border pl-6">
              <p className="eyebrow">A note from the editor</p>
              <p className="mt-4 font-display text-lg italic leading-relaxed text-ink/75">
                We resisted the dark-mode-with-purple-gradients aesthetic. What you get instead
                is a tool that reads like a printed publication — slow on the eye, fast in the
                hand.
              </p>
              <p className="mt-6 font-mono text-[11px] tracking-wider text-ash">— L.P.</p>
            </div>
          </aside>
        </div>
      </section>

      {/* CODE EXAMPLE ─────────────────────────────────────── */}
      <section className="border-b border-border bg-paper">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="eyebrow">Chapter I</p>
            <h2 className="mt-4 font-serif-italic text-5xl leading-none">
              A drop-in
              <br />
              replacement.
            </h2>
            <p className="mt-6 max-w-xs text-[15px] leading-relaxed text-ink/70">
              Point any OpenAI client at one URL. Use <code className="font-mono text-[13px] text-magenta">model="default"</code>{" "}
              to fall back to your dashboard preference.
            </p>
          </div>

          <div className="md:col-span-8">
            <div className="border border-border bg-background">
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <span className="font-mono text-[11px] tracking-wider text-ash uppercase">
                  example.py
                </span>
                <span className="font-mono text-[11px] text-ash">python · openai-sdk</span>
              </div>
              <pre className="overflow-x-auto p-6 font-mono text-[13px] leading-7 text-ink">
<span className="text-ash"># A printed example, faithfully set.</span>{"\n"}
<span className="text-magenta">from</span> openai <span className="text-magenta">import</span> OpenAI{"\n\n"}
client = <span className="text-ink">OpenAI</span>({"\n"}
{"    "}base_url=<span className="text-magenta">"{origin}/api/public/v1"</span>,{"\n"}
{"    "}api_key=<span className="text-magenta">"lvp_your_proxy_key"</span>,{"\n"}
){"\n\n"}
resp = client.chat.completions.<span className="text-ink">create</span>({"\n"}
{"    "}model=<span className="text-magenta">"default"</span>,{"\n"}
{"    "}messages=[{"{"}<span className="text-magenta">"role"</span>: <span className="text-magenta">"user"</span>,{"\n"}
{"                "}<span className="text-magenta">"content"</span>: <span className="text-magenta">"Hello."</span>{"}"}],{"\n"}
)
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* PRINCIPLES ──────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-28">
          <p className="eyebrow">Chapter II — Principles</p>
          <h2 className="mt-4 font-serif-italic text-6xl leading-none">
            Considered, not <span className="not-italic font-normal">noisy.</span>
          </h2>

          <div className="mt-16 grid gap-px bg-border md:grid-cols-2">
            {[
              {
                n: "01",
                t: "Bring your keys",
                d: "Add as many Lightning AI keys as you like. Label them. Pause them. Rotate them.",
              },
              {
                n: "02",
                t: "Least-recent rotation",
                d: "Each request picks the key idle the longest. Load is spread without ceremony.",
              },
              {
                n: "03",
                t: "Quiet fallback",
                d: "If a key returns an error, the next one is tried. The caller never notices.",
              },
              {
                n: "04",
                t: "An honest ledger",
                d: "Every request keeps tokens, latency, error and USD cost. Visible in your dashboard.",
              },
            ].map((f) => (
              <div key={f.n} className="bg-background p-10">
                <div className="flex items-baseline gap-6">
                  <span className="font-serif-italic text-3xl text-magenta">{f.n}</span>
                  <h3 className="font-display text-2xl italic">{f.t}</h3>
                </div>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink/70">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED MODELS ─────────────────────────────────── */}
      <section className="bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-28">
          <div className="flex items-end justify-between border-b border-border pb-6">
            <div>
              <p className="eyebrow">Chapter III</p>
              <h2 className="mt-3 font-serif-italic text-5xl leading-none">From the catalogue.</h2>
            </div>
            <Link to="/models" className="cta-primary text-ink/70 hover:text-magenta">
              View all {MODELS.length}
              <ArrowRight className="ml-2 inline h-3 w-3" />
            </Link>
          </div>

          <ul className="mt-2 divide-y divide-border">
            {featured.map((m, i) => (
              <li key={m.id} className="grid grid-cols-12 items-baseline gap-4 py-6 transition-colors hover:bg-background">
                <span className="col-span-1 font-mono text-[11px] text-ash">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="col-span-11 md:col-span-5">
                  <div className="font-display text-2xl italic">{m.name}</div>
                  <div className="font-mono text-[11px] uppercase tracking-wider text-ash">
                    {m.provider}
                  </div>
                </div>
                <div className="col-span-6 hidden font-mono text-[12px] text-ink/60 md:block">
                  {m.id}
                </div>
                <div className="col-span-12 mt-2 flex items-baseline justify-end gap-6 md:col-span-12 md:mt-0 md:contents">
                  <span className="text-[13px] text-ash">in</span>
                  <span className="font-display text-xl italic text-magenta">${m.inputPrice}</span>
                  <span className="text-[13px] text-ash">out</span>
                  <span className="font-display text-xl italic text-magenta">${m.outputPrice}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* COLOPHON ────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-baseline justify-between gap-6 px-6 py-10 md:flex-row">
          <p className="font-display text-lg italic">
            Litproxy <span className="text-ash">— a quiet gateway for noisy infrastructure.</span>
          </p>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ash">
            Set in Cormorant Garamond &amp; Instrument Sans · ©{" "}
            {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
