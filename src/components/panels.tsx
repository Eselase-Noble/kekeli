"use client";

import { useState, useTransition } from "react";
import { updateBalance } from "@/app/actions";
import { useStatus, type Balance, type Device, type StatusEvent } from "@/components/status-context";

/* ---- formatting helpers ---- */
export function ago(seconds: number | null): string {
  if (seconds == null) return "never";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  const h = Math.floor(seconds / 3600);
  return `${h}h ${Math.round((seconds % 3600) / 60)}m ago`;
}
export function agoMs(ms: number | null, now: number): string {
  if (ms == null) return "never";
  return ago(Math.round((now - ms) / 1000));
}
export function fmt(ms: number): string {
  return new Date(ms).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}
export function fmtDays(d: number | null | undefined): string {
  if (d == null || !Number.isFinite(d)) return "—";
  return d < 2 ? d.toFixed(1) : String(Math.round(d));
}

/* ---- KPI card ---- */
export function Kpi({
  label,
  value,
  unit,
  sub,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  tone: "on" | "off" | "brand" | "flat";
}) {
  const valueColor =
    tone === "on"
      ? "text-on"
      : tone === "off"
        ? "text-off"
        : tone === "brand"
          ? "text-brand-700"
          : "text-ink";
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between">
        <p className="kpi-label">{label}</p>
        {(tone === "on" || tone === "off") && (
          <span className={`h-2 w-2 rounded-full ${tone === "on" ? "live-dot bg-on" : "bg-off"}`} />
        )}
      </div>
      <p className={`mt-2.5 font-display text-3xl font-bold leading-none ${valueColor}`}>
        {value}
        {unit && <span className="ml-1 text-sm font-semibold text-ink-3">{unit}</span>}
      </p>
      <p className="mt-2 text-[12px] text-ink-2">{sub}</p>
    </div>
  );
}

export function KpiRow() {
  const { data } = useStatus();
  const devices = data?.devices ?? [];
  const online = devices.filter((d) => d.status === "online").length;
  const anyOffline = devices.some((d) => d.status === "offline");
  const powerLabel = !devices.length ? "—" : anyOffline ? "Off" : "On";
  const bal = data?.balance;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Kpi
        label="Power"
        value={powerLabel}
        tone={powerLabel === "On" ? "on" : powerLabel === "Off" ? "off" : "flat"}
        sub={devices.length ? `${online} of ${devices.length} reporting` : "no devices yet"}
      />
      <Kpi
        label="Prepaid units"
        value={bal?.units != null ? String(bal.units) : "—"}
        unit={bal?.units != null ? "kWh" : undefined}
        tone={bal?.low ? "off" : "brand"}
        sub={bal?.units == null ? "not set" : bal.low ? "running low" : "units remaining"}
      />
      <Kpi
        label="Est. days left"
        value={fmtDays(bal?.daysLeft)}
        tone="flat"
        sub={bal?.burnPerDay ? "at recent usage" : "needs more readings"}
      />
      <Kpi
        label="Devices online"
        value={String(online)}
        tone="flat"
        sub={`of ${devices.length || 0} total`}
      />
    </div>
  );
}

