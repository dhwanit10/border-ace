import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/officer")({
  component: OfficerLayout,
});

function OfficerLayout() {
  return (
    <AppShell
      role="Officer"
      nav={[
        { label: "Start Case", to: "/officer" },
        { label: "History", to: "/officer/history" },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
