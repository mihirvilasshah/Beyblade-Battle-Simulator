"use client";

import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";
import { generateSeed } from "@/engine/random";
import { Button } from "@/components/ui/Button";

export function randomPair(ids: string[]): [string, string] | null {
  if (ids.length < 2) return null;
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  const i = buf[0] % ids.length;
  let j = buf[1] % (ids.length - 1);
  if (j >= i) j += 1;
  return [ids[i], ids[j]];
}

export function arenaHref(b1: string, b2: string, seed: string, intro?: "random") {
  const params = new URLSearchParams({ b1, b2, seed });
  if (intro) params.set("intro", intro);
  return `/battle/arena?${params.toString()}`;
}

export function RandomBattleButton({ ids, size = "md", variant = "secondary", className }: { ids: string[]; size?: "sm" | "md" | "lg"; variant?: "secondary" | "hot" | "primary"; className?: string }) {
  const router = useRouter();
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      icon={<Shuffle className="size-4" aria-hidden />}
      onClick={() => {
        const pair = randomPair(ids);
        if (pair) router.push(arenaHref(pair[0], pair[1], generateSeed(), "random"));
      }}
    >
      Random battle
    </Button>
  );
}
