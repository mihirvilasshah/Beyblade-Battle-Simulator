import type { BeyType, ProductLine, SpinDirection } from "@/types/beyblade";
import type { FinishType } from "@/types/battle";

export const TYPE_LABELS: Record<BeyType, string> = {
  attack: "Attack",
  defense: "Defense",
  stamina: "Stamina",
  balance: "Balance",
};

export const LINE_LABELS: Record<ProductLine, string> = {
  BX: "Basic Line",
  UX: "Unique Line",
  CX: "Custom Line",
};

export const SPIN_LABELS: Record<SpinDirection, string> = {
  right: "Right spin",
  left: "Left spin",
};

export const FINISH_LABELS: Record<FinishType, string> = {
  SURVIVOR: "Survivor Finish",
  KNOCKOUT: "Knockout Finish",
  BURST: "Burst Finish",
  XTREME: "Xtreme Finish",
};

export function formatSeconds(seconds: number, digits = 2) {
  return `${seconds.toFixed(digits)}s`;
}

/** 8.42 -> "08.42" */
export function formatClock(seconds: number) {
  const s = Math.max(0, seconds);
  return s.toFixed(2).padStart(5, "0");
}

export function formatWeight(grams: number) {
  return `${grams.toFixed(1)} g`;
}

export function formatPercent(fraction: number) {
  return `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
}

export function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatRatchetHeight(height: number) {
  return `${(height / 10).toFixed(1)} mm`;
}
