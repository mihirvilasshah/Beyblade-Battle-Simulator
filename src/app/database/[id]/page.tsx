import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Swords } from "lucide-react";
import { repository } from "@/data/repository";
import { PART_CATEGORY_LABELS, PART_ORDER } from "@/data/parts";
import type { Beyblade, PartCategory, SourceKind, StatKey } from "@/types/beyblade";
import { statPercent } from "@/utils/calculations";
import { LINE_LABELS, SPIN_LABELS, TYPE_LABELS, formatDate, formatRatchetHeight, formatWeight } from "@/utils/formatting";
import { BeyModelViewer } from "@/components/beyblade/BeyImage";
import { LineBadge, TYPE_VAR, TypeBadge } from "@/components/ui/Badges";
import { StatBar } from "@/components/ui/StatBar";
import { ButtonLink } from "@/components/ui/Button";
import { RadarChart, radarValues } from "@/components/charts/RadarChart";

export const dynamicParams = false;

export async function generateStaticParams() {
  const beys = await repository.listBeyblades();
  return beys.map((b) => ({ id: b.id }));
}

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const bey = await repository.getBeyblade(id);
  if (!bey) return { title: "Beyblade not found" };
  const description = `${bey.fullName} (${bey.productCode}) — ${TYPE_LABELS[bey.type]} type. ATK ${bey.stats.attack}, DEF ${bey.stats.defense}, STA ${bey.stats.stamina}, ${formatWeight(bey.stats.weight)}. ${bey.description}`;
  return {
    title: `${bey.fullName} — ${TYPE_LABELS[bey.type]} Type`,
    description,
    alternates: { canonical: `/database/${bey.id}` },
    openGraph: { title: `${bey.fullName} · BEYBLADE X Battle Arena`, description },
  };
}

const STAT_ROWS: { key: StatKey; label: string; color: string }[] = [
  { key: "attack", label: "Attack", color: "var(--type-attack)" },
  { key: "defense", label: "Defense", color: "var(--type-defense)" },
  { key: "stamina", label: "Stamina", color: "var(--type-stamina)" },
  { key: "dash", label: "Dash", color: "var(--accent)" },
  { key: "burstResistance", label: "Burst Res.", color: "var(--hot)" },
];

const KIND_LABEL: Record<SourceKind, string> = {
  official: "Official",
  "official-catalogued": "Official spec · community catalogued",
  community: "Community",
  derived: "Derived",
};

