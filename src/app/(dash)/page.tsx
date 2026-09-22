import {
  ActivityPanel,
  BalancePanel,
  DevicesPanel,
  KpiRow,
  PageHeader,
} from "@/components/panels";

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <section>
        <PageHeader
          title="Overview"
          subtitle="Your home's power and prepaid units, wherever you are."
        />
        <KpiRow />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <BalancePanel compact />
        <DevicesPanel />
      </div>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-bold text-ink">Recent activity</h2>
          <a href="/activity" className="text-[13px] font-medium text-brand-700 hover:text-brand-800">
            View all
          </a>
        </div>
        <ActivityPanel limit={6} />
      </section>
    </div>
  );
}
