import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getDevice, recordHeartbeat } from "@/lib/db";
import { onHeartbeatRecovery } from "@/lib/monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const url = new URL(req.url);
  const key = req.headers.get("x-api-key") ?? url.searchParams.get("key");
  return key === config.apiKey;
}

// POST /api/heartbeat  { id, label?, battery?, balance? }
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "invalid api key" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { id, label, battery, balance } = body ?? {};
  if (!id || typeof id !== "string") {
    return NextResponse.json({ ok: false, error: "missing device id" }, { status: 400 });
  }
  const now = Date.now();
  const prev = await getDevice(id);
  await recordHeartbeat({
    id,
    label: typeof label === "string" ? label : undefined,
    battery: Number.isFinite(battery) ? battery : undefined,
    balance: Number.isFinite(balance) ? balance : undefined,
    now,
  });
  await onHeartbeatRecovery(prev, now);
  return NextResponse.json({ ok: true, id, serverTime: now });
}

// GET /api/heartbeat?id=...&key=...  (for minimal devices that only do GET)
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "invalid api key" }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing device id" }, { status: 400 });
  }
  const now = Date.now();
  const prev = await getDevice(id);
  const battery = url.searchParams.get("battery");
  const balance = url.searchParams.get("balance");
  await recordHeartbeat({
    id,
    label: url.searchParams.get("label") ?? undefined,
    battery: battery ? Number(battery) : undefined,
    balance: balance ? Number(balance) : undefined,
    now,
  });
  await onHeartbeatRecovery(prev, now);
  return NextResponse.json({ ok: true, id, serverTime: now });
}
