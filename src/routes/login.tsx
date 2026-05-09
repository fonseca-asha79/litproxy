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
      <div className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md items-center px-6 py-16">
        <div className="absolute inset-0 bg-grid bg-grid-fade opacity-30" />
        <form onSubmit={submit} className="relative w-full rounded-2xl border border-hairline bg-surface/70 p-8 backdrop-blur">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-[13px] text-foreground/60">Sign in to your gateway.</p>

          <button
            type="button"
            onClick={google}
            className="mt-6 w-full rounded-md border border-hairline bg-background py-2.5 text-[13px] font-medium transition-colors hover:border-foreground/40"
          >
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <div className="h-px flex-1 bg-hairline" /> or <div className="h-px flex-1 bg-hairline" />
          </div>

          <div className="space-y-4">
            <Field label="Email" id="email">
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-hairline bg-background px-3 py-2.5 text-[14px] focus:border-brand focus:outline-none"
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
                className="w-full rounded-md border border-hairline bg-background px-3 py-2.5 text-[14px] focus:border-brand focus:outline-none"
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-7 w-full rounded-md bg-brand py-2.5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-brand-deep disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="mt-6 text-center text-[13px] text-foreground/60">
            New here?{" "}
            <Link to="/register" className="text-brand hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-foreground/80">{label}</span>
      {children}
    </label>
  );
}
