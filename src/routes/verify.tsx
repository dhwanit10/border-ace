import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, ScanFace } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuthState } from "@/components/app-shell";
import { CameraCapture } from "@/components/camera-capture";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiPostForm, clearAuth, patchAuth } from "@/lib/api";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Identity verification — Sentinel" },
      {
        name: "description",
        content: "Biometric face verification step before accessing the Sentinel console.",
      },
      { property: "og:title", content: "Identity verification — Sentinel" },
      {
        property: "og:description",
        content: "Confirm officer identity with a live face scan before the session begins.",
      },
    ],
  }),
  component: VerifyPage,
});

const STAGES = [
  "Initialising secure channel",
  "Detecting facial landmarks",
  "Generating face embedding",
  "Matching against enrolled biometric",
  "Finalising verification",
];

function VerifyPage() {
  const navigate = useNavigate();
  const auth = useAuthState();
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (auth === null) void navigate({ to: "/" });
    if (auth && auth.verified) {
      void navigate({ to: auth.user_type === "admin" ? "/admin" : "/officer" });
    }
  }, [auth, navigate]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1400);
    return () => clearInterval(t);
  }, [busy]);

  const onCapture = async (file: File) => {
    if (!auth) return;
    setBusy(true);
    setStage(0);
    try {
      const fd = new FormData();
      fd.append("user_id", String(auth.user_id));
      fd.append("system_id", String(auth.system_id));
      fd.append("image", file);
      const res = await apiPostForm<{
        success: boolean;
        session_id: number;
        full_name: string;
        face_match_score: number;
        message: string;
      }>("/api/v1/verification/verify-user", fd);

      if (!res.success) {
        toast.error(res.message || "Face verification failed");
        clearAuth();
        void navigate({ to: "/" });
        return;
      }
      patchAuth({
        session_id: res.session_id,
        full_name: res.full_name,
        verified: true,
      });
      setDone(true);
      toast.success(
        `Identity confirmed — match ${(res.face_match_score * 100).toFixed(1)}%`,
      );
      setTimeout(() => {
        void navigate({ to: auth.user_type === "admin" ? "/admin" : "/officer" });
      }, 900);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
      clearAuth();
      void navigate({ to: "/" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="surface-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Step 2 of 2
        </span>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold">
          Officer identity verification
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Look straight into the camera and capture a clear frame of your face.
        </p>

        <div className="mt-8">
          {done ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-12">
              <CheckCircle2 className="h-14 w-14 text-success" />
              <p className="text-lg font-semibold">Verified — opening console</p>
            </div>
          ) : busy ? (
            <div className="rounded-2xl border border-border bg-card p-10">
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                <span className="pulse-ring absolute inset-0 rounded-full border-2 border-primary" />
                <ScanFace className="h-12 w-12 text-primary" />
              </div>
              <ul className="mx-auto mt-8 max-w-sm space-y-3 text-left">
                {STAGES.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 text-sm">
                    {i < stage ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : i === stage ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
                    )}
                    <span className={i <= stage ? "text-foreground" : "text-muted-foreground"}>
                      {s}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <CameraCapture onCapture={(f) => void onCapture(f)} label="Capture & verify" />
          )}
        </div>
      </div>
    </div>
  );
}
