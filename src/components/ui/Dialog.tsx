"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const DialogRoot = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
  side,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Render as a right-hand sheet (mobile navigation). */
  side?: "right";
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-[rise-in_0.2s_ease-out]" />
      <RadixDialog.Content
        className={cn(
          "fixed z-50 border border-border bg-bg-elevated text-fg shadow-2xl outline-none",
          side === "right"
            ? "inset-y-0 right-0 w-[min(88vw,340px)] p-6"
            : "left-1/2 top-1/2 max-h-[88vh] w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl p-6",
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <RadixDialog.Title className="font-display text-lg font-bold uppercase tracking-[0.12em]">{title}</RadixDialog.Title>
            {description ? (
              <RadixDialog.Description className="mt-1 text-sm text-fg-muted">{description}</RadixDialog.Description>
            ) : (
              <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
            )}
          </div>
          <RadixDialog.Close className="rounded-md p-1.5 text-fg-muted transition hover:bg-surface-2 hover:text-fg" aria-label="Close">
            <X className="size-5" aria-hidden />
          </RadixDialog.Close>
        </div>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
