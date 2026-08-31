import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiGet, apiPostJson, setAuth, type AuthState, type SystemItem } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Sentinel Border Control" },
      {
        name: "description",
        content: "Officer and administrator sign-in for the Sentinel border document screening console.",
      },
      { property: "og:title", content: "Sign in — Sentinel Border Control" },
      {
        property: "og:description",
        content: "Secure sign-in to the border document screening and fraud detection console.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [systems, setSystems] = useState<SystemItem[]>([]);
  const [loadingSystems, setLoadingSystems] = useState(true);
  const [systemId, setSystemId] = useState<string>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiGet<{ total: number; systems: SystemItem[] }>("/api/v1/system/get-offline", false)
      .then((d) => setSystems(d.systems ?? []))
      .catch((e: unknown) =>
        toast.error(e instanceof Error ? e.message : "Unable to load available systems"),
      )
      .finally(() => setLoadingSystems(false));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !systemId) {
      toast.error("Enter username, password and select a system");
      return;
    }
    setBusy(true);
    try {
      const res = await apiPostJson<{
        success: boolean;
        user_id: number;
        username: string;
        user_type: "officer" | "admin";
        system_id: number;
        access_token: string;
      }>(
        "/api/v1/users/login",
        { username, password, system_id: Number(systemId) },
        false,
      );
      if (!res.success) {
        toast.error("Invalid credentials");
        return;
      }
      const auth: AuthState = {
        access_token: res.access_token,
        user_id: res.user_id,
        username: res.username,
        user_type: res.user_type,
        system_id: res.system_id,
        verified: false,
      };
      setAuth(auth);
      toast.success(`Welcome, ${res.username}. Proceed to identity verification.`);
      void navigate({ to: "/verify" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="surface-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-success/10 blur-3xl" />

      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2">
        <div className="hidden lg:block">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Restricted access
          </span>
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-5xl font-bold leading-tight">
            Sentinel Border Control
          </h1>
          <p className="mt-4 max-w-md text-base text-muted-foreground">
            Document screening, biometric verification and fraud risk analysis for immigration
            checkpoints. Every session is logged, attributed and auditable.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              ["OCR", "Document extraction"],
              ["Biometric", "Face match scoring"],
              ["Forensics", "Tampering detection"],
            ].map(([t, s]) => (
              <div key={t} className="rounded-xl border border-border bg-card/70 p-4">
                <p className="text-sm font-semibold">{t}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl shadow-primary/5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Officer sign in</h2>
              <p className="text-xs text-muted-foreground">Authorised personnel only</p>
            </div>
          </div>

          <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="system">Workstation</Label>
              <Select value={systemId} onValueChange={setSystemId}>
                <SelectTrigger id="system" className="w-full">
                  <SelectValue
                    placeholder={
                      loadingSystems ? "Loading systems…" : "Select an available workstation"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {systems.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.system_name}
                    </SelectItem>
                  ))}
                  {!loadingSystems && systems.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No offline workstations available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
