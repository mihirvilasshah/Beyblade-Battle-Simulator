"use client";

import { useEffect } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button, ButtonLink } from "@/components/ui/Button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <EmptyState
        icon="⚠️"
        title="Something went wrong"
        description="The arena hit an unexpected error — this may be a database or simulation problem. Try again, or head back home."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={reset}>Try again</Button>
            <ButtonLink href="/" variant="secondary">
              Home
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
