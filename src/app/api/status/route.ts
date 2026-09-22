import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getDevices, getRecentEvents } from "@/lib/db";
import { getBalanceSummary } from "@/lib/balance";
import { channelSummary } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const now = Date.now();
  const [rawDevices, events, balance] = await Promise.all([
    getDevices(),
    getRecentEvents(50),
    getBalanceSummary(),
  ]);
  const devices = rawDevices.map((d) => ({
    ...d,
    silentSeconds: d.last_seen ? Math.round((now - d.last_seen) / 1000) : null,
  }));
  return NextResponse.json({
    ok: true,
    now,
    offlineAfterSeconds: config.offlineAfterSeconds,
    channels: channelSummary(),
    devices,
    events,
    balance,
  });
}
