import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DB_PATH ?? "data/ecg-monitor.sqlite";
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id            TEXT PRIMARY KEY,          -- device identifier, e.g. "home-esp32"
    label         TEXT,                      -- human-friendly name, e.g. "Living room"
    last_seen     INTEGER,                   -- unix ms of last heartbeat
    status        TEXT NOT NULL DEFAULT 'unknown', -- online | offline | unknown
    battery       INTEGER,                   -- optional: device battery %, if reported
    balance       REAL,                      -- optional: last known meter balance (Phase 2)
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id     TEXT NOT NULL,
    type          TEXT NOT NULL,             -- power_off | power_on | balance
    detail        TEXT,
    at            INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_events_device ON events(device_id, at DESC);
`);

export interface DeviceRow {
  id: string;
  label: string | null;
  last_seen: number | null;
  status: "online" | "offline" | "unknown";
  battery: number | null;
  balance: number | null;
  created_at: number;
}

export interface EventRow {
  id: number;
  device_id: string;
  type: string;
  detail: string | null;
  at: number;
}

const upsertDeviceStmt = db.prepare(`
  INSERT INTO devices (id, label, last_seen, status, battery, balance, created_at)
  VALUES (@id, @label, @last_seen, @status, @battery, @balance, @created_at)
  ON CONFLICT(id) DO UPDATE SET
    label     = COALESCE(excluded.label, devices.label),
    last_seen = excluded.last_seen,
    status    = excluded.status,
    battery   = COALESCE(excluded.battery, devices.battery),
    balance   = COALESCE(excluded.balance, devices.balance)
`);

export function recordHeartbeat(params: {
  id: string;
  label?: string | null;
  battery?: number | null;
  balance?: number | null;
  now: number;
}): void {
  upsertDeviceStmt.run({
    id: params.id,
    label: params.label ?? null,
    last_seen: params.now,
    status: "online",
    battery: params.battery ?? null,
    balance: params.balance ?? null,
    created_at: params.now,
  });
}

const setStatusStmt = db.prepare(`UPDATE devices SET status = ? WHERE id = ?`);
export function setDeviceStatus(id: string, status: DeviceRow["status"]): void {
  setStatusStmt.run(status, id);
}

const allDevicesStmt = db.prepare(`SELECT * FROM devices ORDER BY id`);
export function getDevices(): DeviceRow[] {
  return allDevicesStmt.all() as DeviceRow[];
}

const oneDeviceStmt = db.prepare(`SELECT * FROM devices WHERE id = ?`);
export function getDevice(id: string): DeviceRow | undefined {
  return oneDeviceStmt.get(id) as DeviceRow | undefined;
}

const insertEventStmt = db.prepare(`
  INSERT INTO events (device_id, type, detail, at) VALUES (?, ?, ?, ?)
`);
export function recordEvent(
  deviceId: string,
  type: string,
  detail: string | null,
  at: number,
): void {
  insertEventStmt.run(deviceId, type, detail, at);
}

const recentEventsStmt = db.prepare(`
  SELECT * FROM events ORDER BY at DESC LIMIT ?
`);
export function getRecentEvents(limit = 50): EventRow[] {
  return recentEventsStmt.all(limit) as EventRow[];
}
