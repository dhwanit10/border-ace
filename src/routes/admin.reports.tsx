import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  FileBarChart2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { apiGet, type HistoryRow } from "@/lib/api";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports & analytics — Border Ace Admin" },
      {
        name: "description",
        content:
          "Screening volume, decision outcomes, officer performance and fraud-risk analytics with date and officer filters.",
      },
      { property: "og:title", content: "Reports & analytics — Border Ace Admin" },
      {
        property: "og:description",
        content: "Visual analytics of document screening, biometric scores and fraud risk trends.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminReports,
});

/* ---------------- helpers ---------------- */

type Preset = "today" | "7d" | "30d" | "all" | "custom";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const norm = (v: number | null | undefined) =>
  v === null || v === undefined ? null : v <= 1 ? v * 100 : v;
const avg = (xs: Array<number | null>) => {
  const v = xs.filter((x): x is number => x !== null && !Number.isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
};
const one = (r: HistoryRow) => r.risks?.[0];
const statusOf = (r: HistoryRow) => (one(r)?.status ?? "pending").toLowerCase();

const C = {
  primary: "var(--primary)",
  success: "var(--success)",
  destructive: "var(--destructive)",
  warning: "var(--warning)",
  chart5: "var(--chart-5)",
  grid: "var(--border)",
  muted: "var(--muted-foreground)",
};

const PIE_COLORS = [C.success, C.destructive, C.warning, C.primary, C.chart5];

/* ---------------- shell pieces ---------------- */

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
  chartRef,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  chartRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={chartRef}
      data-report-card={title}
      className={`rounded-2xl border border-border bg-card p-5 ${className}`}
    >
      <div className="mb-4">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: "primary" | "success" | "destructive" | "warning";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
    warning: "bg-warning/15 text-warning",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    color: "var(--popover-foreground)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--muted-foreground)", fontSize: 11 },
} as const;

const axis = { stroke: "var(--muted-foreground)", fontSize: 11 } as const;

/* ---------------- page ---------------- */

