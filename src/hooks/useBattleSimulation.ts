"use client";

import { useMemo } from "react";
import type { BattleResult, EngineBey } from "@/types/battle";
import { simulateBattle } from "@/engine/battleEngine";

export type SimulationState = { status: "ready"; result: BattleResult } | { status: "error"; message: string };

/** Runs the (synchronous, deterministic) simulation for a pair of Beys and a seed. */
export function useBattleSimulation(beys: [EngineBey, EngineBey], seed: string): SimulationState {
  const [a, b] = beys;
  return useMemo<SimulationState>(() => {
    try {
      return { status: "ready", result: simulateBattle({ beys: [a, b], seed }) };
    } catch (error) {
      return { status: "error", message: error instanceof Error ? error.message : "Unknown simulation error" };
    }
  }, [a, b, seed]);
}
