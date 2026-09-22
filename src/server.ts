import express, { type Request, type Response, type NextFunction } from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config } from "./config.js";
import {
  getDevice,
  getDevices,
  getRecentEvents,
  recordHeartbeat,
} from "./db.js";
import { onHeartbeatRecovery } from "./monitor.js";
import { channelSummary } from "./notify.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createServer() {
  const app = express();
  app.use(express.json());

  // --- Auth for device-facing endpoints ---
  function requireApiKey(req: Request, res: Response, next: NextFunction) {
    const key = req.header("x-api-key") ?? req.query.key;
    if (key !== config.apiKey) {
      return res.status(401).json({ ok: false, error: "invalid api key" });
    }
    next();
  }

  // --- Heartbeat: any compatible device POSTs here ---
  // Body: { id: "home-esp32", label?: "Living room", battery?: 87, balance?: 12.5 }
  app.post("/api/heartbeat", requireApiKey, (req: Request, res: Response) => {
    const { id, label, battery, balance } = req.body ?? {};
    if (!id || typeof id !== "string") {
      return res.status(400).json({ ok: false, error: "missing device id" });
    }
    const now = Date.now();
    const prev = getDevice(id);
    recordHeartbeat({
      id,
      label: typeof label === "string" ? label : undefined,
      battery: Number.isFinite(battery) ? battery : undefined,
      balance: Number.isFinite(balance) ? balance : undefined,
      now,
    });
    // Fire an immediate "power back" alert if this device was offline.
    onHeartbeatRecovery(prev, now);
    res.json({ ok: true, id, serverTime: now });
  });

  // Convenience: GET heartbeat for the simplest possible devices (ESP8266, curl).
  app.get("/api/heartbeat", requireApiKey, (req: Request, res: Response) => {
    const id = String(req.query.id ?? "");
    if (!id) return res.status(400).json({ ok: false, error: "missing device id" });
    const now = Date.now();
    const prev = getDevice(id);
    recordHeartbeat({
      id,
      label: req.query.label ? String(req.query.label) : undefined,
      battery: req.query.battery ? Number(req.query.battery) : undefined,
      balance: req.query.balance ? Number(req.query.balance) : undefined,
      now,
    });
    onHeartbeatRecovery(prev, now);
    res.json({ ok: true, id, serverTime: now });
  });

  // --- Status API (for the dashboard / your phone) ---
  app.get("/api/status", (_req: Request, res: Response) => {
    const now = Date.now();
    const devices = getDevices().map((d) => ({
      ...d,
      silentSeconds: d.last_seen ? Math.round((now - d.last_seen) / 1000) : null,
    }));
    res.json({
      ok: true,
      now,
      offlineAfterSeconds: config.offlineAfterSeconds,
      channels: channelSummary(),
      devices,
      events: getRecentEvents(50),
    });
  });

  app.get("/healthz", (_req: Request, res: Response) => res.json({ ok: true }));

  // --- Dashboard ---
  app.use(express.static(join(__dirname, "..", "public")));

  return app;
}
