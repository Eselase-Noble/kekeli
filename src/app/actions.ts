"use server";

import { setBalance } from "@/lib/balance";

/** Update the current prepaid units from the dashboard (same-origin only). */
export async function updateBalance(units: number) {
  if (!Number.isFinite(units) || units < 0) {
    return { ok: false as const, error: "Enter a valid number of units." };
  }
  const summary = await setBalance("meter", units, Date.now());
  return { ok: true as const, balance: summary };
}
