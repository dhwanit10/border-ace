import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  FilePlus2,
  FileScan,
  Loader2,
  ScanFace,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useAuthState } from "@/components/app-shell";
import { CameraCapture } from "@/components/camera-capture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPostForm, apiPostJson, type ExtractedDoc } from "@/lib/api";

export const Route = createFileRoute("/officer/")({
  head: () => ({
    meta: [
      { title: "Start case — Sentinel Officer Console" },
      {
        name: "description",
        content:
          "Upload a travel document, run OCR extraction, verify the traveller's face and record a risk decision.",
      },
      { property: "og:title", content: "Start case — Sentinel Officer Console" },
      {
        property: "og:description",
        content: "Screen travel documents and record fraud risk decisions at the checkpoint.",
      },
    ],
  }),
  component: OfficerCase,
});

type Step = "idle" | "preview" | "ocr" | "extracted" | "face" | "verifying" | "result";

type VerifyResult = {
  verification_id: number;
  risk_id: number;
  face_match_score: number;
  ocr_confidence: number;
  mrz_validation: boolean;
  tampering_probability: number;
  status: string;
};

const FIELDS: Array<{ key: keyof ExtractedDoc; label: string; type?: string }> = [
  { key: "full_name", label: "Full name" },
  { key: "doc_number", label: "Document number" },
  { key: "gender", label: "Gender" },
  { key: "nationality", label: "Nationality" },
  { key: "dob", label: "Date of birth" },
  { key: "issue_date", label: "Issue date" },
  { key: "expiry_date", label: "Expiry date" },
  { key: "address", label: "Address" },
];

