/**
 * Centralized component pattern — ActionCard
 *
 * Rules this example demonstrates:
 *  1. Compound component (Card.Header, Card.Body) — callers compose, not re-style.
 *  2. asChild polymorphism via Slot — wrap a Link without breaking semantics.
 *  3. No baked padding — callers decide based on their layout needs.
 *  4. cn() for className merging — consumers add utilities, component defaults hold.
 *  5. data-slot attributes — for targeted CSS without class fragility.
 *
 * This component lives in components/shared/cards/action-card.tsx.
 * Consumers import from components/shared/cards/ (barrel), never reconstruct
 * the rounded-card + interactive-card recipe inline.
 */

import { Slot } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

export function ActionCard({
  asChild = false,
  className,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      data-slot="action-card"
      className={cn(
        "group rounded-card border border-border/60 card-surface interactive-card",
        className,
      )}
      {...props}
    />
  );
}

function ActionCardHeader({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      data-slot="action-card-header"
      className={cn("border-b border-border bg-muted/30 px-5 py-3", className)}
    >
      {label && (
        <p className="text-small font-semibold uppercase tracking-widest text-primary">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

function ActionCardBody({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("px-5 py-5", className)} {...props}>
      {children}
    </div>
  );
}

ActionCard.Header = ActionCardHeader;
ActionCard.Body = ActionCardBody;

// ── Usage examples ────────────────────────────────────────────────
//
// Plain div card:
//   <ActionCard>
//     <ActionCard.Body>content</ActionCard.Body>
//   </ActionCard>
//
// Link card (asChild — no wrapping div in the DOM):
//   <ActionCard asChild>
//     <Link href="/settings">
//       <ActionCard.Header label="Settings" />
//       <ActionCard.Body>content</ActionCard.Body>
//     </Link>
//   </ActionCard>
//
// With extra className (cn merges correctly):
//   <ActionCard className="col-span-2">...</ActionCard>
