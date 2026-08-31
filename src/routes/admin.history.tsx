import { createFileRoute } from "@tanstack/react-router";

import { HistoryView } from "@/components/history-view";

export const Route = createFileRoute("/admin/history")({
  head: () => ({
    meta: [
      { title: "All case history — Sentinel Admin" },
      {
        name: "description",
        content: "Organisation-wide log of every screened document, officer and risk decision.",
      },
      { property: "og:title", content: "All case history — Sentinel Admin" },
      {
        property: "og:description",
        content: "Audit every checkpoint case across officers, systems and sessions.",
      },
    ],
  }),
  component: () => <HistoryView showOfficer />,
});
