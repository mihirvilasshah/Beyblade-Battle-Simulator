"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/hooks/useLocalStorage";
import { DialogClose, DialogContent, DialogRoot, DialogTrigger } from "@/components/ui/Dialog";
import { useSound } from "./Providers";

const NAV = [
  { href: "/battle", label: "Battle" },
  { href: "/database", label: "Database" },
  { href: "/compare", label: "Compare" },
  { href: "/history", label: "Battle History" },
  { href: "/about", label: "About" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Logo() {
  return (
    <Link href="/" className="group flex shrink-0 items-center gap-2.5 whitespace-nowrap" aria-label="BEYBLADE X Battle Arena — home">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--hot)" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="14.5" fill="none" stroke="url(#logo-g)" strokeWidth="2" />
        <path d="M9 9 L23 23 M23 9 L9 23" stroke="url(#logo-g)" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="16" cy="16" r="3" fill="var(--fg)" />
      </svg>
      <span className="leading-none">
        <span className="block font-display text-[0.95rem] font-bold tracking-[0.2em] text-fg">BEYBLADE X</span>
        <span className="block font-display text-[0.55rem] font-semibold tracking-[0.42em] text-fg-subtle">BATTLE ARENA</span>
      </span>
    </Link>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const dark = !hydrated || resolvedTheme !== "light";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="grid size-10 place-items-center rounded-lg text-fg-muted transition hover:bg-surface-2 hover:text-fg"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? <Moon className="size-5" aria-hidden /> : <Sun className="size-5" aria-hidden />}
    </button>
  );
}

function SoundToggle() {
  const { enabled, toggle } = useSound();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      className={cn(
        "grid size-10 place-items-center rounded-lg transition hover:bg-surface-2",
        enabled ? "text-accent" : "text-fg-muted hover:text-fg",
      )}
      aria-label={enabled ? "Sound on — turn off" : "Sound off — turn on"}
      title={enabled ? "Sound ON" : "Sound OFF"}
    >
      {enabled ? <Volume2 className="size-5" aria-hidden /> : <VolumeX className="size-5" aria-hidden />}
    </button>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 glass">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-contrast"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative whitespace-nowrap rounded-md px-2 py-2 font-display text-[0.7rem] font-semibold uppercase tracking-[0.12em] transition lg:px-3 lg:tracking-[0.16em]",
                      active ? "text-fg" : "text-fg-muted hover:text-fg",
                    )}
                  >
                    {item.label}
                    {active && <span aria-hidden className="absolute inset-x-2 -bottom-[13px] h-0.5 rounded-full bg-accent shadow-[0_0_12px_var(--accent)] lg:inset-x-3" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex items-center gap-1">
          <SoundToggle />
          <ThemeToggle />
          <DialogRoot>
            <DialogTrigger
              className="grid size-10 place-items-center rounded-lg text-fg-muted transition hover:bg-surface-2 hover:text-fg md:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" aria-hidden />
            </DialogTrigger>
            <DialogContent title="Menu" side="right">
              <nav aria-label="Mobile">
                <ul className="flex flex-col gap-1">
                  {[{ href: "/", label: "Home" }, ...NAV].map((item) => {
                    const active = item.href === "/" ? pathname === "/" : isActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <DialogClose asChild>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex h-12 items-center rounded-lg px-4 font-display text-sm font-semibold uppercase tracking-[0.16em] transition",
                              active ? "bg-surface-2 text-accent-strong" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                            )}
                          >
                            {item.label}
                          </Link>
                        </DialogClose>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </DialogContent>
          </DialogRoot>
        </div>
      </div>
    </header>
  );
}
