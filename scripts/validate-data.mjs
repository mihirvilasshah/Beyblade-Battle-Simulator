#!/usr/bin/env node
/**
 * Validates the static Beyblade database. Exits with code 1 on any error.
 * Usage: npm run validate:data
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const TYPES = ["attack", "defense", "stamina", "balance"];
const LINES = ["BX", "UX", "CX"];
const SPINS = ["right", "left"];
const SOURCE_KINDS = ["official", "official-catalogued", "community", "derived"];
const PART_FILES = {
  blade: "blades",
  lockChip: "lock-chips",
  mainBlade: "main-blades",
  assistBlade: "assist-blades",
  overBlade: "over-blades",
  metalBlade: "metal-blades",
  ratchet: "ratchets",
  bit: "bits",
};

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const isFiniteNumber = (v) => typeof v === "number" && Number.isFinite(v);
const isHttpsUrl = (v) => typeof v === "string" && /^https:\/\/[^\s]+$/.test(v);

const sources = read("data/sources.json");
const sourceIds = new Set(sources.map((s) => s.id));

function validateSourceRefs(where, refs) {
  if (!Array.isArray(refs) || refs.length === 0) return err(where, "missing sources");
  refs.forEach((ref, i) => {
    const at = `${where}.sources[${i}]`;
    if (!sourceIds.has(ref.sourceId)) err(at, `unknown sourceId "${ref.sourceId}"`);
    if (!isHttpsUrl(ref.url)) err(at, `invalid url "${ref.url}"`);
    if (!SOURCE_KINDS.includes(ref.kind)) err(at, `invalid kind "${ref.kind}"`);
    if (!Array.isArray(ref.fields) || ref.fields.length === 0) err(at, "fields must list the data it supports");
  });
}

// ---------- Parts ----------
const parts = new Map();
const usedParts = new Set();
for (const [category, file] of Object.entries(PART_FILES)) {
  const list = read(`data/parts/${file}.json`);
  if (!Array.isArray(list)) {
    err(file, "must be an array");
    continue;
  }
  for (const [i, part] of list.entries()) {
    const at = `parts/${file}[${i}] ${part?.id ?? "?"}`;
    if (!isNonEmptyString(part.id)) err(at, "missing id");
    else if (parts.has(part.id)) err(at, `duplicate part id "${part.id}"`);
    if (part.category !== category) err(at, `category "${part.category}" does not match file (${category})`);
    if (!isNonEmptyString(part.name)) err(at, "missing name");
    if (part.type !== null && !TYPES.includes(part.type)) err(at, `invalid type "${part.type}"`);
    if (part.weight !== null && (!isFiniteNumber(part.weight) || part.weight <= 0 || part.weight > 60))
      err(at, `invalid weight ${part.weight}`);
    if (category === "ratchet" && (!isFiniteNumber(part.height) || part.height < 40 || part.height > 100))
      err(at, `invalid ratchet height ${part.height}`);
    const stats = part.stats ?? {};
    const statKeys = ["attack", "defense", "stamina", ...(category === "bit" ? ["dash", "burstResistance"] : [])];
    for (const key of statKeys) {
      const v = stats[key];
      if (v === undefined) err(at, `missing stat "${key}" (use null if unknown)`);
      else if (v !== null && (!isFiniteNumber(v) || v < 0 || v > 100)) err(at, `invalid stat ${key}=${v}`);
      else if (v === null && category !== "lockChip") warn(at, `stat "${key}" unknown - simulation will use a derived estimate`);
    }
    validateSourceRefs(at, part.sources);
    parts.set(part.id, part);
  }
}

// ---------- Beyblades ----------
const beys = read("data/beyblades/beyblades.json");
const ids = new Set();
const codes = new Map();
const names = new Set();
for (const [i, bey] of beys.entries()) {
  const at = `beyblades[${i}] ${bey?.id ?? "?"}`;
  if (!isNonEmptyString(bey.id) || !/^[a-z0-9-]+$/.test(bey.id)) err(at, "id must be a lowercase slug");
  else if (ids.has(bey.id)) err(at, `duplicate id "${bey.id}"`);
  ids.add(bey.id);
  for (const key of ["name", "fullName", "comboCode", "description", "series"]) {
    if (!isNonEmptyString(bey[key])) err(at, `missing ${key}`);
  }
  if (names.has(bey.fullName)) err(at, `duplicate fullName "${bey.fullName}"`);
  names.add(bey.fullName);

  if (!/^(BX|UX|CX)-\d{2}$/.test(bey.productCode ?? "")) err(at, `invalid productCode "${bey.productCode}"`);
  else if (!bey.productCode.endsWith("-00")) {
    // "-00" codes are shared by Takara Tomy for limited / event releases.
    if (codes.has(bey.productCode)) err(at, `duplicate productCode "${bey.productCode}" (also ${codes.get(bey.productCode)})`);
    codes.set(bey.productCode, bey.id);
  }
  if (!LINES.includes(bey.line)) err(at, `invalid line "${bey.line}"`);
  if (!TYPES.includes(bey.type)) err(at, `invalid type "${bey.type}"`);
  if (!SPINS.includes(bey.spinDirection)) err(at, `invalid spinDirection "${bey.spinDirection}"`);
  if (bey.weight !== null && (!isFiniteNumber(bey.weight) || bey.weight < 20 || bey.weight > 80))
    err(at, `invalid weight ${bey.weight}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bey.releaseDate ?? "") || Number.isNaN(Date.parse(bey.releaseDate)))
    err(at, `invalid releaseDate "${bey.releaseDate}"`);

  // Parts
  const slots = bey.parts ?? {};
  if (!slots.ratchet) err(at, "missing ratchet");
  if (!slots.bit) err(at, "missing bit");
  if (bey.line === "CX") {
    if (!slots.lockChip) err(at, "Custom Line Beyblade missing lockChip");
    if (!slots.mainBlade && !slots.metalBlade) err(at, "Custom Line Beyblade missing mainBlade / metalBlade");
    if (!slots.assistBlade) err(at, "Custom Line Beyblade missing assistBlade");
    if (slots.blade) err(at, "Custom Line Beyblade should not use a one-piece blade");
  } else if (!slots.blade) err(at, "missing blade");
  for (const [category, partId] of Object.entries(slots)) {
    const part = parts.get(partId);
    if (!part) err(at, `unknown part "${partId}" in slot ${category}`);
    else if (part.category !== category) err(at, `part "${partId}" is a ${part.category}, not a ${category}`);
    usedParts.add(partId);
  }

  // Visual & image
  const v = bey.visual ?? {};
  for (const key of ["primary", "secondary", "accent"]) {
    if (!/^#[0-9a-f]{6}$/i.test(v[key] ?? "")) err(at, `visual.${key} must be a hex colour`);
  }
  if (!Number.isInteger(v.blades) || v.blades < 1 || v.blades > 8) err(at, "visual.blades must be 1-8");
  if (bey.image !== null) {
    if (typeof bey.image !== "string" || !bey.image.startsWith("/")) err(at, `image must be null or a /public path`);
    else if (!existsSync(join(ROOT, "public", bey.image))) err(at, `broken image reference "${bey.image}"`);
  }
  validateSourceRefs(at, bey.sources);
}

for (const id of parts.keys()) if (!usedParts.has(id)) warn(`parts ${id}`, "not used by any Beyblade");

// ---------- Matchups ----------
const matchups = read("data/battles/matchups.json").modifiers ?? {};
for (const a of TYPES) {
  for (const b of TYPES) {
    const m = matchups[a]?.[b];
    if (!m) {
      err("matchups", `missing ${a} -> ${b}`);
      continue;
    }
    for (const key of ["impact", "knockback", "spinDrain"]) {
      if (!isFiniteNumber(m[key]) || m[key] < 0.5 || m[key] > 1.5) err("matchups", `${a} -> ${b}.${key} must be 0.5-1.5`);
    }
  }
}

for (const w of warnings) console.log(`[warn]  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`[error] ${e}`);
  console.error(`\nData validation failed with ${errors.length} error(s).`);
  process.exit(1);
}
console.log(`[ok]    Data valid: ${beys.length} Beyblades, ${parts.size} parts, ${sources.length} sources (${warnings.length} warning(s)).`);
