import { config } from "@/lib/config";
import {
  getBalanceReadings,
  getDevice,
  getPrimaryBalanceDevice,
  recordBalance,
  type BalanceReading,
} from "@/lib/db";
import { sendAlert } from "@/lib/notify";
import { buildLowBalanceAlert } from "@/lib/templates";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface BalanceSummary {
  deviceId: string | null;
  label: string | null;
  units: number | null;
  updatedAt: number | null;
  burnPerDay: number | null; // estimated units consumed per day
  daysLeft: number | null; // estimated days until zero
  low: boolean;
  lowThreshold: number;
  fullReference: number;
  currency: string;
  pricePerUnit: number;
}

/**
 * Estimate daily consumption from historical readings. Only spans where the
 * balance *dropped* count as consumption; a rise means a top-up and resets the
 * window. Needs at least a little history spanning >= 30 min to be meaningful.
 */
export function estimateBurnPerDay(readings: BalanceReading[]): number | null {
  if (readings.length < 2) return null;
  let consumed = 0;
  let spanMs = 0;
  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1];
    const cur = readings[i];
    const drop = prev.units - cur.units;
    const dt = cur.at - prev.at;
    if (drop > 0 && dt > 0) {
      consumed += drop;
      spanMs += dt;
    }
  }
  if (consumed <= 0 || spanMs < 30 * 60 * 1000) return null;
  return consumed / (spanMs / DAY_MS);
}

export async function getBalanceSummary(): Promise<BalanceSummary> {
  const device = await getPrimaryBalanceDevice();
  const base: BalanceSummary = {
    deviceId: device?.id ?? null,
    label: device?.label ?? null,
    units: device?.balance ?? null,
    updatedAt: null,
    burnPerDay: null,
    daysLeft: null,
    low: false,
    lowThreshold: config.lowBalanceUnits,
    fullReference: config.fullBalanceUnits,
    currency: config.currency,
    pricePerUnit: config.pricePerUnit,
  };
  if (!device || device.balance == null) return base;

  const readings = await getBalanceReadings(device.id);
  base.updatedAt = readings.length ? readings[readings.length - 1].at : null;
  const burn = estimateBurnPerDay(readings);
  base.burnPerDay = burn;
  base.daysLeft = burn && burn > 0 ? device.balance / burn : null;
  base.low = device.balance <= config.lowBalanceUnits;
  return base;
}

/**
 * Set the current prepaid balance for a device (manually or from a reading),
 * and fire a low-balance alert if this update crosses below the threshold.
 */
export async function setBalance(
  deviceId: string,
  units: number,
  now: number,
): Promise<BalanceSummary> {
  const before = await getDevice(deviceId);
  const wasLow = before?.balance != null && before.balance <= config.lowBalanceUnits;

  await recordBalance(deviceId, units, now);

  const nowLow = units <= config.lowBalanceUnits;
  if (nowLow && !wasLow) {
    const readings = await getBalanceReadings(deviceId);
    const burn = estimateBurnPerDay(readings);
    const daysLeft = burn && burn > 0 ? units / burn : null;
    void sendAlert(
      buildLowBalanceAlert(
        before?.label || deviceId,
        units,
        config.currency,
        now,
        daysLeft,
      ),
    );
  }

  return getBalanceSummary();
}
