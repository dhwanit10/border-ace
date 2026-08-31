import { createFileRoute } from "@tanstack/react-router";
import { Loader2, MonitorCog, Plus, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuthState } from "@/components/app-shell";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet, apiPostJson, type SystemItem, type UserItem } from "@/lib/api";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Workstations — Sentinel Admin" },
      {
        name: "description",
        content: "Monitor checkpoint workstations, their live status, owners and active sessions.",
      },
      { property: "og:title", content: "Workstations — Sentinel Admin" },
      {
        property: "og:description",
        content: "Provision and monitor border checkpoint workstations and sessions.",
      },
    ],
  }),
  component: AdminSystems,
});

const dt = (v: string | null) => (v ? new Date(v).toLocaleString() : "—");

function AdminSystems() {
  const auth = useAuthState();
  const [systems, setSystems] = useState<SystemItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [sessionsOf, setSessionsOf] = useState<SystemItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiGet<{ systems: SystemItem[] }>("/api/v1/system/get", false),
      apiGet<{ users: UserItem[] }>("/api/v1/users/", false),
    ])
      .then(([s, u]) => {
        setSystems(s.systems ?? []);
        setUsers(u.users ?? []);
      })
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to load systems"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const ownerOf = (id: number) => users.find((u) => u.user_id === id);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return systems
      .filter((s) => (tab === "all" ? true : s.status?.toLowerCase() === tab))
      .filter((s) => (term ? s.system_name.toLowerCase().includes(term) : true));
  }, [systems, tab, q]);

  const create = async () => {
    if (!name.trim() || !auth) return;
    setBusy(true);
    try {
      await apiPostJson("/api/v1/system/create", {
        system_name: name.trim(),
        primary_owner_id: auth.user_id,
      });
      toast.success("Workstation created");
      setCreateOpen(false);
      setName("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create workstation");
    } finally {
      setBusy(false);
    }
  };

  const counts = {
    online: systems.filter((s) => s.status?.toLowerCase() === "online").length,
    offline: systems.filter((s) => s.status?.toLowerCase() === "offline").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
            Checkpoint workstations
          </h1>
          <p className="text-sm text-muted-foreground">
            {counts.online} online · {counts.offline} offline · {systems.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search workstations…"
              className="w-56 pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create System
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="online">Online</TabsTrigger>
          <TabsTrigger value="offline">Offline</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
          No workstations found
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => {
            const owner = ownerOf(s.primary_owner_id);
            const online = s.status?.toLowerCase() === "online";
            const active = s.sessions?.filter((x) => !x.end_time).length ?? 0;
            return (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MonitorCog className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold">{s.system_name}</p>
                      <p className="text-xs text-muted-foreground">System #{s.id}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      online
                        ? "border-success/40 bg-success/15 text-success"
                        : "border-border text-muted-foreground"
                    }
                  >
                    {s.status}
                  </Badge>
                </div>

                <div className="mt-5 rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Primary owner
                  </p>
                  <p className="mt-1 text-sm font-medium">{owner?.full_name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{owner?.email ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{owner?.phone ?? "—"}</p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {s.sessions?.length ?? 0} sessions · {active} active
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setSessionsOf(s)}>
                    View sessions
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!sessionsOf} onOpenChange={(o) => !o && setSessionsOf(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sessions — {sessionsOf?.system_name}</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Officer</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Cases</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sessionsOf?.sessions ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>#{s.id}</TableCell>
                  <TableCell>{ownerOf(s.officer_id)?.full_name ?? `User #${s.officer_id}`}</TableCell>
                  <TableCell>{dt(s.start_time)}</TableCell>
                  <TableCell>{s.end_time ? dt(s.end_time) : "—"}</TableCell>
                  <TableCell>{s.no_of_cases}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        s.end_time
                          ? "border-border text-muted-foreground"
                          : "border-success/40 bg-success/15 text-success"
                      }
                    >
                      {s.end_time ? "Closed" : "Active"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(sessionsOf?.sessions?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No sessions recorded
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create workstation</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sysname">System name</Label>
            <Input
              id="sysname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SYS-002"
            />
            <p className="text-xs text-muted-foreground">
              Primary owner will be set to your account (#{auth?.user_id}).
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void create()} disabled={busy || !name.trim()}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
