/**
 * mock/components/page.tsx — Component catalog
 *
 * Purpose: shows every centralized component in its states.
 * Not a real UI page — no real data, no routing side-effects.
 * Add a section here whenever a new centralized component is created.
 */
import { Button } from "@/components/ui/button";
import { ActionCard } from "@/components/shared/cards/action-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ComponentsPage() {
  return (
    <div className="mx-auto max-w-page space-y-12 px-4 py-12">
      <h1 className="text-heading font-semibold">Component Catalog</h1>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-body font-semibold uppercase tracking-widest text-muted-foreground">
          Button variants
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="default">Default</Button>
          <Button variant="gradient">Gradient CTA</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="default" disabled>Disabled</Button>
        </div>
      </section>

      {/* ActionCard — resting state */}
      <section className="space-y-4">
        <h2 className="text-body font-semibold uppercase tracking-widest text-muted-foreground">
          ActionCard
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <ActionCard>
            <ActionCard.Body>
              <p className="text-body font-semibold">Plain card</p>
              <p className="text-small text-muted-foreground">
                Hover to see interactive-card border + shadow.
              </p>
            </ActionCard.Body>
          </ActionCard>

          <ActionCard>
            <ActionCard.Header label="Section" />
            <ActionCard.Body>
              <p className="text-body">Card with header label</p>
            </ActionCard.Body>
          </ActionCard>

          <ActionCard className="opacity-50">
            <ActionCard.Body>
              <p className="text-body font-semibold">Disabled state</p>
              <p className="text-small text-muted-foreground">opacity-50, no pointer-events.</p>
            </ActionCard.Body>
          </ActionCard>
        </div>
      </section>

      {/* Skeleton */}
      <section className="space-y-4">
        <h2 className="text-body font-semibold uppercase tracking-widest text-muted-foreground">
          Skeleton loading
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full rounded-card" />
          <Skeleton className="h-32 w-full rounded-card" />
          <Skeleton className="h-32 w-full rounded-card" />
        </div>
      </section>
    </div>
  );
}
