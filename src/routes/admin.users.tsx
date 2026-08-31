import { createFileRoute } from "@tanstack/react-router";
import { Eye, Loader2, Plus, RefreshCw, Search, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CameraCapture } from "@/components/camera-capture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { apiGet, apiPostForm, apiPostJson, fetchImageUrl, type UserItem } from "@/lib/api";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Personnel — Sentinel Admin" },
      {
        name: "description",
        content: "Manage officers and administrators, enrol biometrics and review personnel records.",
      },
      { property: "og:title", content: "Personnel — Sentinel Admin" },
      {
        property: "og:description",
        content: "Create accounts, enrol face biometrics and review checkpoint personnel.",
      },
    ],
  }),
  component: AdminUsers,
});

type NewUser = {
  username: string;
  full_name: string;
  dob: string;
  gender: string;
  aadhar_no: string;
  phone: string;
  email: string;
  user_type: string;
  password: string;
};

const EMPTY: NewUser = {
  username: "",
  full_name: "",
  dob: "",
  gender: "",
  aadhar_no: "",
  phone: "",
  email: "",
  user_type: "officer",
  password: "",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fRole, setFRole] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fBio, setFBio] = useState("all");
  const [active, setActive] = useState<UserItem | null>(null);
  const [faceUrl, setFaceUrl] = useState<string | null>(null);
  const [faceLoading, setFaceLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<NewUser>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [enrolFor, setEnrolFor] = useState<{ user_id: number; username: string } | null>(null);

  const load = () => {
    setLoading(true);
    apiGet<{ users: UserItem[] }>("/api/v1/users/", false)
      .then((d) => setUsers(d.users ?? []))
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return users.filter((u) => {
      if (fRole !== "all" && (u.user_type ?? "") !== fRole) return false;
      if (fStatus !== "all" && (u.status ?? "") !== fStatus) return false;
      if (fBio !== "all" && (u.has_face_image ? "enrolled" : "missing") !== fBio) return false;
      if (!term) return true;
      return [u.username, u.full_name, u.email, u.phone, u.user_type, u.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [users, q, fRole, fStatus, fBio]);

  const roleOpts = useMemo(
    () => Array.from(new Set(users.map((u) => u.user_type).filter(Boolean))).sort(),
    [users],
  );
  const statusOpts = useMemo(
    () => Array.from(new Set(users.map((u) => u.status).filter(Boolean))).sort(),
    [users],
  );

  const activeFilters =
    (q.trim() ? 1 : 0) + [fRole, fStatus, fBio].filter((v) => v !== "all").length;


  const open = async (u: UserItem) => {
    setActive(u);
    setFaceUrl(null);
    setFaceLoading(true);
    setFaceUrl(await fetchImageUrl(`/api/v1/documents/user-face/${u.user_id}`));
    setFaceLoading(false);
  };

  const validate = () => {
    if (!form.username.trim()) return "Username is required";
    if (!form.full_name.trim()) return "Full name is required";
    if (!form.dob) return "Date of birth is required";
    if (!form.gender) return "Select a gender";
    if (!/^\d{12}$/.test(form.aadhar_no)) return "Aadhaar number must be exactly 12 digits";
    if (!/^\d{10}$/.test(form.phone)) return "Phone number must be exactly 10 digits";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Enter a valid email address";
    if (form.password.length < 6) return "Password must be at least 6 characters";
    return null;
  };

  const create = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      const res = await apiPostJson<{ user_id: number; username: string }>(
        "/api/v1/users/create",
        form,
        false,
      );
      toast.success(`User ${res.username} created — enrol their face next`);
      setCreateOpen(false);
      setForm(EMPTY);
      setEnrolFor({ user_id: res.user_id, username: res.username });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create user");
    } finally {
      setBusy(false);
    }
  };

  const uploadFace = async (file: File) => {
    if (!enrolFor) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("user_id", String(enrolFor.user_id));
      fd.append("image", file);
      const res = await apiPostForm<{ success: boolean; message: string }>(
        "/api/v1/users/upload-face",
        fd,
        false,
      );
      if (res.success) {
        toast.success(res.message || "Face image uploaded successfully");
        setEnrolFor(null);
        load();
      } else {
        toast.error(res.message || "Face upload failed");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Face upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Personnel</h1>
          <p className="text-sm text-muted-foreground">{users.length} registered accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search personnel…"
              className="w-56 pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create User
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Biometric</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No personnel found
                </TableCell>
              </TableRow>
            )}
            {filtered.map((u) => (
              <TableRow key={u.user_id}>
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell className="text-muted-foreground">@{u.username}</TableCell>
                <TableCell className="capitalize">{u.user_type}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      u.has_face_image
                        ? "border-success/40 bg-success/15 text-success"
                        : "border-warning/40 bg-warning/15 text-warning"
                    }
                  >
                    {u.has_face_image ? "Enrolled" : "Missing"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2 text-sm capitalize">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        u.status?.toLowerCase() === "online" ? "bg-success" : "bg-muted-foreground"
                      }`}
                    />
                    {u.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="View user details"
                    onClick={() => void open(u)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Details */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{active?.full_name}</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                {faceLoading ? (
                  <div className="flex h-40 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : faceUrl ? (
                  <img
                    src={faceUrl}
                    alt={`Enrolled biometric photo of ${active.full_name}`}
                    className="h-40 w-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <UserRound className="h-8 w-8" />
                    <span className="text-xs">No biometric</span>
                  </div>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Username" value={`@${active.username}`} />
                <Field label="Role" value={active.user_type} />
                <Field label="Date of birth" value={active.dob} />
                <Field label="Gender" value={active.gender} />
                <Field label="Aadhaar" value={active.aadhar_no} />
                <Field label="Phone" value={active.phone} />
                <Field label="Email" value={active.email} />
                <Field label="Status" value={active.status} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create personnel account</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                type="date"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aadhar">Aadhaar number</Label>
              <Input
                id="aadhar"
                inputMode="numeric"
                maxLength={12}
                value={form.aadhar_no}
                onChange={(e) =>
                  setForm({ ...form, aadhar_no: e.target.value.replace(/\D/g, "").slice(0, 12) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                inputMode="numeric"
                maxLength={10}
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Select
                value={form.user_type}
                onValueChange={(v) => setForm({ ...form, user_type: v })}
              >
                <SelectTrigger id="role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="officer">Officer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void create()} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create & enrol face
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Face enrolment */}
      <Dialog open={!!enrolFor} onOpenChange={(o) => !o && setEnrolFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enrol face biometric — @{enrolFor?.username}</DialogTitle>
          </DialogHeader>
          <CameraCapture onCapture={(f) => void uploadFace(f)} busy={busy} label="Capture & enrol" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
