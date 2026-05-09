import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Litproxy" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) toast.error((result.error as Error).message || "Google sign-in failed");
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto grid max-w-5xl gap-16 px-6 py-20 md:grid-cols-2 md:py-28">
        <aside className="hidden md:block">
          <p className="eyebrow">Returning reader</p>
          <h1 className="mt-4 font-serif-italic text-6xl leading-none">
            Welcome
            <br />
            back.
          </h1>
          <p className="mt-8 max-w-sm font-display text-xl italic text-ink/70">
            Pick up where you left off — your endpoint, your keys, your ledger.
          </p>
        </aside>

        <form onSubmit={submit} className="md:pt-12">
          <p className="eyebrow md:hidden">Welcome back</p>
          <h2 className="mt-2 font-serif-italic text-4xl leading-none md:hidden">Sign in.</h2>

          <button
            type="button"
            onClick={google}
            className="mt-2 w-full border border-border bg-paper py-3 text-[13px] hover:border-ink"
          >
            Continue with Google
          </button>

          <div className="my-8 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-ash">
            <div className="h-px flex-1 bg-border" /> or with email <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-6">
            <Field label="Email" id="email">
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-0 border-b border-border bg-transparent py-2 text-[15px] focus:border-ink focus:outline-none"
              />
            </Field>
            <Field label="Password" id="password">
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-0 border-b border-border bg-transparent py-2 text-[15px] focus:border-ink focus:outline-none"
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cta-primary mt-10 w-full bg-ink py-4 text-paper transition-colors hover:bg-magenta disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="mt-8 text-center text-sm text-ink/60">
            New here?{" "}
            <Link to="/register" className="text-magenta underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="eyebrow block">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
