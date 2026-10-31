"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const LOCAL_EVENT = "local-storage";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LOCAL_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LOCAL_EVENT, callback);
  };
}

const noopSubscribe = () => () => {};

/** True after hydration on the client. */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

function readRaw(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parse<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * JSON state persisted to localStorage and synchronised across components and tabs.
 * Uses the fallback on the server and during hydration.
 */
export function useLocalStorage<T>(key: string, fallback: T) {
  const raw = useSyncExternalStore(subscribe, () => readRaw(key), () => null);
  const hydrated = useHydrated();
  // fallback is intentionally excluded from deps: callers pass constants.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => parse(raw, fallback), [raw]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const current = parse(readRaw(key), fallback);
      const resolved = typeof next === "function" ? (next as (p: T) => T)(current) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // Storage may be full or disabled (private mode).
      }
      window.dispatchEvent(new Event(LOCAL_EVENT));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, update, hydrated] as const;
}
