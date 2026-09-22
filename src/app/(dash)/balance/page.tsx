import { BalancePanel, PageHeader } from "@/components/panels";

export default function BalancePage() {
  return (
    <div>
      <PageHeader
        title="Prepaid balance"
        subtitle="Track your units, estimate how long they'll last, and get warned before you run out."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <BalancePanel />
        <aside className="surface self-start p-6">
          <p className="kpi-label">How days-left works</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            Each time you save a reading, Kekeli compares it with earlier ones to
            work out how fast you&apos;re using units, then projects when you&apos;ll
            hit zero.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            The more often you update it, the sharper the estimate. Set{" "}
            <code className="rounded bg-inset px-1 font-mono text-[12px]">PRICE_PER_UNIT</code>{" "}
            in your <code className="rounded bg-inset px-1 font-mono text-[12px]">.env</code>{" "}
            to also see the cost to refill.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            You&apos;ll get an email/SMS the moment it drops to your low threshold.
          </p>
        </aside>
      </div>
    </div>
  );
}
