import { createFileRoute } from "@tanstack/react-router";

import { BlockchainRegistry } from "@/components/blockchain";

export const Route = createFileRoute("/admin/register-doc")({
  head: () => ({
    meta: [
      { title: "Register document — Sentinel Admin" },
      {
        name: "description",
        content:
          "Register identity documents on the blockchain ledger and review every on-chain record.",
      },
      { property: "og:title", content: "Register document — Sentinel Admin" },
      {
        property: "og:description",
        content: "Write tamper-proof document hashes to the blockchain and audit the registry.",
      },
    ],
  }),
  component: () => <BlockchainRegistry />,
});
