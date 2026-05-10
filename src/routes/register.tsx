import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create your account — Litproxy" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/dashboard" },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.session) {
      navigate({ to: "/dashboard" });
    } else {
      setSent(true);
      toast.success("Check your email to verify your account.");
    }
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
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1 text-[13px] text-foreground/60">One endpoint. All your Lightning AI keys.</p>

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
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-foreground/80">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-hairline bg-background px-3 py-2.5 text-[14px] focus:border-brand focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-foreground/80">Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-hairline bg-background px-3 py-2.5 text-[14px] focus:border-brand focus:outline-none"
              />
              <span className="mt-1.5 block text-[11px] text-muted-foreground">Minimum 6 characters.</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-7 w-full rounded-md bg-brand py-2.5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-brand-deep disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create account"}
          </button>

          <p className="mt-6 text-center text-[13px] text-foreground/60">
            Already have one?{" "}
            <Link to="/login" className="text-brand hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
