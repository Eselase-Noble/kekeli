import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getBalanceSummary, setBalance } from "@/lib/balance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const url = new URL(req.url);
  const key = req.headers.get("x-api-key") ?? url.searchParams.get("key");
  return key === config.apiKey;
}

// GET /api/balance — current balance summary (public, for the dashboard)
export async function GET() {
  return NextResponse.json({ ok: true, balance: await getBalanceSummary() });
}

// POST /api/balance  { deviceId?, units }  — set the current prepaid units
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "invalid api key" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const deviceId = typeof body?.deviceId === "string" && body.deviceId ? body.deviceId : "meter";
  const units = Number(body?.units);
  if (!Number.isFinite(units) || units < 0) {
    return NextResponse.json({ ok: false, error: "invalid units" }, { status: 400 });
  }
  const summary = await setBalance(deviceId, units, Date.now());
  return NextResponse.json({ ok: true, balance: summary });
}
