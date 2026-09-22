import { ActivityPanel, PageHeader } from "@/components/panels";

export default function ActivityPage() {
  return (
    <div>
      <PageHeader
        title="Activity"
        subtitle="A running log of outages, recoveries and balance updates."
      />
      <ActivityPanel />
    </div>
  );
}
