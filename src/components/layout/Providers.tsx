"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { SoundEngine, type SoundName } from "@/lib/sound";

interface SoundContextValue {
  enabled: boolean;
  toggle: () => void;
  play: (name: SoundName, intensity?: number) => void;
  setSpinHum: (level: number) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

function SoundProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<SoundEngine | null>(null);
  // Sound always starts OFF; enabling it is itself the user gesture that unlocks audio.
  const [enabled, setEnabled] = useState(false);

  const getEngine = useCallback(() => {
    engineRef.current ??= new SoundEngine();
    return engineRef.current;
  }, []);

  const toggle = useCallback(() => {
    const next = !enabled;
    if (next) getEngine().unlock();
    else getEngine().setSpinHum(0);
    setEnabled(next);
  }, [enabled, getEngine]);

  useEffect(() => () => engineRef.current?.setSpinHum(0), []);

  const value = useMemo<SoundContextValue>(
    () => ({
      enabled,
      toggle,
      play: (name, intensity) => {
        if (enabled) getEngine().play(name, intensity);
      },
      setSpinHum: (level) => {
        getEngine().setSpinHum(enabled ? level : 0);
      },
    }),
    [enabled, toggle, getEngine],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used inside <Providers>");
  return ctx;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <SoundProvider>{children}</SoundProvider>
    </ThemeProvider>
  );
}
