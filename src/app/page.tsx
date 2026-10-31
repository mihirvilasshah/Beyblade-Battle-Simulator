import Link from "next/link";
import { Activity, Database, Fingerprint, ShieldCheck, Swords, Zap } from "lucide-react";
import { repository } from "@/data/repository";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/EmptyState";
import { HeroArena } from "@/components/layout/HeroArena";
import { QuickBattle } from "@/components/battle/QuickBattle";
import { RandomBattleButton } from "@/components/battle/RandomBattleButton";
import { BeyCard } from "@/components/beyblade/BeyCard";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const FEATURED = ["dran-sword-3-60f", "wizard-rod-5-70db", "knight-shield-3-80n", "hells-scythe-4-60t", "phoenix-wing-9-60gf", "dran-brave-s6-60v", "cobalt-dragoon-2-60c", "silver-wolf-3-80fb"];

const FEATURES = [
  { icon: Activity, title: "Physics-inspired engine", body: "Spin decay, momentum, friction, collisions, Xtreme Dash rail boosts, bursts and pocket knockouts — computed step by step." },
  { icon: Fingerprint, title: "Seeded replays", body: "Every battle stores its random seed. Replay reproduces the exact fight; Rematch rolls brand-new launch conditions." },
  { icon: Database, title: "Transparent data", body: "Product codes and names from Takara Tomy, part specs catalogued by the community — every value labelled with its source." },
  { icon: ShieldCheck, title: "Configurable matchups", body: "Attack, Defense, Stamina and Balance modifiers live in a data file so they can be tuned without touching code." },
];

export default async function HomePage() {
  const beys = await repository.listBeyblades();
  const byId = new Map(beys.map((b) => [b.id, b]));
  const left = byId.get("dran-sword-3-60f") ?? beys[0];
  const right = byId.get("phoenix-wing-9-60gf") ?? beys[1];
  const featured = FEATURED.map((id) => byId.get(id)).filter((b) => b !== undefined);
  const options = beys.map(({ id, name, fullName, type, productCode }) => ({ id, name, fullName, type, productCode }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="relative isolate flex min-h-[max(calc(100dvh-4rem),720px)] items-start justify-center overflow-hidden pt-16 sm:pt-24">
        <HeroArena left={left} right={right} />
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <p className="eyebrow animate-rise-in">BEYBLADE X · Battle Arena</p>
          <h1 className="mt-4 font-display text-[clamp(2.6rem,9vw,6.5rem)] font-bold uppercase leading-[0.9] tracking-[0.02em] animate-rise-in">
            <span className="text-gradient">Enter the</span>
            <br />
            <span className="text-fg">Battle</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-fg-muted animate-rise-in sm:text-xl">Choose your Bey. Launch. Dominate.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 animate-rise-in sm:flex-row">
            <ButtonLink href="/battle" variant="hot" size="lg" icon={<Swords className="size-5" aria-hidden />}>
              Start battle
            </ButtonLink>
            <ButtonLink href="/database" variant="secondary" size="lg" icon={<Zap className="size-5" aria-hidden />}>
              Explore Beyblades
            </ButtonLink>
          </div>
          <p className="mt-6 text-xs text-fg-subtle">{beys.length} Beyblades · BX · UX · CX · Physics-inspired simulation</p>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-4 max-w-5xl px-4 sm:-mt-8 sm:px-6">
        <QuickBattle options={options} className="glass" />
        <div className="mt-4 flex justify-center">
          <RandomBattleButton ids={beys.map((b) => b.id)} />
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6" aria-labelledby="features-title">
        <SectionHeading eyebrow="Why it hits different" title={<span id="features-title">Built like a game, grounded in data</span>} />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="panel metal-edge p-5">
              <Icon className="size-6 text-accent" aria-hidden />
              <h3 className="mt-4 font-display text-sm font-bold uppercase tracking-[0.14em]">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6" aria-labelledby="featured-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Roster" title={<span id="featured-title">Featured Beyblades</span>} description="Basic, Unique and Custom Line combos across all four types." />
          <Link href="/database" className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-accent hover:text-accent-strong">
            View all {beys.length} →
          </Link>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((bey) => (
            <li key={bey.id}>
              <BeyCard bey={bey} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
