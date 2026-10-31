import type { Metadata } from "next";
import { Suspense } from "react";
import { repository } from "@/data/repository";
import { CompareClient } from "@/components/beyblade/CompareClient";
import { SectionHeading } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Compare Beyblades",
  description: "Compare two BEYBLADE X Beyblades side by side: attack, defense, stamina, weight, dash, burst resistance and type matchup.",
  alternates: { canonical: "/compare" },
};

export default async function ComparePage() {
  const beys = await repository.listBeyblades();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <SectionHeading as="h1" eyebrow="Analysis" title="Compare Beyblades" description="Side-by-side stats and radar profile. Remember: stats shape tendencies, not outcomes." className="mb-8" />
      <Suspense fallback={<div className="skeleton h-[520px] rounded-2xl" aria-label="Loading comparison" />}>
        <CompareClient beys={beys} />
      </Suspense>
    </div>
  );
}
