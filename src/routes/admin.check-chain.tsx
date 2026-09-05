import { createFileRoute } from "@tanstack/react-router";

import { BlockchainCheck } from "@/components/blockchain";

export const Route = createFileRoute("/admin/check-chain")({
  head: () => ({
    meta: [
      { title: "Check on blockchain — Sentinel Admin" },
      {
        name: "description",
        content: "Match document details against the blockchain ledger to detect tampering.",
      },
      { property: "og:title", content: "Check on blockchain — Sentinel Admin" },
      {
        property: "og:description",
        content: "Instantly confirm whether a document is registered on the blockchain.",
      },
    ],
  }),
  component: () => <BlockchainCheck />,
});
