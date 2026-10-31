import type { Metadata } from "next";
import { repository } from "@/data/repository";
import { generateSeed, isValidSeed } from "@/engine/random";
import { BattleExperience } from "@/components/battle/BattleExperience";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Battle Arena",
  description: "Watch a physics-inspired BEYBLADE X battle unfold in the stadium.",
  robots: { index: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const single = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ArenaPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const b1 = single(params.b1);
  const b2 = single(params.b2);
  const seedParam = single(params.seed);
  const [a, b] = await Promise.all([b1 ? repository.getBeyblade(b1) : null, b2 ? repository.getBeyblade(b2) : null]);

  if (!a || !b) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState
          icon="🛑"
          title="Invalid Beyblade"
          description={
            !b1 || !b2
              ? "Two Beyblades are needed to start a battle."
              : "One or both of the selected Beyblades couldn't be found in the database."
          }
          action={
            <ButtonLink href="/battle" variant="primary">
              Choose Beyblades
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const seed = isValidSeed(seedParam) ? seedParam : generateSeed();
  return <BattleExperience key={`${a.id}:${b.id}:${seed}`} beys={[a, b]} initialSeed={seed} intro={single(params.intro) === "random"} />;
}
