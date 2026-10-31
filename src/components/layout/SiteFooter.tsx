import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-fg-muted sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="font-display text-sm font-bold tracking-[0.2em] text-fg">BEYBLADE X — BATTLE ARENA</p>
          <p className="mt-2 max-w-md leading-relaxed">
            A fan-made, physics-inspired battle simulator. Results are simulated for entertainment and analysis and are not
            predictions of real-world matches.
          </p>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-fg-subtle">
            BEYBLADE and BEYBLADE X are trademarks of Takara Tomy. This project is not affiliated with or endorsed by Takara
            Tomy or Hasbro. Beyblade artwork shown here is an original stylised representation.
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="eyebrow mb-3">Arena</p>
          <ul className="space-y-2">
            <li><Link className="hover:text-fg" href="/battle">Battle setup</Link></li>
            <li><Link className="hover:text-fg" href="/database">Beyblade database</Link></li>
            <li><Link className="hover:text-fg" href="/compare">Compare</Link></li>
            <li><Link className="hover:text-fg" href="/history">Battle history</Link></li>
          </ul>
        </nav>
        <div>
          <p className="eyebrow mb-3">Transparency</p>
          <ul className="space-y-2">
            <li><Link className="hover:text-fg" href="/about#sources">Data sources &amp; credits</Link></li>
            <li><Link className="hover:text-fg" href="/about#simulation">How the simulation works</Link></li>
            <li><Link className="hover:text-fg" href="/about#matchups">Type matchups</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
