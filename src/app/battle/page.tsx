import type { Metadata } from "next";
import { Suspense } from "react";
import { repository } from "@/data/repository";
import { BattleSetup } from "@/components/battle/BattleSetup";
import { SectionHeading } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Battle Setup",
  description: "Choose Beyblade 1 and Beyblade 2, compare their stats and launch a physics-inspired BEYBLADE X battle.",
  alternates: { canonical: "/battle" },
};

export default async function BattlePage() {
  const beys = await repository.listBeyblades();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading as="h1" eyebrow="Arena" title="Battle Setup" description="Pick two Beyblades, study the matchup, then launch." className="mb-8" />
      <Suspense fallback={<div className="skeleton h-[420px] rounded-2xl" aria-label="Loading battle setup" />}>
        <BattleSetup beys={beys} />
      </Suspense>
    </div>
  );
}