const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${(v <= 1 ? v * 100 : v).toFixed(2)}%`;

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const tones = {
    default: "border-border",
    good: "border-success/40 bg-success/10",
    bad: "border-destructive/40 bg-destructive/10",
    warn: "border-warning/40 bg-warning/10",
  } as const;
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function OfficerCase() {
  const auth = useAuthState();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [docId, setDocId] = useState<number | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [doc, setDoc] = useState<ExtractedDoc | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const isPassport = (doc?.doc_type ?? "").toLowerCase() === "passport";

  const reset = () => {
    setStep("idle");
    setFile(null);
    setPreview(null);
    setDocId(null);
    setDoc(null);
    setResult(null);
    setOcrConfidence(null);
    setDescription("");
  };

  const pickFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStep("preview");
  };

  const startOcr = async () => {
    if (!file || !auth) return;
    setStep("ocr");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("user_id", String(auth.user_id));
      const res = await apiPostForm<{
        doc_id: number;
        extracted_data: ExtractedDoc;
        ocr_confidence: number;
      }>("/api/v1/workflow/upload-document", fd);
      setDocId(res.doc_id);
      setDoc(res.extracted_data);
      setOcrConfidence(res.ocr_confidence);
      setStep("extracted");
      toast.success("Document extracted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "OCR failed");
      setStep("preview");
    }
  };

  const verifyPerson = async (personImage: File) => {
    if (!auth || !doc || docId === null) return;
    setStep("verifying");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("doc_id", String(docId));
      fd.append("doc_data", JSON.stringify(doc));
      fd.append("person_image", personImage);
      fd.append("officer_id", String(auth.user_id));
      fd.append("session_id", String(auth.session_id ?? ""));
      fd.append(
        "ocr_confidence",
        String(ocrConfidence !== null && ocrConfidence > 1 ? ocrConfidence / 100 : (ocrConfidence ?? 0)),
      );
      const res = await apiPostForm<VerifyResult>("/api/v1/workflow/verify-person", fd);
      setResult(res);
      setStep("result");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
      setStep("face");
    } finally {
      setBusy(false);
    }
  };

  const decide = async (status: "approved" | "under_investigation" | "rejected") => {
    if (!result || !auth) return;
    setBusy(true);
    try {
      const res = await apiPostJson<{ success: boolean; status: string; session_cases: number }>(
        "/api/v1/workflow/update-status",
        {
          risk_id: result.risk_id,
          status,
          description: description || null,
          session_id: auth.session_id,
        },
      );
      if (res.success) {
        toast.success(`Case marked ${status.replace(/_/g, " ")} — ${res.session_cases} case(s) this session`);
        reset();
      } else {
        toast.error("Could not update case status");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />

      {step === "idle" && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileScan className="h-8 w-8" />
          </span>
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-bold">
            Checkpoint ready
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Begin a new screening case by capturing the traveller's identity document.
          </p>
          <Button size="lg" className="mt-8" onClick={() => fileRef.current?.click()}>
            <FilePlus2 className="mr-2 h-4 w-4" /> Start New Case
          </Button>
        </div>
      )}

      {step === "preview" && preview && (
        <div className="rounded-2xl border border-border bg-card p-8">
          <h2 className="text-xl font-semibold">Confirm document</h2>
          <p className="text-sm text-muted-foreground">
            Ensure the whole document is visible and legible before running extraction.
          </p>
          <img
            src={preview}
            alt="Uploaded identity document preview"
            className="mx-auto mt-6 max-h-[420px] rounded-xl border border-border object-contain"
          />
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button onClick={() => void startOcr()}>
              <FileScan className="mr-2 h-4 w-4" /> Start OCR
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Change Document
            </Button>
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {step === "ocr" && (
        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-border bg-card">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            Extracting document data — reading fields, MRZ and security zones…
          </p>
        </div>
      )}

      {step === "extracted" && doc && (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="text-center">
              <Badge variant="outline" className="uppercase tracking-widest">
                {doc.doc_type ?? "unknown"}
              </Badge>
              <h2 className="mt-3 text-xl font-semibold">Extracted document data</h2>
              <p className="text-sm text-muted-foreground">
                Review and correct any field before biometric verification.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input
                    id={f.key}
                    value={(doc[f.key] as string | null) ?? ""}
                    onChange={(e) => setDoc({ ...doc, [f.key]: e.target.value || null })}
                  />
                </div>
              ))}
              {isPassport && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="mrz_no">MRZ</Label>
                  <Textarea
                    id="mrz_no"
                    rows={2}
                    className="font-mono text-xs"
                    value={doc.mrz_no ?? ""}
                    onChange={(e) => setDoc({ ...doc, mrz_no: e.target.value || null })}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                OCR confidence
              </p>
              <p className="mt-1 text-3xl font-semibold text-primary">
                {ocrConfidence !== null ? `${ocrConfidence.toFixed(2)}%` : "—"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Document ID #{docId}</p>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6">
              <Button onClick={() => setStep("face")}>
                <ScanFace className="mr-2 h-4 w-4" /> Start Face Scan
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Upload Again
              </Button>
              <Button variant="ghost" onClick={reset}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "face" && (
        <div className="rounded-2xl border border-border bg-card p-8">
          <h2 className="text-center text-xl font-semibold">Traveller face capture</h2>
          <p className="mb-8 text-center text-sm text-muted-foreground">
            Ask the traveller to face the camera directly, then capture.
          </p>
          <CameraCapture onCapture={(f) => void verifyPerson(f)} busy={busy} label="Capture" />
          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={() => setStep("extracted")}>
              Back to document data
            </Button>
          </div>
        </div>
      )}

      {step === "verifying" && (
        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-border bg-card">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <span className="pulse-ring absolute inset-0 rounded-full border-2 border-primary" />
            <ScanFace className="h-12 w-12 text-primary" />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Matching face against document photo and running tampering forensics…
          </p>
        </div>
      )}

      {step === "result" && result && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Risk assessment</h2>
                <p className="text-sm text-muted-foreground">
                  Verification #{result.verification_id} · Risk #{result.risk_id}
                </p>
              </div>
              <Badge variant="outline" className="ml-auto capitalize">
                {result.status}
              </Badge>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Face match"
                value={pct(result.face_match_score)}
                tone={result.face_match_score >= 0.6 ? "good" : "bad"}
              />
              <Metric label="OCR confidence" value={pct(result.ocr_confidence)} />
              <Metric
                label="Tampering probability"
                value={pct(result.tampering_probability)}
                tone={result.tampering_probability > 50 ? "bad" : "good"}
              />
              {isPassport && (
                <Metric
                  label="MRZ validation"
                  value={result.mrz_validation ? "Valid" : "Invalid"}
                  tone={result.mrz_validation ? "good" : "warn"}
                />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8">
            <Label htmlFor="desc">Officer remarks (optional)</Label>
            <Textarea
              id="desc"
              rows={3}
              className="mt-2"
              placeholder="Add context for this decision…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <Button disabled={busy} onClick={() => void decide("approved")}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void decide("under_investigation")}
              >
                Under Investigation
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => void decide("rejected")}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
