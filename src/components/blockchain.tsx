import {
  CheckCircle2,
  Eye,
  ExternalLink,
  FilePlus2,
  FileScan,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  apiGet,
  apiPostForm,
  apiPostJson,
  fetchImageUrl,
  type BlockchainDoc,
  type BlockchainPayload,
  type BlockchainRegisterResult,
  type ExtractedDoc,
} from "@/lib/api";

/* ---------- shared bits ---------- */

export function QrLink({ url, label = "Open transaction" }: { url: string; label?: string }) {
  if (!url) return null;
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 p-4">
      <div className="rounded-lg bg-white p-3">
        <QRCode value={url} size={132} />
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 break-all text-center text-xs font-medium text-primary underline underline-offset-4"
      >
        {label} <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      </a>
    </div>
  );
}

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-all text-sm font-medium">
        {value === null || value === undefined || value === "" ? "—" : value}
      </p>
    </div>
  );
}

const emptyPayload: BlockchainPayload = {
  document_id: 1,
  doc_type: "aadhar",
  doc_number: "",
  full_name: "",
  dob: "",
  gender: "Male",
  nationality: "Indian",
};

/** Reusable ledger-fields editor (doc type, number, name, dob, gender, nationality). */
function PayloadFields({
  value,
  onChange,
}: {
  value: BlockchainPayload;
  onChange: (v: BlockchainPayload) => void;
}) {
  const set = (k: keyof BlockchainPayload, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Document type</Label>
        <Select value={value.doc_type.toLowerCase()} onValueChange={(v) => set("doc_type", v)}>
          <SelectTrigger className="capitalize">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aadhar">Aadhar</SelectItem>
            <SelectItem value="passport">Passport</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bc-num">Document number</Label>
        <Input id="bc-num" value={value.doc_number} onChange={(e) => set("doc_number", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bc-name">Full name</Label>
        <Input id="bc-name" value={value.full_name} onChange={(e) => set("full_name", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bc-dob">Date of birth</Label>
        <Input id="bc-dob" type="date" value={value.dob} onChange={(e) => set("dob", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Gender</Label>
        <Select value={value.gender} onValueChange={(v) => set("gender", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bc-nat">Nationality</Label>
        <Input id="bc-nat" value={value.nationality} onChange={(e) => set("nationality", e.target.value)} />
      </div>
    </div>
  );
}

/* ---------- check on blockchain ---------- */

export function BlockchainCheck() {
  const [payload, setPayload] = useState<BlockchainPayload>(emptyPayload);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);

  const submit = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await apiPostJson<{ result: boolean }>("/api/v1/blockchain/check", {
        ...payload,
        document_id: 1,
      });
      setResult(!!res.result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Blockchain check failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="rounded-2xl border border-border bg-card p-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Verify document on blockchain</h1>
            <p className="text-sm text-muted-foreground">
              Enter the document details exactly as printed to match the on-chain record.
            </p>
          </div>
        </div>
        <div className="mt-8">
          <PayloadFields value={payload} onChange={setPayload} />
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button disabled={busy || !payload.doc_number} onClick={() => void submit()}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Check on chain
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setPayload(emptyPayload);
              setResult(null);
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Ledger result</p>
        {busy && (
          <div className="mt-8 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Querying the ledger…</p>
          </div>
        )}
        {!busy && result === null && (
          <p className="mt-6 text-sm text-muted-foreground">
            Submit the details to compare them against the registered blockchain record.
          </p>
        )}
        {!busy && result === true && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-success/40 bg-success/10 p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
            <p className="text-lg font-semibold text-success">Document verified on blockchain</p>
            <p className="text-xs text-muted-foreground">
              The submitted details match the registered on-chain record.
            </p>
          </div>
        )}
        {!busy && result === false && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center">
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="text-lg font-semibold text-destructive">Details invalid or not registered</p>
            <p className="text-xs text-muted-foreground">
              No matching record was found on the ledger for these details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- registry: list + register ---------- */

type Step = "list" | "preview" | "ocr" | "extracted" | "registering";

export function BlockchainRegistry() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<BlockchainDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<BlockchainDoc | null>(null);
  const [activeImg, setActiveImg] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);

  const [step, setStep] = useState<Step>("list");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [docId, setDocId] = useState<number | null>(null);
  const [ocr, setOcr] = useState<number | null>(null);
  const [payload, setPayload] = useState<BlockchainPayload>(emptyPayload);
  const [registered, setRegistered] = useState<BlockchainRegisterResult | null>(null);

  const load = () => {
    setLoading(true);
    apiGet<BlockchainDoc[]>("/api/v1/blockchain/get-all")
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch((e: unknown) =>
        toast.error(e instanceof Error ? e.message : "Failed to load blockchain records"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = rows.filter((r) => {
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return [r.doc_number, r.canonical_string, r.transaction_hash, String(r.blockchain_document_id)]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(term));
  });

  const openRow = async (row: BlockchainDoc) => {
    setActive(row);
    setActiveImg(null);
    setImgLoading(true);
    const img = await fetchImageUrl(`/api/v1/blockchain/doc-image/${row.blockchain_document_id}`);
    setActiveImg(img);
    setImgLoading(false);
  };

  const reset = () => {
    setStep("list");
    setFile(null);
    setPreview(null);
    setDocId(null);
    setOcr(null);
    setPayload(emptyPayload);
  };

  const pickFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStep("preview");
  };

  const startOcr = async () => {
    if (!file) return;
    setStep("ocr");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiPostForm<{
        doc_id: number;
        extracted_data: ExtractedDoc;
        ocr_confidence: number;
      }>("/api/v1/blockchain/upload-document", fd);
      const d = res.extracted_data;
      setDocId(res.doc_id);
      setOcr(res.ocr_confidence);
      setPayload({
        document_id: res.doc_id,
        doc_type: (d.doc_type ?? "aadhar").toLowerCase(),
        doc_number: d.doc_number ?? "",
        full_name: d.full_name ?? "",
        dob: d.dob ?? "",
        gender: (d.gender ?? "").toLowerCase().startsWith("f") ? "Female" : "Male",
        nationality: d.nationality ?? "Indian",
      });
      setStep("extracted");
      toast.success("Document extracted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "OCR failed");
      setStep("preview");
    }
  };

  const register = async () => {
    setStep("registering");
    try {
      const res = await apiPostJson<BlockchainRegisterResult>("/api/v1/blockchain/register", {
        ...payload,
        document_id: 1,
      });
      setRegistered(res);
      reset();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Registration failed");
      setStep("extracted");
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

      {step === "list" && (
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-5">
            <div>
              <h1 className="text-lg font-semibold">Blockchain document registry</h1>
              <p className="text-sm text-muted-foreground">
                {filtered.length} of {rows.length} registered document(s)
              </p>
            </div>
            <div className="relative ml-auto w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search records…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <FilePlus2 className="mr-2 h-4 w-4" /> Register document
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document number</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    No registered documents found.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                filtered.map((r) => (
                  <TableRow key={r.blockchain_document_id}>
                    <TableCell className="font-medium">{r.doc_number}</TableCell>
                    <TableCell>
                      <a
                        href={r.transaction_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4"
                      >
                        View on explorer <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => void openRow(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
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

      {(step === "ocr" || step === "registering") && (
        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-border bg-card">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            {step === "ocr"
              ? "Extracting document data — reading fields and security zones…"
              : "Writing document hash to the blockchain…"}
          </p>
        </div>
      )}

      {step === "extracted" && (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="text-center">
              <Badge variant="outline" className="uppercase tracking-widest">
                {payload.doc_type}
              </Badge>
              <h2 className="mt-3 text-xl font-semibold">Extracted document data</h2>
              <p className="text-sm text-muted-foreground">
                Review and correct any field before writing it to the ledger.
              </p>
            </div>
            <div className="mt-8">
              <PayloadFields value={payload} onChange={setPayload} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                OCR confidence
              </p>
              <p className="mt-1 text-3xl font-semibold text-primary">
                {ocr !== null ? `${ocr.toFixed(2)}%` : "—"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Document ID #{docId}</p>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6">
              <Button onClick={() => void register()}>
                <ShieldCheck className="mr-2 h-4 w-4" /> Register on blockchain
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

      {/* record details modal */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Blockchain record · {active?.doc_number}</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="grid gap-5 sm:grid-cols-[1.4fr_1fr]">
              <div className="space-y-3">
                <Field label="Record ID" value={`#${active.blockchain_document_id}`} />
                <Field label="Document number" value={active.doc_number} />
                <Field label="Canonical string" value={active.canonical_string} />
                <Field label="Transaction hash" value={active.transaction_hash} />
                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    Registered document image
                  </p>
                  {imgLoading ? (
                    <div className="flex h-40 items-center justify-center rounded-xl border border-border">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : activeImg ? (
                    <img
                      src={activeImg}
                      alt={`Registered document ${active.doc_number}`}
                      className="max-h-72 w-full rounded-xl border border-border object-contain"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Image unavailable.</p>
                  )}
                </div>
              </div>
              <QrLink url={active.transaction_link} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* registration result modal */}
      <Dialog open={!!registered} onOpenChange={(o) => !o && setRegistered(null)}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-success" /> Document registered on blockchain
            </DialogTitle>
          </DialogHeader>
          {registered && (
            <div className="grid gap-5 sm:grid-cols-[1.4fr_1fr]">
              <div className="space-y-3">
                <Field label="Document ID" value={`#${registered.document_id}`} />
                <Field
                  label="Block number"
                  value={
                    <span className="text-destructive">{registered.block_number ?? "—"}</span>
                  }
                />
                <Field label="Canonical string" value={registered.canonical_string} />
                <Field label="Document hash" value={registered.document_hash} />
                <Field label="Transaction hash" value={registered.transaction_hash} />
                <Field label="Contract address" value={registered.contract_address} />
              </div>
              <QrLink url={registered.verify_link} label="Open verification link" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
