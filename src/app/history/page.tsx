import type { Metadata } from "next";
import { HistoryList } from "@/components/battle/HistoryList";
import { SectionHeading } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Battle History",
  description: "Your recent simulated BEYBLADE X battles — replay, inspect or delete them.",
  alternates: { canonical: "/history" },
};

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <SectionHeading as="h1" eyebrow="Archive" title="Recent Battles" description="Replay any battle exactly using its stored seed." className="mb-8" />
      <HistoryList />
    </div>
  );
}
