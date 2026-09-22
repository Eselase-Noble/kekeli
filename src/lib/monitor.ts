import { config } from "@/lib/config";
import {
  getDevices,
  recordEvent,
  setDeviceStatus,
  type DeviceRow,
} from "@/lib/db";
import { sendAlert } from "@/lib/notify";
import { buildPowerOffAlert, buildPowerOnAlert } from "@/lib/templates";

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString();
}

function label(d: DeviceRow): string {
  return d.label || d.id;
}

/**
 * One evaluation pass: compare each device's last_seen against the offline
 * threshold and fire power_off / power_on alerts on state transitions.
 */
export async function evaluateDevices(now: number): Promise<void> {
  const thresholdMs = config.offlineAfterSeconds * 1000;
  const devices = await getDevices();

  for (const d of devices) {
    if (d.last_seen === null) continue; // never reported yet

    const silentFor = now - d.last_seen;
    const shouldBeOffline = silentFor > thresholdMs;

    if (shouldBeOffline && d.status !== "offline") {
      await setDeviceStatus(d.id, "offline");
      await recordEvent(d.id, "power_off", `last seen ${fmtTime(d.last_seen)}`, now);
      void sendAlert(buildPowerOffAlert(label(d), d.last_seen, silentFor, now));
    } else if (!shouldBeOffline && d.status === "offline") {
      // Guard for races; recovery is normally handled by onHeartbeatRecovery.
      await setDeviceStatus(d.id, "online");
      await recordEvent(d.id, "power_on", `back at ${fmtTime(now)}`, now);
      void sendAlert(buildPowerOnAlert(label(d), now));
    }
  }
}

/**
 * Called from the heartbeat route the instant a device that was offline
 * checks back in, so recovery alerts are immediate (not up to one loop late).
 * Uses the device's last_seen to estimate how long the outage lasted.
 */
export async function onHeartbeatRecovery(
  prev: DeviceRow | undefined,
  now: number,
): Promise<void> {
  if (prev && prev.status === "offline") {
    await recordEvent(prev.id, "power_on", `back at ${fmtTime(now)}`, now);
    const outageMs = prev.last_seen ? now - prev.last_seen : undefined;
    void sendAlert(buildPowerOnAlert(label(prev), now, outageMs));
  }
}

let timer: NodeJS.Timeout | null = null;
export function startMonitor(): void {
  if (timer) return;
  const intervalMs = config.checkIntervalSeconds * 1000;
  timer = setInterval(() => {
    evaluateDevices(Date.now()).catch((err) =>
      console.error("[monitor] evaluate failed:", err),
    );
  }, intervalMs);
  console.log(
    `[monitor] checking every ${config.checkIntervalSeconds}s, ` +
      `offline after ${config.offlineAfterSeconds}s of silence`,
  );
}
