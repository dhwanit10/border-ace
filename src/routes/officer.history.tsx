import { createFileRoute } from "@tanstack/react-router";

import { useAuthState } from "@/components/app-shell";
import { HistoryView } from "@/components/history-view";

export const Route = createFileRoute("/officer/history")({
  head: () => ({
    meta: [
      { title: "My case history — Sentinel Officer Console" },
      {
        name: "description",
        content: "Review every document screening case you have processed at this checkpoint.",
      },
      { property: "og:title", content: "My case history — Sentinel Officer Console" },
      {
        property: "og:description",
        content: "Searchable log of screened documents, risk scores and decisions.",
      },
    ],
  }),
  component: OfficerHistory,
});

function OfficerHistory() {
  const auth = useAuthState();
  if (!auth) return null;
  return <HistoryView officerId={auth.user_id} />;
}
