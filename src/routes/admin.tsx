import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AppShell
      role="Administrator"
      nav={[
        { label: "Systems", to: "/admin" },
        { label: "Users", to: "/admin/users" },
        { label: "History", to: "/admin/history" },
        { label: "Register Doc", to: "/admin/register-doc" },
        { label: "Check on Chain", to: "/admin/check-chain" },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
