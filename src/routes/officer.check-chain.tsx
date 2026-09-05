import { createFileRoute } from "@tanstack/react-router";

import { BlockchainCheck } from "@/components/blockchain";

export const Route = createFileRoute("/officer/check-chain")({
  head: () => ({
    meta: [
      { title: "Check on blockchain — Sentinel Officer Console" },
      {
        name: "description",
        content: "Match a traveller's document details against the blockchain ledger.",
      },
      { property: "og:title", content: "Check on blockchain — Sentinel Officer Console" },
      {
        property: "og:description",
        content: "Instantly confirm whether a document is registered on the blockchain.",
      },
    ],
  }),
  component: () => <BlockchainCheck />,
});
