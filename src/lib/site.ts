const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");

export const SITE_NAME = "BEYBLADE X Battle Arena";
export const SITE_TITLE = "BEYBLADE X Battle Arena — Simulate Epic Beyblade Battles";
export const SITE_DESCRIPTION =
  "Choose two Beyblades, compare their stats and simulate an epic physics-inspired BEYBLADE X battle.";
