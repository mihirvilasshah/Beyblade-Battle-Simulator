import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "hot" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 font-display font-semibold uppercase tracking-[0.14em] whitespace-nowrap rounded-[10px] transition-[transform,box-shadow,background-color,color,border-color] duration-200 select-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-contrast shadow-[0_0_0_1px_rgb(255_255_255/0.12)_inset,0_10px_30px_-10px_var(--accent-glow)] hover:shadow-[0_0_0_1px_rgb(255_255_255/0.2)_inset,0_14px_40px_-8px_var(--accent-glow)] hover:-translate-y-0.5",
  hot: "bg-gradient-to-r from-[#ff6a2b] to-[#ff2e63] text-white shadow-[0_10px_30px_-10px_rgb(255_80_60/0.6)] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-10px_rgb(255_80_60/0.75)]",
  secondary:
    "border border-border-strong bg-surface/60 text-fg hover:border-accent hover:text-accent-strong backdrop-blur hover:-translate-y-0.5",
  ghost: "text-fg-muted hover:text-fg hover:bg-surface-2",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[0.7rem]",
  md: "h-11 px-5 text-xs",
  lg: "h-14 px-8 text-sm",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function Button({ variant = "primary", size = "md", icon, className, children, type = "button", ...props }: CommonProps & ComponentProps<"button">) {
  return (
    <button type={type} className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({ variant = "primary", size = "md", icon, className, children, ...props }: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
