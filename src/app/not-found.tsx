import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <EmptyState
        icon="🛑"
        title="Invalid Beyblade or page"
        description="That Beyblade or page doesn't exist in the arena database."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/database">Browse database</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Home
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
