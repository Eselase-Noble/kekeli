/**
 * Next.js runs this once when the server process boots (both `dev` and
 * `start`). We use it to create tables and start the background monitor loop
 * that watches for device silence (= power outage).
 */
export async function register() {
  // Only run on the Node.js server runtime, never on Edge.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { initDb } = await import("@/lib/db");
  const { startMonitor } = await import("@/lib/monitor");
  const { channelSummary } = await import("@/lib/notify");

  await initDb();
  startMonitor();
  console.log(`  ⚡ Kekeli monitor started — alerts via: ${channelSummary()}`);
}
