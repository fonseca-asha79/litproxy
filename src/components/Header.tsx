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
    <header className="sticky top-0 z-40 w-full border-b border-hairline bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-brand text-[12px] font-bold text-primary-foreground">
            ⌁
          </span>
          <span className="text-[15px] font-semibold tracking-tight">litproxy</span>
        </Link>

        <nav className="hidden items-center gap-1 text-[13px] md:flex">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/models">Models</NavLink>
          {user && (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/playground">Playground</NavLink>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-xs text-muted-foreground sm:inline">{user.email}</span>
              <button
                onClick={signOut}
                className="rounded-md border border-hairline px-3 py-1.5 text-[12px] text-foreground/80 transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-[13px] text-foreground/70 hover:text-foreground">
                Sign in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-1.5 text-[12.5px] font-medium text-primary-foreground transition-colors hover:bg-brand-deep"
              >
                Get started <span aria-hidden>→</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-md px-3 py-1.5 text-foreground/65 transition-colors hover:bg-surface hover:text-foreground"
      activeProps={{ className: "text-foreground bg-surface" }}
      activeOptions={{ exact: to === "/" }}
    >
      {children}
    </Link>
  );
}