function PartsTable({ bey }: { bey: Beyblade }) {
  const entries = PART_ORDER.filter((c) => bey.resolvedParts[c]).map((c) => [c, bey.resolvedParts[c]!] as const);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <caption className="sr-only">Parts of {bey.fullName}</caption>
        <thead>
          <tr className="border-b border-border text-left font-display text-[0.62rem] uppercase tracking-[0.16em] text-fg-muted">
            <th scope="col" className="py-2 pr-3">Part</th>
            <th scope="col" className="py-2 pr-3">Name</th>
            <th scope="col" className="py-2 pr-3 text-right">ATK</th>
            <th scope="col" className="py-2 pr-3 text-right">DEF</th>
            <th scope="col" className="py-2 pr-3 text-right">STA</th>
            <th scope="col" className="py-2 pr-3 text-right">Weight</th>
            <th scope="col" className="py-2 text-right">Source</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([category, part]) => (
            <tr key={category} className="border-b border-border/60 last:border-0">
              <th scope="row" className="py-2.5 pr-3 text-left font-display text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-fg-muted">
                {PART_CATEGORY_LABELS[category as PartCategory]}
              </th>
              <td className="py-2.5 pr-3 font-semibold">
                {part.name}
                {part.abbreviation && <span className="ml-1.5 text-fg-subtle">({part.abbreviation})</span>}
                {category === "ratchet" && part.height && <span className="ml-1.5 text-xs text-fg-subtle">{formatRatchetHeight(part.height)}</span>}
                {category === "bit" && (
                  <span className="block text-xs font-normal text-fg-muted">
                    Dash {part.stats.dash ?? "—"} · Burst Res. {part.stats.burstResistance ?? "—"}
                  </span>
                )}
              </td>
              {(["attack", "defense", "stamina"] as const).map((k) => (
                <td key={k} className="py-2.5 pr-3 text-right tabular-nums">
                  {category === "lockChip" ? <span className="text-fg-subtle">—</span> : (part.stats[k] ?? <span title="Not published — estimated in combo totals" className="text-fg-subtle">n/a</span>)}
                </td>
              ))}
              <td className="py-2.5 pr-3 text-right tabular-nums">{part.weight !== null ? formatWeight(part.weight) : "—"}</td>
              <td className="py-2.5 text-right">
                <a href={part.sources[0]?.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-strong">
                  Wiki <ExternalLink className="size-3" aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function BeybladeDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const bey = await repository.getBeyblade(id);
  if (!bey) notFound();
  const color = TYPE_VAR[bey.type];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link href="/database" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Back to database
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
        <div className="relative mx-auto w-full max-w-[460px]">
          <div aria-hidden className="absolute inset-[10%] rounded-full blur-3xl" style={{ background: color, opacity: 0.3 }} />
          <div aria-hidden className="absolute inset-0 rounded-full border border-border/70" />
          <div aria-hidden className="absolute inset-[6%] rounded-full border border-dashed border-border/60" />
          <BeyModelViewer
            visual={bey.visual}
            type={bey.type}
            spin={bey.spinDirection}
            ratchet={bey.resolvedParts.ratchet.name}
            label={`Stylised 3D model of ${bey.fullName}`}
            className="relative mx-auto w-full"
          />
          <p className="mt-3 text-center text-[0.7rem] text-fg-subtle">Original stylised 3D representation — not official product artwork. Move your pointer to tilt.</p>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={bey.type} size="md" />
            <LineBadge line={bey.line} />
            <span className="font-display text-xs font-semibold tracking-[0.14em] text-fg-subtle">{bey.productCode}</span>
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-[0.04em] sm:text-5xl">{bey.name}</h1>
          <p className="mt-1 font-display text-lg font-semibold tracking-[0.12em] text-fg-muted">
            {bey.comboCode}
            <span className="ml-3 text-sm font-normal tracking-normal">{TYPE_LABELS[bey.type]} Type</span>
          </p>
          <p className="mt-4 max-w-xl leading-relaxed text-fg-muted">{bey.description}</p>

          <div className="mt-6 space-y-2.5">
            {STAT_ROWS.map((row, i) => (
              <StatBar
                key={row.key}
                label={row.label}
                value={bey.stats[row.key]}
                percent={statPercent(row.key, bey.stats[row.key])}
                color={row.color}
                estimated={bey.estimated.includes(row.key)}
                delay={i * 80}
              />
            ))}
          </div>
          {bey.estimated.length > 0 && (
            <p className="mt-3 text-xs text-fg-subtle">≈ Some part specs are unpublished; these totals include a derived estimate (category average).</p>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Weight", `${formatWeight(bey.stats.weight)}${bey.estimated.includes("weight") ? " ≈" : ""}`],
              ["Height", formatRatchetHeight(bey.stats.height)],
              ["Spin", SPIN_LABELS[bey.spinDirection]],
              ["Released", formatDate(bey.releaseDate)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border bg-surface p-3">
                <dt className="font-display text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-fg-muted">{k}</dt>
                <dd className="mt-1 font-display text-base font-bold">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href={`/battle?b1=${bey.id}`} variant="hot" size="lg" icon={<Swords className="size-5" aria-hidden />}>
              Simulate battle
            </ButtonLink>
            <ButtonLink href={`/compare?a=${bey.id}`} variant="secondary" size="lg">
              Compare
            </ButtonLink>
          </div>
        </div>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="panel min-w-0 p-5 sm:p-6" aria-labelledby="parts-title">
          <h2 id="parts-title" className="font-display text-lg font-bold uppercase tracking-[0.14em]">
            Parts
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            {LINE_LABELS[bey.line]} · {bey.line === "CX" ? "Lock Chip + Blade parts + Assist Blade" : "Blade"} + Ratchet + Bit
            {bey.hasbroName && <> · Hasbro name: {bey.hasbroName}</>}
          </p>
          <div className="mt-4">
            <PartsTable bey={bey} />
          </div>
        </section>
        <section className="panel min-w-0 p-5 sm:p-6" aria-labelledby="profile-title">
          <h2 id="profile-title" className="font-display text-lg font-bold uppercase tracking-[0.14em]">
            Profile
          </h2>
          <RadarChart className="mx-auto mt-2 w-full max-w-[280px]" series={[{ label: bey.name, color, values: radarValues(bey) }]} />
        </section>
      </div>

      <section className="panel mt-6 p-5 sm:p-6" aria-labelledby="sources-title">
        <h2 id="sources-title" className="font-display text-lg font-bold uppercase tracking-[0.14em]">
          Data provenance
        </h2>
        <ul className="mt-4 space-y-3 text-sm">
          {bey.sources.map((s) => (
            <li key={s.url} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="rounded border border-border px-1.5 py-0.5 font-display text-[0.6rem] font-bold uppercase tracking-[0.14em] text-fg-muted">{KIND_LABEL[s.kind]}</span>
              <span className="text-fg-muted">{s.fields.join(", ")}</span>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-accent hover:text-accent-strong">
                {new URL(s.url).hostname}
                <ExternalLink className="size-3" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
          <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="rounded border border-border px-1.5 py-0.5 font-display text-[0.6rem] font-bold uppercase tracking-[0.14em] text-fg-muted">{KIND_LABEL.derived}</span>
            <span className="text-fg-muted">Combined ATK / DEF / STA totals{bey.estimated.length ? `, estimates for ${bey.estimated.join(", ")}` : ""}</span>
            <Link href="/about#sources" className="text-accent hover:text-accent-strong">
              How stats are combined
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
