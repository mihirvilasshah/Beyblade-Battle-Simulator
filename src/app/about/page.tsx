import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { repository } from "@/data/repository";
import { matchupDescription } from "@/data/matchups";
import type { BeyType } from "@/types/beyblade";
import { TYPE_LABELS } from "@/utils/formatting";
import { SectionHeading } from "@/components/ui/EmptyState";
import { TYPE_TEXT } from "@/components/ui/Badges";

export const metadata: Metadata = {
  title: "About & Data Sources",
  description: "Where the BEYBLADE X data comes from, how combo stats are derived, and how the physics-inspired battle simulation works.",
  alternates: { canonical: "/about" },
};

const TYPES: BeyType[] = ["attack", "defense", "stamina", "balance"];

const KINDS = [
  ["Official", "Read directly from Takara Tomy's official BEYBLADE X product pages: product codes, names, combo part codes and release dates."],
  ["Official spec · community catalogued", "Per-part Attack / Defense / Stamina / Dash / Burst Resistance figures published by the manufacturer, transcribed by the community Beyblade Wiki."],
  ["Community", "Measured weights, type, spin direction and Hasbro names maintained by the community."],
  ["Derived", "Computed by this app: combo totals (sum of part specs) and category-average estimates where a part spec is unpublished. Marked with ≈."],
] as const;

export default async function AboutPage() {
  const [sources, matchups, beys, parts] = await Promise.all([
    repository.listSources(),
    repository.getMatchups(),
    repository.listBeyblades(),
    repository.listParts(),
  ]);
  const estimatedCount = beys.filter((b) => b.estimated.length > 0).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <SectionHeading as="h1" eyebrow="Transparency" title="About BEYBLADE X Battle Arena" description="A fan-made, physics-inspired battle simulator. Here is exactly where the data comes from and how battles are simulated." />

      <section id="sources" className="mt-12 scroll-mt-24" aria-labelledby="sources-title">
        <h2 id="sources-title" className="font-display text-xl font-bold uppercase tracking-[0.12em]">
          Data sources &amp; credits
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {sources.map((s) => (
            <article key={s.id} className="panel p-5">
              <p className="eyebrow">{s.kind}</p>
              <h3 className="mt-2 font-display text-sm font-bold uppercase tracking-[0.1em]">{s.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{s.usedFor}</p>
              <p className="mt-2 text-xs text-fg-subtle">{s.license}</p>
              {s.url.startsWith("http") && (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:text-accent-strong">
                  {new URL(s.url).hostname} <ExternalLink className="size-3.5" aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </article>
          ))}
        </div>

        <div className="panel mt-4 p-5">
          <h3 className="font-display text-sm font-bold uppercase tracking-[0.14em]">How every value is labelled</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {KINDS.map(([k, v]) => (
              <div key={k}>
                <dt className="font-semibold">{k}</dt>
                <dd className="text-sm leading-relaxed text-fg-muted">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-fg-muted">
            The catalog currently holds <strong className="text-fg">{beys.length}</strong> Beyblades built from <strong className="text-fg">{parts.length}</strong> parts.{" "}
            {estimatedCount} combo{estimatedCount === 1 ? "" : "s"} include a part whose spec has not been published; those totals are marked ≈. Source
            URLs are stored with every record and shown on each Beyblade&apos;s detail page.
          </p>
        </div>

        <div className="panel mt-4 p-5 text-sm leading-relaxed text-fg-muted">
          <h3 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-fg">Images</h3>
          <p className="mt-2">
            No official product photography is reproduced. Every Beyblade is an <strong className="text-fg">original stylised 3D model</strong>{" "}
            generated from its data (type, blade count, colours, ratchet) and rendered with Three.js, with a flat 2D version as a fallback. The
            stadium is an original design inspired by the mechanical aesthetic of spinning-top arenas.
          </p>
          <p className="mt-2 text-xs text-fg-subtle">
            BEYBLADE and BEYBLADE X are trademarks of Takara Tomy. This project is not affiliated with, sponsored by or endorsed by Takara Tomy or Hasbro.
          </p>
        </div>
      </section>

      <section id="simulation" className="mt-14 scroll-mt-24" aria-labelledby="sim-title">
        <h2 id="sim-title" className="font-display text-xl font-bold uppercase tracking-[0.12em]">
          Physics-inspired battle simulation
        </h2>
        <div className="panel mt-4 space-y-3 p-5 text-sm leading-relaxed text-fg-muted">
          <p>
            This application uses a custom physics-inspired simulation. It is an <strong className="text-fg">entertainment and analysis tool</strong> and does
            not reproduce real-world Beyblade physics exactly. Results are labelled <strong className="text-fg">Simulated Result</strong> and are not predictions
            of real matches.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>A fixed-step (120 Hz) 2D physics model of a bowl-shaped stadium with an Xtreme Line rail, one Xtreme pocket and two Over pockets, rendered in 3D.</li>
            <li>Each Bey has spin, velocity, momentum, wobble and ratchet-click state. Spin decays with stamina, tip friction, wobble and dashing.</li>
            <li>Bits with high Dash can catch the rail and perform Xtreme Dashes. Aggressive tips cut across the stadium in a flower pattern.</li>
            <li>Collisions combine approach speed, spin, attack, weight, defense, spin direction (same vs. opposite) and the type matchup modifiers below.</li>
            <li>Finishes: Survivor (outspin), Knockout (Over pocket), Xtreme (Xtreme pocket) and Burst (enough ratchet clicks from strong hits).</li>
            <li>Launch power, tilt, start position, per-battle condition and many collision details are randomised from a seed.</li>
          </ul>
          <p>
            <strong className="text-fg">Replay</strong> re-runs the same seed and reproduces the identical battle. <strong className="text-fg">Rematch / Battle Again</strong>{" "}
            picks a new seed. Higher stats never guarantee a win — the engine is tuned so every type can beat every other type.
          </p>
        </div>
      </section>

      <section id="matchups" className="mt-14 scroll-mt-24" aria-labelledby="matchups-title">
        <h2 id="matchups-title" className="font-display text-xl font-bold uppercase tracking-[0.12em]">
          Type matchups
        </h2>
        <p className="mt-2 text-sm text-fg-muted">{matchupDescription}</p>
        <div className="panel mt-4 overflow-x-auto p-2 sm:p-4">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Type matchup modifiers: impact / knockback / spin drain applied when the row type strikes the column type</caption>
            <thead>
              <tr>
                <th scope="col" className="p-2 text-left font-display text-[0.62rem] uppercase tracking-[0.16em] text-fg-muted">
                  Striker → Target
                </th>
                {TYPES.map((t) => (
                  <th key={t} scope="col" className={`p-2 text-left font-display text-[0.7rem] uppercase tracking-[0.14em] ${TYPE_TEXT[t]}`}>
                    {TYPE_LABELS[t]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TYPES.map((row) => (
                <tr key={row} className="border-t border-border">
                  <th scope="row" className={`p-2 text-left font-display text-[0.7rem] uppercase tracking-[0.14em] ${TYPE_TEXT[row]}`}>
                    {TYPE_LABELS[row]}
                  </th>
                  {TYPES.map((col) => {
                    const m = matchups[row][col];
                    return (
                      <td key={col} className="p-2 font-mono text-xs tabular-nums text-fg-muted">
                        {m.impact.toFixed(2)} / {m.knockback.toFixed(2)} / {m.spinDrain.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-2 pt-3 text-xs text-fg-subtle">Values: impact / knockback / spin drain. Edit data/battles/matchups.json to tune them.</p>
        </div>
      </section>
    </div>
  );
}
