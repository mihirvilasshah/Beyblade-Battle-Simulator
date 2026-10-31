# BEYBLADE X — Battle Arena

A premium, browser-based **physics-inspired** BEYBLADE X battle simulator. Browse a sourced database of Beyblades, compare
two of them, then watch a cinematic, seeded battle play out in an original canvas-rendered stadium.

> Fan-made. Not affiliated with Takara Tomy or Hasbro. Results are **simulated** for entertainment and analysis.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # validates data, then builds
npm run start
```

Other scripts:

| Script                  | Purpose                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| `npm run validate:data` | Validates every JSON record (duplicates, types, stats, parts, images…). |
| `npm run lint`          | ESLint (Next.js core-web-vitals + TypeScript rules).                    |
| `npm run typecheck`     | `tsc --noEmit`.                                                         |
| `npm run sim:report`    | Runs every pairing N times and prints finish / type win-rate balance.   |

`npx tsx scripts/sim-pair.ts <bey-id-1> <bey-id-2> [n]` prints detailed stats for one pairing.

## Deploy to Vercel (free)

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project** and import the repo. The Next.js preset needs no changes.
3. Deploy. Optionally set `NEXT_PUBLIC_SITE_URL` to your production URL for canonical / Open Graph links
   (Vercel's own URL is used automatically otherwise).

No database, API keys or paid services are required — the catalog is static JSON and battle history lives in `localStorage`.

## Architecture

```
data/
  beyblades/beyblades.json   Combos: product code, line, type, spin, weight, part ids, sources
  parts/*.json               One file per category (blades, ratchets, bits, lock chips, main/assist/over/metal blades)
  battles/matchups.json      Configurable type-matchup modifiers
  sources.json               Source registry shown on the About page
scripts/                     validate-data, sim-report, sim-pair
src/
  app/                       Routes: / battle battle/arena database database/[id] compare history about
  components/                ui · layout · beyblade · battle · stadium (canvas renderer) · charts
  data/repository.ts         Data-access interface + static JSON implementation
  engine/                    Pure TypeScript simulation (no React)
  hooks/                     useBattleSimulation, useBattleHistory, useLocalStorage, useMediaQuery
  types/ utils/
```

- **Data access layer** — UI code only talks to `BeybladeRepository` (`src/data/repository.ts`). Swap the static
  implementation for PostgreSQL / Supabase / Firebase without touching components.
- **Simulation engine** — `src/engine/battleEngine.ts` (`simulateBattle`) runs a fixed-step 120 Hz model and returns a
  `BattleResult` (winner, finish, events, 30 fps frames, statistics). Supporting modules: `physics.ts`, `collision.ts`,
  `spinDecay.ts`, `finishDetector.ts`, `random.ts`, `config.ts` (tunable constants), `tournament.ts` (bracket groundwork).
- **Deterministic replays** — every battle has a seed. The loop only uses `+ − × ÷ √`, so the same seed replays
  identically. *Replay* reuses the seed; *Battle again / Rematch* generates a new one.
- **Rendering** — Canvas 2D with a pre-rendered stadium layer, motion blur, trails, sparks, impact rings, shake, zoom and
  slow motion. A *Lite FX* tier is chosen automatically on low-power devices, and `prefers-reduced-motion` disables
  shake / zoom / slow-mo.

## Data provenance

| Label                     | Meaning                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `official`                | Takara Tomy product pages: product codes, names, combo part codes, release dates.        |
| `official-catalogued`     | Manufacturer per-part ATK/DEF/STA/Dash/Burst specs, transcribed by the community wiki.   |
| `community`               | Measured weights, type, spin direction, Hasbro names (Beyblade Wiki).                    |
| `derived`                 | Combo totals (sum of parts) and category-average estimates for unpublished part specs (≈). |

Beyblades are drawn as **original stylised SVG/canvas representations** generated from data — no official artwork is
included. To use your own licensed image, place it under `public/` and set the record's `image` field (the validator
checks the path exists).

## Adding a Beyblade

1. Add any new parts to the matching `data/parts/<category>.json` file (ids like `bit-flat`, `ratchet-3-60`). Use `null`
   for unpublished specs — never guess.
2. Add the combo to `data/beyblades/beyblades.json` referencing those part ids, with `sources` URLs.
3. Run `npm run validate:data`, then optionally `npm run sim:report` to check balance.