/* ---- Balance ---- */
export function BalancePanel({ compact = false }: { compact?: boolean }) {
  const { data, refresh } = useStatus();
  const balance = data?.balance;
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const units = balance?.units ?? null;
  const full = balance?.fullReference ?? 100;
  const pct = units != null ? Math.max(0, Math.min(1, units / full)) : 0;
  const low = balance?.low ?? false;
  const cost =
    balance && balance.pricePerUnit > 0 && units != null
      ? Math.max(0, (full - units) * balance.pricePerUnit)
      : null;

  function save() {
    const n = Number(input);
    setMsg(null);
    startTransition(async () => {
      const res = await updateBalance(n);
      if (res.ok) {
        setInput("");
        setMsg("Saved.");
        refresh();
      } else {
        setMsg(res.error);
      }
    });
  }

  return (
    <section className="surface p-6">
      <div className="flex items-center justify-between">
        <p className="kpi-label">Prepaid balance</p>
        {low && units != null && <span className="pill bg-off-50 text-off">Low balance</span>}
      </div>

      {units == null ? (
        <p className="mt-4 text-sm text-ink-2">
          No reading yet. Enter the units showing on your meter to start tracking.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-end gap-2">
            <span className={`font-display text-6xl font-bold leading-none ${low ? "text-off" : "text-brand-700"}`}>
              {units}
            </span>
            <span className="mb-1 text-lg font-semibold text-ink-3">kWh</span>
          </div>

          <div className="mt-5">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-inset">
              <div
                className={`h-full rounded-full transition-all ${low ? "bg-off" : "bg-brand-500"}`}
                style={{ width: `${Math.round(pct * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[10px] text-ink-3">
              <span>empty</span>
              <span>{full} kWh</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-ink-2">
            <span>
              <span className="text-ink-3">Est. days left: </span>
              <span className="font-semibold text-ink">{fmtDays(balance?.daysLeft)}</span>
            </span>
            {cost != null && (
              <span>
                <span className="text-ink-3">Refill to full: </span>
                <span className="font-semibold text-ink">
                  {balance?.currency} {cost.toFixed(2)}
                </span>
              </span>
            )}
            <span>
              <span className="text-ink-3">Updated: </span>
              <span className="font-semibold text-ink">
                {balance?.updatedAt ? agoMs(balance.updatedAt, Date.now()) : "—"}
              </span>
            </span>
          </div>
        </>
      )}

      {!compact && (
        <div className="mt-6 border-t border-line pt-5">
          <label className="mb-2 block text-[13px] font-medium text-ink-2">Update current units</label>
          <div className="flex flex-wrap gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && input && save()}
              placeholder="e.g. 42.8"
              className="field max-w-[180px]"
            />
            <button onClick={save} disabled={pending || !input} className="btn-primary">
              {pending ? "Saving…" : "Save units"}
            </button>
            {msg && <span className="self-center text-[13px] text-ink-2">{msg}</span>}
          </div>
          <p className="mt-2 text-[12px] text-ink-3">
            Read it off your meter for now. Phase 2 will read it automatically from a photo.
          </p>
        </div>
      )}
    </section>
  );
}

/* ---- Devices ---- */
export function DevicesPanel() {
  const { data } = useStatus();
  const devices = data?.devices ?? [];
  const offlineAfter = data?.offlineAfterSeconds ?? 180;
  return (
    <section className="surface self-start p-6">
      <p className="kpi-label">Devices</p>
      <div className="mt-4 space-y-3">
        {!devices.length && (
          <p className="text-sm text-ink-2">
            None yet. Point a device at{" "}
            <code className="rounded bg-inset px-1 py-0.5 font-mono text-[12px]">/api/heartbeat</code>.
          </p>
        )}
        {devices.map((d: Device) => (
          <div key={d.id} className="flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                d.status === "online" ? "live-dot bg-on" : d.status === "offline" ? "bg-off" : "bg-ink-3"
              }`}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{d.label || d.id}</p>
              <p className="text-[11px] text-ink-3">
                {ago(d.silentSeconds)}
                {d.battery != null && ` · 🔋 ${d.battery}%`}
              </p>
            </div>
            <span
              className={`pill ml-auto ${
                d.status === "online"
                  ? "bg-on-50 text-on"
                  : d.status === "offline"
                    ? "bg-off-50 text-off"
                    : "bg-inset text-ink-2"
              }`}
            >
              {d.status}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-line pt-3 text-[11px] text-ink-3">
        Marked off after {offlineAfter}s of silence.
      </p>
    </section>
  );
}

/* ---- Activity ---- */
export function ActivityPanel({ limit }: { limit?: number }) {
  const { data } = useStatus();
  let events = data?.events ?? [];
  if (limit) events = events.slice(0, limit);
  return (
    <div className="surface overflow-hidden">
      {!events.length && <p className="p-6 text-sm italic text-ink-3">Nothing recorded yet.</p>}
      {events.map((e: StatusEvent) => {
        const kind =
          e.type === "power_off"
            ? { dot: "bg-off", text: "Power lost" }
            : e.type === "power_on"
              ? { dot: "bg-on", text: "Power restored" }
              : { dot: "bg-brand-500", text: "Balance updated" };
        return (
          <div
            key={e.id}
            className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0"
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${kind.dot}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">
                <span className="font-semibold">{kind.text}</span>
                <span className="text-ink-3"> · {e.device_id}</span>
                {e.type === "balance" && <span className="text-ink-2"> — {e.detail} kWh</span>}
              </p>
            </div>
            <span className="shrink-0 font-mono text-[11px] text-ink-3">{fmt(e.at)}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---- connect-a-device help ---- */
export function ConnectDeviceCard() {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const curl = `curl -X POST ${origin}/api/heartbeat \\
  -H "content-type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"id":"home","label":"My House"}'`;
  return (
    <section className="surface p-6">
      <p className="kpi-label">Connect a device</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">
        Any always-on gadget at home works — an old phone, an ESP32, a smart plug,
        even a laptop. It just sends a heartbeat every minute. When the power cuts,
        the heartbeats stop and Kekeli alerts you.
      </p>
      <ol className="mt-4 space-y-2 text-sm text-ink-2">
        <li>
          <span className="font-semibold text-ink">1.</span> Pick the device&apos;s
          key from your <code className="rounded bg-inset px-1 font-mono text-[12px]">.env</code>{" "}
          (<code className="rounded bg-inset px-1 font-mono text-[12px]">API_KEY</code>).
        </li>
        <li>
          <span className="font-semibold text-ink">2.</span> Point it at this server
          and send a heartbeat. Test it right now from any terminal:
        </li>
      </ol>
      <pre className="mt-3 overflow-x-auto rounded-[10px] bg-bark px-4 py-3 font-mono text-[12px] leading-relaxed text-bark-text">
        {curl}
      </pre>
      <p className="mt-3 text-[13px] text-ink-2">
        Ready-made clients are in the repo:{" "}
        <code className="rounded bg-inset px-1 font-mono text-[12px]">devices/esp32/heartbeat.ino</code>{" "}
        and{" "}
        <code className="rounded bg-inset px-1 font-mono text-[12px]">devices/phone-or-pc/heartbeat.sh</code>.
      </p>
    </section>
  );
}

/* ---- shared page header ---- */
export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      <p className="mt-1 text-sm text-ink-2">{subtitle}</p>
    </div>
  );
}
