"use client";

import { useCallback } from "react";
import type { BattleHistoryEntry, BattleResult } from "@/types/battle";
import { useLocalStorage } from "./useLocalStorage";

const HISTORY_KEY = "bbx:history:v1";
const MAX_ENTRIES = 40;
const EMPTY: BattleHistoryEntry[] = [];

export function useBattleHistory() {
  const [entries, setEntries, hydrated] = useLocalStorage<BattleHistoryEntry[]>(HISTORY_KEY, EMPTY);

  const record = useCallback(
    (result: BattleResult) => {
      const id = `${result.seed}:${result.beyIds.join(":")}`;
      const entry: BattleHistoryEntry = {
        id,
        seed: result.seed,
        beyIds: result.beyIds,
        names: result.names,
        winnerIndex: result.winnerIndex,
        finishType: result.finishType,
        duration: result.duration,
        createdAt: new Date().toISOString(),
        statistics: result.statistics,
      };
      setEntries((prev) => [entry, ...(Array.isArray(prev) ? prev : []).filter((e) => e.id !== id)].slice(0, MAX_ENTRIES));
    },
    [setEntries],
  );

  const remove = useCallback((id: string) => setEntries((prev) => prev.filter((e) => e.id !== id)), [setEntries]);
  const clear = useCallback(() => setEntries([]), [setEntries]);

  return { entries: Array.isArray(entries) ? entries : EMPTY, record, remove, clear, hydrated };
}
