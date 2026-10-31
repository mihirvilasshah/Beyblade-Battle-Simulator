import type { Metadata } from "next";
import { repository } from "@/data/repository";
import { BeyBrowser } from "@/components/beyblade/BeyBrowser";
import { SectionHeading } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Beyblade Database",
  description: "Search, filter and sort BEYBLADE X Beyblades by type, line, product code, spin direction, weight and stats.",
  alternates: { canonical: "/database" },
};

export default async function DatabasePage() {
  const beys = await repository.listBeyblades();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading
        as="h1"
        eyebrow="Catalog"
        title="Beyblade Database"
        description="Every combo is built from its parts. ATK / DEF / STA are the sum of each part's manufacturer spec; Dash and Burst Resistance come from the Bit."
        className="mb-8"
      />
      <BeyBrowser beys={beys} allowViewToggle />
    </div>
  );
}
