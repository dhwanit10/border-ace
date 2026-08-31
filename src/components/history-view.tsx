import { Eye, Loader2, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { apiGet, fetchImageUrl, type HistoryRow } from "@/lib/api";

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[170px] capitalize" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="capitalize">
            {o.replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}


export function StatusBadge({ status }: { status: string }) {
  const s = (status ?? "").toLowerCase();
  const cls =
    s === "approved"
      ? "border-success/40 bg-success/15 text-success"
      : s === "rejected"
        ? "border-destructive/40 bg-destructive/15 text-destructive"
        : "border-warning/40 bg-warning/15 text-warning";
  return (
    <Badge variant="outline" className={`${cls} capitalize`}>
      {s.replace(/_/g, " ") || "unknown"}
    </Badge>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm font-medium">
        {value === null || value === undefined || value === "" ? "—" : value}
      </p>
    </div>
  );
}

const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${(v <= 1 ? v * 100 : v).toFixed(2)}%`;

const dt = (v: string | null) => (v ? new Date(v).toLocaleString() : "—");

export function HistoryView({
  officerId,
  showOfficer,
}: {
  officerId?: number | null;
  showOfficer?: boolean;
}) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fSystem, setFSystem] = useState("all");
  const [fOfficer, setFOfficer] = useState("all");
  const [active, setActive] = useState<HistoryRow | null>(null);
  const [docImg, setDocImg] = useState<string | null>(null);
  const [personImg, setPersonImg] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const path =
      officerId != null ? `/api/v1/data/history?officer_id=${officerId}` : `/api/v1/data/history`;
    apiGet<{ total: number; data: HistoryRow[] }>(path)
      .then((d) => setRows(d.data ?? []))
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to load history"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [officerId]);

  const uniq = (vals: Array<string | null | undefined>) =>
    Array.from(new Set(vals.filter((v): v is string => !!v))).sort();

  const typeOpts = useMemo(() => uniq(rows.map((r) => r.document?.doc_type)), [rows]);
  const statusOpts = useMemo(() => uniq(rows.map((r) => r.risks?.[0]?.status)), [rows]);
  const systemOpts = useMemo(() => uniq(rows.map((r) => r.system?.system_name)), [rows]);
  const officerOpts = useMemo(() => uniq(rows.map((r) => r.officer?.full_name)), [rows]);

  const resetFilters = () => {
    setQ("");
    setFType("all");
    setFStatus("all");
    setFSystem("all");
    setFOfficer("all");
  };

  const activeFilters =
    (q.trim() ? 1 : 0) +
    [fType, fStatus, fSystem, fOfficer].filter((v) => v !== "all").length;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (fType !== "all" && r.document?.doc_type !== fType) return false;
      if (fStatus !== "all" && (r.risks?.[0]?.status ?? "") !== fStatus) return false;
      if (fSystem !== "all" && r.system?.system_name !== fSystem) return false;
      if (fOfficer !== "all" && r.officer?.full_name !== fOfficer) return false;
      if (!term) return true;
      return [
        r.document?.doc_number,
        r.document?.doc_type,
        r.document?.full_name,
        r.system?.system_name,
        r.officer?.full_name,
        r.officer?.username,
        r.risks?.[0]?.status,
        String(r.verification_id),
        r.date_time_recorded,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [rows, q, fType, fStatus, fSystem, fOfficer]);


  const open = async (row: HistoryRow) => {
    setActive(row);
    setDocImg(null);
    setPersonImg(null);
    setImgLoading(true);
    const id = row.document.id;
    const [d, p] = await Promise.all([
      fetchImageUrl(`/api/v1/documents/photo/${id}`),
      fetchImageUrl(`/api/v1/documents/person-image/${id}`),
    ]);
    setDocImg(d);
    setPersonImg(p);
    setImgLoading(false);
  };

  const risk = active?.risks?.[0];
  const isPassport = (active?.document?.doc_type ?? "").toLowerCase() === "passport";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
            Case history
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading records…" : `${filtered.length} of ${rows.length} records`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search any column…"
              className="w-64 pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Document no.</TableHead>
              <TableHead>Type</TableHead>
              {showOfficer && <TableHead>Officer</TableHead>}
              <TableHead>System</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={showOfficer ? 6 : 5} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={showOfficer ? 6 : 5}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No records found
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.verification_id}>
                <TableCell className="font-medium">{r.document?.doc_number ?? "—"}</TableCell>
                <TableCell className="capitalize">{r.document?.doc_type ?? "—"}</TableCell>
                {showOfficer && (
                  <TableCell>
                    <span className="font-medium">{r.officer?.full_name}</span>
                    <span className="block text-xs text-muted-foreground">
                      @{r.officer?.username}
                    </span>
                  </TableCell>
                )}
                <TableCell>{r.system?.system_name ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={r.risks?.[0]?.status ?? "pending"} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="View case details"
                    onClick={() => void open(r)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Case #{active?.verification_id}
              <StatusBadge status={risk?.status ?? "pending"} />
            </DialogTitle>
          </DialogHeader>

          {active && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    Document image
                  </p>
                  {imgLoading ? (
                    <div className="flex h-44 items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : docImg ? (
                    <img
                      src={docImg}
                      alt="Scanned identity document"
                      className="h-44 w-full rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
                      Not available
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    Live person capture
                  </p>
                  {imgLoading ? (
                    <div className="flex h-44 items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : personImg ? (
                    <img
                      src={personImg}
                      alt="Person captured during verification"
                      className="h-44 w-full rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
                      Not available
                    </div>
                  )}
                </div>
              </div>

              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Document details
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Full name" value={active.document.full_name} />
                  <Field label="Document number" value={active.document.doc_number} />
                  <Field label="Document type" value={active.document.doc_type} />
                  <Field label="Gender" value={active.document.gender} />
                  <Field label="Nationality" value={active.document.nationality} />
                  <Field label="Date of birth" value={active.document.dob} />
                  <Field label="Issue date" value={active.document.issue_date} />
                  <Field label="Expiry date" value={active.document.expiry_date} />
                  <Field label="Address" value={active.document.address} />
                  {isPassport && (
                    <div className="sm:col-span-3">
                      <Field
                        label="MRZ"
                        value={
                          active.document.mrz_no ? (
                            <span className="whitespace-pre-wrap font-mono text-xs">
                              {active.document.mrz_no}
                            </span>
                          ) : null
                        }
                      />
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Risk assessment
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Face match score" value={pct(risk?.face_match_score)} />
                  <Field label="OCR confidence" value={pct(risk?.ocr_confidence)} />
                  <Field label="Tampering probability" value={pct(risk?.tampering_probability)} />
                  {isPassport && (
                    <Field label="MRZ validation" value={risk?.mrz_validation ? "Valid" : "Invalid"} />
                  )}
                  <Field
                    label="Database verification"
                    value={risk?.database_verification ? "Matched" : "Not matched"}
                  />
                  <Field label="Approved" value={risk?.approved ? "Yes" : "No"} />
                  <div className="sm:col-span-3">
                    <Field label="Officer remarks" value={risk?.description} />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Session & attribution
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Officer" value={active.officer?.full_name} />
                  <Field label="Username" value={`@${active.officer?.username}`} />
                  <Field label="Officer status" value={active.officer?.status} />
                  <Field label="System" value={active.system?.system_name} />
                  <Field label="Session ID" value={`#${active.session?.id}`} />
                  <Field label="Cases in session" value={active.session?.no_of_cases} />
                  <Field label="Session start" value={dt(active.session?.start_time ?? null)} />
                  <Field
                    label="Session end"
                    value={active.session?.end_time ? dt(active.session.end_time) : "Active"}
                  />
                  <Field label="Recorded at" value={dt(active.date_time_recorded)} />
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
