import { ConnectDeviceCard, DevicesPanel, PageHeader } from "@/components/panels";

export default function DevicesPage() {
  return (
    <div>
      <PageHeader
        title="Devices"
        subtitle="Every device reporting in from home. Silence from one means the power is likely out."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <DevicesPanel />
        <ConnectDeviceCard />
      </div>
    </div>
  );
}
