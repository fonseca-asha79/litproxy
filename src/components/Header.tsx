import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-serif-italic text-2xl leading-none">Litproxy</span>
          <span className="h-1.5 w-1.5 rounded-full bg-magenta" />
        </Link>

        <nav className="hidden items-center gap-9 text-[13px] md:flex">
          <Link to="/" className="text-ink/70 hover:text-ink" activeProps={{ className: "text-ink" }}>Home</Link>
          <Link to="/models" className="text-ink/70 hover:text-ink" activeProps={{ className: "text-ink" }}>Models</Link>
          {user && (
            <>
              <Link to="/dashboard" className="text-ink/70 hover:text-ink" activeProps={{ className: "text-ink" }}>Dashboard</Link>
              <Link to="/playground" className="text-ink/70 hover:text-ink" activeProps={{ className: "text-ink" }}>Playground</Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-5">
          {user ? (
            <>
              <span className="hidden text-xs text-muted-foreground sm:inline">{user.email}</span>
              <button
                onClick={signOut}
                className="cta-primary text-ink/70 hover:text-magenta"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-[13px] text-ink/70 hover:text-ink">
                Sign in
              </Link>
              <Link
                to="/register"
                className="cta-primary inline-flex items-center bg-ink px-5 py-2.5 text-paper hover:bg-magenta transition-colors"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