function AdminReports() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [officers, setOfficers] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    apiGet<{ total: number; data: HistoryRow[] }>("/api/v1/data/history")
      .then((d) => setRows(d.data ?? []))
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to load reports"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const range = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    if (preset === "today") return { start, end };
    if (preset === "7d") {
      start.setDate(start.getDate() - 6);
      return { start, end };
    }
    if (preset === "30d") {
      start.setDate(start.getDate() - 29);
      return { start, end };
    }
    if (preset === "custom") {
      const s = from ? new Date(`${from}T00:00:00`) : new Date(0);
      const e = to ? new Date(`${to}T23:59:59`) : end;
      return { start: s, end: e };
    }
    return { start: new Date(0), end };
  }, [preset, from, to]);

  const officerNames = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.officer?.full_name).filter((v): v is string => !!v))).sort(),
    [rows],
  );

  const data = useMemo(
    () =>
      rows.filter((r) => {
        const t = new Date(r.date_time_recorded).getTime();
        if (Number.isNaN(t)) return false;
        if (t < range.start.getTime() || t > range.end.getTime()) return false;
        if (officers.length && !officers.includes(r.officer?.full_name ?? "")) return false;
        return true;
      }),
    [rows, range, officers],
  );

  /* --- aggregations --- */
  const kpis = useMemo(() => {
    const approved = data.filter((r) => statusOf(r) === "approved").length;
    const rejected = data.filter((r) => statusOf(r) === "rejected").length;
    const flagged = data.filter((r) => (norm(one(r)?.tampering_probability) ?? 0) >= 50).length;
    return {
      total: data.length,
      approved,
      rejected,
      pending: data.length - approved - rejected,
      flagged,
      approvalRate: data.length ? (approved / data.length) * 100 : 0,
      face: avg(data.map((r) => norm(one(r)?.face_match_score))),
      ocr: avg(data.map((r) => norm(one(r)?.ocr_confidence))),
      tamper: avg(data.map((r) => norm(one(r)?.tampering_probability))),
      officers: new Set(data.map((r) => r.officer?.full_name)).size,
    };
  }, [data]);

  const daily = useMemo(() => {
    const map = new Map<string, { date: string; approved: number; rejected: number; pending: number }>();
    const days = Math.max(
      1,
      Math.min(
        90,
        Math.round((range.end.getTime() - Math.max(range.start.getTime(), 0)) / 86400000) + 1,
      ),
    );
    const seedFrom = preset === "all" && data.length ? null : range.start;
    if (seedFrom) {
      for (let i = 0; i < days; i++) {
        const d = new Date(seedFrom);
        d.setDate(d.getDate() + i);
        map.set(iso(d), { date: iso(d), approved: 0, rejected: 0, pending: 0 });
      }
    }
    for (const r of data) {
      const k = iso(new Date(r.date_time_recorded));
      const cur = map.get(k) ?? { date: k, approved: 0, rejected: 0, pending: 0 };
      const s = statusOf(r);
      if (s === "approved") cur.approved++;
      else if (s === "rejected") cur.rejected++;
      else cur.pending++;
      map.set(k, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        total: d.approved + d.rejected + d.pending,
        label: new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      }));
  }, [data, range, preset]);

  const decision = useMemo(
    () =>
      [
        { name: "Approved", value: kpis.approved },
        { name: "Rejected", value: kpis.rejected },
        { name: "Pending", value: kpis.pending },
      ].filter((d) => d.value > 0),
    [kpis],
  );

  const byType = useMemo(() => {
    const m = new Map<string, { name: string; approved: number; rejected: number }>();
    for (const r of data) {
      const k = (r.document?.doc_type ?? "unknown").replace(/_/g, " ");
      const cur = m.get(k) ?? { name: k, approved: 0, rejected: 0 };
      if (statusOf(r) === "rejected") cur.rejected++;
      else cur.approved++;
      m.set(k, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.approved + b.rejected - (a.approved + a.rejected));
  }, [data]);

  const byOfficer = useMemo(() => {
    const m = new Map<
      string,
      { name: string; cases: number; rejected: number; face: Array<number | null> }
    >();
    for (const r of data) {
      const k = r.officer?.full_name ?? "Unknown";
      const cur = m.get(k) ?? { name: k, cases: 0, rejected: 0, face: [] };
      cur.cases++;
      if (statusOf(r) === "rejected") cur.rejected++;
      cur.face.push(norm(one(r)?.face_match_score));
      m.set(k, cur);
    }
    return Array.from(m.values())
      .map((o) => ({
        name: o.name,
        cases: o.cases,
        rejected: o.rejected,
        face: Number(avg(o.face).toFixed(1)),
        rejectRate: Number(((o.rejected / o.cases) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.cases - a.cases)
      .slice(0, 8);
  }, [data]);

  const bySystem = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of data) {
      const k = r.system?.system_name ?? "Unknown";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [data]);

  const trend = useMemo(
    () =>
      daily.map((d) => {
        const dayRows = data.filter((r) => iso(new Date(r.date_time_recorded)) === d.date);
        return {
          label: d.label,
          face: Number(avg(dayRows.map((r) => norm(one(r)?.face_match_score))).toFixed(1)),
          ocr: Number(avg(dayRows.map((r) => norm(one(r)?.ocr_confidence))).toFixed(1)),
          tamper: Number(avg(dayRows.map((r) => norm(one(r)?.tampering_probability))).toFixed(1)),
        };
      }),
    [daily, data],
  );

  const radar = useMemo(() => {
    const mrzOk = data.filter((r) => one(r)?.document_specific_validation).length;
    const dbOk = data.filter((r) => one(r)?.database_verification).length;
    const n = data.length || 1;
    return [
      { metric: "Face match", score: Number(kpis.face.toFixed(1)) },
      { metric: "OCR quality", score: Number(kpis.ocr.toFixed(1)) },
      { metric: "MRZ valid", score: Number(((mrzOk / n) * 100).toFixed(1)) },
      { metric: "DB matched", score: Number(((dbOk / n) * 100).toFixed(1)) },
      { metric: "Integrity", score: Number((100 - kpis.tamper).toFixed(1)) },
      { metric: "Approval", score: Number(kpis.approvalRate.toFixed(1)) },
    ];
  }, [data, kpis]);

  const hourly = useMemo(() => {
    const buckets = Array.from({ length: 12 }, (_, i) => ({
      label: `${String(i * 2).padStart(2, "0")}:00`,
      cases: 0,
    }));
    for (const r of data) {
      const h = new Date(r.date_time_recorded).getHours();
      const b = buckets[Math.floor(h / 2)];
      if (b) b.cases++;
    }
    return buckets;
  }, [data]);

  const rangeLabel =
    preset === "all"
      ? "All time"
      : preset === "today"
        ? `Today · ${range.start.toLocaleDateString()}`
        : `${range.start.toLocaleDateString()} — ${range.end.toLocaleDateString()}`;

  const toggleOfficer = (n: string) =>
    setOfficers((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));

  /* --- PDF export --- */
  const exportPdf = async () => {
    if (!sheet.current) return;
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas-pro"),
      ]);
      const cards = Array.from(
        sheet.current.querySelectorAll<HTMLElement>("[data-report-card]"),
      );
      const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const M = 32;
      const bg = getComputedStyle(document.body).backgroundColor;

      // cover header
      pdf.setFillColor(15, 60, 55);
      pdf.rect(0, 0, pw, 96, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.text("Border Ace — Screening Report", M, 44);
      pdf.setFontSize(11);
      pdf.text(rangeLabel, M, 66);
      pdf.text(
        `Officers: ${officers.length ? officers.join(", ") : "All officers"}`,
        M,
        82,
        { maxWidth: pw - M * 2 },
      );
      pdf.setTextColor(30, 30, 30);
      pdf.setFontSize(11);
      let y = 128;
      const summary: Array<[string, string]> = [
        ["Total cases", String(kpis.total)],
        ["Approved", `${kpis.approved} (${kpis.approvalRate.toFixed(1)}%)`],
        ["Rejected", String(kpis.rejected)],
        ["Pending", String(kpis.pending)],
        ["High tampering risk", String(kpis.flagged)],
        ["Avg face match", `${kpis.face.toFixed(1)}%`],
        ["Avg OCR confidence", `${kpis.ocr.toFixed(1)}%`],
        ["Avg tampering probability", `${kpis.tamper.toFixed(1)}%`],
        ["Officers active", String(kpis.officers)],
        ["Generated", new Date().toLocaleString()],
      ];
      pdf.setFontSize(14);
      pdf.text("Executive summary", M, y);
      y += 18;
      pdf.setFontSize(11);
      for (const [k, v] of summary) {
        pdf.setDrawColor(220);
        pdf.line(M, y + 4, pw - M, y + 4);
        pdf.text(k, M, y);
        pdf.text(v, pw - M, y, { align: "right" });
        y += 22;
      }

      for (const card of cards) {
        const canvas = await html2canvas(card, {
          scale: 2,
          backgroundColor: bg,
          logging: false,
        });
        const imgW = pw - M * 2;
        const imgH = (canvas.height / canvas.width) * imgW;
        if (y + imgH > ph - M) {
          pdf.addPage();
          y = M;
        }
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", M, y, imgW, imgH);
        y += imgH + 20;
      }

      const pages = pdf.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(130);
        pdf.text(`Border Ace · ${rangeLabel} · page ${i} of ${pages}`, pw / 2, ph - 16, {
          align: "center",
        });
      }
      pdf.save(`border-ace-report-${iso(new Date())}.pdf`);
      toast.success("Report downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate PDF");
    } finally {
      setExporting(false);
    }
  };

  const presets: Array<{ k: Preset; label: string }> = [
    { k: "today", label: "Today" },
    { k: "7d", label: "Last 7 days" },
    { k: "30d", label: "Last month" },
    { k: "all", label: "All time" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
            Reports &amp; analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading records…" : `${data.length} cases · ${rangeLabel}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => void exportPdf()} disabled={exporting || loading}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      {/* filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
        <span className="mr-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" /> Period
        </span>
        <div className="flex flex-wrap gap-1 rounded-xl bg-muted/60 p-1">
          {presets.map((p) => (
            <button
              key={p.k}
              type="button"
              onClick={() => setPreset(p.k)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                preset === p.k
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant={preset === "custom" ? "default" : "outline"} size="sm">
              Custom range <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-3" align="start">
            <div className="space-y-1.5">
              <Label htmlFor="rep-from">From</Label>
              <Input
                id="rep-from"
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPreset("custom");
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rep-to">To</Label>
              <Input
                id="rep-to"
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPreset("custom");
                }}
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => setPreset("custom")}
              disabled={!from && !to}
            >
              Apply custom range
            </Button>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="mx-1 h-7" />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Users className="mr-1.5 h-3.5 w-3.5" />
              {officers.length ? `${officers.length} officer(s)` : "All officers"}
              <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="max-h-72 w-64 overflow-y-auto p-1" align="start">
            {officerNames.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">No officers in data</p>
            )}
            {officerNames.map((n) => {
              const on = officers.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleOfficer(n)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="truncate">{n}</span>
                  {on && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </PopoverContent>
        </Popover>

        {officers.map((n) => (
          <Badge key={n} variant="outline" className="gap-1 border-primary/40 bg-primary/10">
            {n}
            <button type="button" onClick={() => toggleOfficer(n)} aria-label={`Remove ${n}`}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {(officers.length > 0 || preset !== "30d") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOfficers([]);
              setPreset("30d");
              setFrom("");
              setTo("");
            }}
          >
            <X className="mr-1 h-3.5 w-3.5" /> Reset
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm text-muted-foreground">
          <FileBarChart2 className="h-6 w-6" />
          No cases in the selected period
        </div>
      ) : (
        <div ref={sheet} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-report-card="Key metrics">
            <Kpi
              label="Total cases"
              value={String(kpis.total)}
              hint={`${kpis.officers} officers active`}
              icon={<FileBarChart2 className="h-4 w-4" />}
            />
            <Kpi
              label="Approval rate"
              value={`${kpis.approvalRate.toFixed(1)}%`}
              hint={`${kpis.approved} approved · ${kpis.pending} pending`}
              tone="success"
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <Kpi
              label="Rejected"
              value={String(kpis.rejected)}
              hint={`${kpis.flagged} high tampering risk`}
              tone="destructive"
              icon={<ShieldAlert className="h-4 w-4" />}
            />
            <Kpi
              label="Avg face match"
              value={`${kpis.face.toFixed(1)}%`}
              hint={`OCR ${kpis.ocr.toFixed(1)}% · tamper ${kpis.tamper.toFixed(1)}%`}
              tone="warning"
              icon={<Users className="h-4 w-4" />}
            />
          </div>

          <ChartCard
            title="Screening volume over time"
            subtitle="Daily cases split by decision outcome"
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="gApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.success} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={C.success} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gRejected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.destructive} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={C.destructive} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.warning} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={C.warning} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" {...axis} tickLine={false} />
                <YAxis {...axis} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="approved"
                  name="Approved"
                  stackId="1"
                  stroke={C.success}
                  fill="url(#gApproved)"
                />
                <Area
                  type="monotone"
                  dataKey="rejected"
                  name="Rejected"
                  stackId="1"
                  stroke={C.destructive}
                  fill="url(#gRejected)"
                />
                <Area
                  type="monotone"
                  dataKey="pending"
                  name="Pending"
                  stackId="1"
                  stroke={C.warning}
                  fill="url(#gPending)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Decision breakdown" subtitle="Share of outcomes in period">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={decision}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={64}
                    outerRadius={104}
                    paddingAngle={3}
                    stroke="var(--card)"
                    strokeWidth={2}
                    label={(p: { name?: string; value?: number }) => `${p.name}: ${p.value}`}
                  >
                    {decision.map((d, i) => (
                      <Cell key={d.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Risk profile" subtitle="Composite quality & integrity indicators (%)">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radar} outerRadius={100}>
                  <PolarGrid stroke={C.grid} />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: C.muted, fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: C.muted, fontSize: 10 }} />
                  <Radar
                    dataKey="score"
                    name="Score"
                    stroke={C.primary}
                    fill={C.primary}
                    fillOpacity={0.35}
                  />
                  <Tooltip {...tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Documents by type" subtitle="Cleared vs rejected per document type">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byType}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="name" {...axis} tickLine={false} className="capitalize" />
                  <YAxis {...axis} tickLine={false} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="approved"
                    name="Cleared"
                    stackId="a"
                    fill={C.primary}
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="rejected"
                    name="Rejected"
                    stackId="a"
                    fill={C.destructive}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Cases by workstation" subtitle="Throughput per checkpoint system">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={bySystem} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                  <XAxis type="number" {...axis} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={110} {...axis} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" name="Cases" fill={C.chart5} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard
            title="Officer performance"
            subtitle="Top officers by caseload, rejections and average face-match score"
          >
            <ResponsiveContainer width="100%" height={Math.max(240, byOfficer.length * 46)}>
              <BarChart data={byOfficer} layout="vertical" barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                <XAxis type="number" {...axis} tickLine={false} />
                <YAxis type="category" dataKey="name" width={150} {...axis} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="cases" name="Cases" fill={C.primary} radius={[0, 6, 6, 0]} />
                <Bar dataKey="rejected" name="Rejected" fill={C.destructive} radius={[0, 6, 6, 0]} />
                <Bar dataKey="face" name="Avg face match %" fill={C.success} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Verification quality trend" subtitle="Daily average scores (%)">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="label" {...axis} tickLine={false} />
                  <YAxis domain={[0, 100]} {...axis} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="face"
                    name="Face match"
                    stroke={C.primary}
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="ocr"
                    name="OCR confidence"
                    stroke={C.success}
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="tamper"
                    name="Tampering risk"
                    stroke={C.destructive}
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Checkpoint load by hour" subtitle="Cases grouped in 2-hour windows">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="label" {...axis} tickLine={false} interval={1} />
                  <YAxis {...axis} tickLine={false} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="cases" name="Cases" fill={C.warning} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
