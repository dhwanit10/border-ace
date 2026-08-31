import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { apiPostJson, clearAuth, getAuth, type AuthState } from "@/lib/api";
import { cn } from "@/lib/utils";

export function useAuthState() {
  const [auth, setAuthState] = useState<AuthState | null | undefined>(undefined);
  useEffect(() => {
    const sync = () => setAuthState(getAuth());
    sync();
    window.addEventListener("bsg-auth-change", sync);
    return () => window.removeEventListener("bsg-auth-change", sync);
  }, []);
  return auth;
}

export type NavItem = { label: string; to: string };

export function AppShell({
  nav,
  children,
  role,
}: {
  nav: NavItem[];
  children: React.ReactNode;
  role: string;
}) {
  const navigate = useNavigate();
  const auth = useAuthState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [out, setOut] = useState(false);

  useEffect(() => {
    if (auth === undefined) return;
    if (!auth) void navigate({ to: "/" });
    else if (!auth.verified) void navigate({ to: "/verify" });
  }, [auth, navigate]);

  const logout = async () => {
    setOut(true);
    try {
      const a = getAuth();
      await apiPostJson("/api/v1/auth/logout", {
        session_id: a?.session_id ?? null,
        user_id: a?.user_id,
      });
      toast.success("Signed out successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Logout failed");
    } finally {
      clearAuth();
      setOut(false);
      void navigate({ to: "/" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">Sentinel Border Control</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {role} console
              </p>
            </div>
          </div>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  pathname === n.to && "bg-accent text-foreground",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{auth?.full_name ?? auth?.username}</p>
              <p className="text-[11px] text-muted-foreground">
                System #{auth?.system_id} · Session #{auth?.session_id ?? "—"}
              </p>
            </div>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={() => void logout()} disabled={out}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
        <nav className="flex items-center gap-1 border-t border-border px-4 py-2 md:hidden">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm text-muted-foreground",
                pathname === n.to && "bg-accent text-foreground",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
