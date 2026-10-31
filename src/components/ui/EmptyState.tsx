import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border-strong bg-surface/50 px-6 py-14 text-center",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
      {icon && (
        <div aria-hidden className="relative mb-4 text-4xl">
          {icon}
        </div>
      )}
      <h2 className="relative font-display text-lg font-bold uppercase tracking-[0.16em] text-fg sm:text-xl">{title}</h2>
      {description && <div className="relative mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">{description}</div>}
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, className, as: Tag = "h2" }: { eyebrow?: string; title: ReactNode; description?: ReactNode; className?: string; as?: "h1" | "h2" }) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <Tag className="font-display text-2xl font-bold uppercase tracking-[0.06em] text-fg sm:text-3xl">{title}</Tag>
      {description && <p className="mt-2 text-sm leading-relaxed text-fg-muted sm:text-base">{description}</p>}
    </div>
  );
}
