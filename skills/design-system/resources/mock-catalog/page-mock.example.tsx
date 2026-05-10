/**
 * mock/pages/home/page.tsx — Full-page mock
 *
 * Purpose: shows what a real page looks like using only design-system
 * primitives. No real data — static copy is fine.
 *
 * Rule: if you need to deviate from a system token to make this page look
 * right, that's a signal the system is incomplete, not that this page
 * should be an exception.
 */
import { Button } from "@/components/ui/button";
import { ActionCard } from "@/components/shared/cards/action-card";

const MOCK_ITEMS = [
  { id: "1", title: "Analytics", description: "Track key metrics over time." },
  { id: "2", title: "Settings", description: "Configure your workspace." },
  { id: "3", title: "Reports", description: "Export and share insights." },
];

export default function MockHomePage() {
  return (
    <div className="mx-auto max-w-page space-y-6 px-4 py-8">
      {/* Page header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-small font-semibold uppercase tracking-widest text-primary">
            Dashboard
          </p>
          <h1 className="text-heading font-semibold">Good morning</h1>
        </div>
        <Button variant="gradient">New item</Button>
      </header>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        {["42 active", "7 pending", "1 alert"].map((stat) => (
          <div
            key={stat}
            className="rounded-card border border-border/60 card-surface p-5"
          >
            <p className="text-heading font-semibold">{stat.split(" ")[0]}</p>
            <p className="text-small text-muted-foreground capitalize">
              {stat.split(" ")[1]}
            </p>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-3 gap-4">
        {MOCK_ITEMS.map((item) => (
          <ActionCard key={item.id}>
            <ActionCard.Header label={item.title} />
            <ActionCard.Body>
              <p className="text-body text-muted-foreground">{item.description}</p>
              <Button variant="ghost" className="mt-4 -ml-2">
                Open →
              </Button>
            </ActionCard.Body>
          </ActionCard>
        ))}
      </div>
    </div>
  );
}
