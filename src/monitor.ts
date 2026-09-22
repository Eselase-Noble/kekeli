import { config } from "./config.js";
import {
  getDevices,
  recordEvent,
  setDeviceStatus,
  type DeviceRow,
} from "./db.js";
import { notify } from "./notify.js";

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString();
}

/**
 * One evaluation pass: compare each device's last_seen against the offline
 * threshold and fire power_off / power_on alerts on state transitions.
 */
export function evaluateDevices(now: number): void {
  const thresholdMs = config.offlineAfterSeconds * 1000;
  const devices = getDevices();

  for (const d of devices) {
    if (d.last_seen === null) continue; // never reported yet

    const silentFor = now - d.last_seen;
    const shouldBeOffline = silentFor > thresholdMs;

    if (shouldBeOffline && d.status !== "offline") {
      setDeviceStatus(d.id, "offline");
      recordEvent(d.id, "power_off", `last seen ${fmtTime(d.last_seen)}`, now);
      void notify(
        `⚠️ POWER OFF — ${label(d)}`,
        `No signal from "${label(d)}" for ${fmtDuration(silentFor)}.\n` +
          `Last seen: ${fmtTime(d.last_seen)}.\n` +
          `Likely the power (light) went out.`,
      );
    } else if (!shouldBeOffline && d.status === "offline") {
      // Came back — heartbeat already flipped status to "online" via recordHeartbeat,
      // but guard here too in case of races.
      setDeviceStatus(d.id, "online");
      recordEvent(d.id, "power_on", `back at ${fmtTime(now)}`, now);
      void notify(
        `✅ POWER BACK — ${label(d)}`,
        `"${label(d)}" is reporting again as of ${fmtTime(now)}.`,
      );
    }
  }
}

/**
 * Called from the heartbeat route the instant a device that was offline
 * checks back in, so recovery alerts are immediate (not up to one loop late).
 */
export function onHeartbeatRecovery(prev: DeviceRow | undefined, now: number): void {
  if (prev && prev.status === "offline") {
    recordEvent(prev.id, "power_on", `back at ${fmtTime(now)}`, now);
    void notify(
      `✅ POWER BACK — ${label(prev)}`,
      `"${label(prev)}" is reporting again as of ${fmtTime(now)}.`,
    );
  }
}

function label(d: DeviceRow): string {
  return d.label || d.id;
}

let timer: NodeJS.Timeout | null = null;
export function startMonitor(): void {
  if (timer) return;
  const intervalMs = config.checkIntervalSeconds * 1000;
  timer = setInterval(() => evaluateDevices(Date.now()), intervalMs);
  console.log(
    `[monitor] checking every ${config.checkIntervalSeconds}s, ` +
      `offline after ${config.offlineAfterSeconds}s of silence`,
  );
}
