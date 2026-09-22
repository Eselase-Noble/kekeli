import pg from "pg";
import { config } from "@/lib/config";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  // Cloud Postgres (Render/Supabase/etc.) usually needs SSL. Enable it by
  // adding ?sslmode=require to DATABASE_URL, or set PGSSL=1.
  ssl: process.env.PGSSL === "1" ? { rejectUnauthorized: false } : undefined,
});

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS devices (
      id          TEXT PRIMARY KEY,
      label       TEXT,
      last_seen   BIGINT,
      status      TEXT NOT NULL DEFAULT 'unknown',
      battery     INTEGER,
      balance     DOUBLE PRECISION,
      created_at  BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id         BIGSERIAL PRIMARY KEY,
      device_id  TEXT NOT NULL,
      type       TEXT NOT NULL,
      detail     TEXT,
      at         BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_events_device ON events(device_id, at DESC);
  `);
}

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

// Postgres BIGINT comes back as a string via node-pg; coerce numeric fields.
function toDevice(r: any): DeviceRow {
  return {
    id: r.id,
    label: r.label,
    last_seen: r.last_seen === null ? null : Number(r.last_seen),
    status: r.status,
    battery: r.battery === null ? null : Number(r.battery),
    balance: r.balance === null ? null : Number(r.balance),
    created_at: Number(r.created_at),
  };
}

function toEvent(r: any): EventRow {
  return {
    id: Number(r.id),
    device_id: r.device_id,
    type: r.type,
    detail: r.detail,
    at: Number(r.at),
  };
}

export async function recordHeartbeat(params: {
  id: string;
  label?: string | null;
  battery?: number | null;
  balance?: number | null;
  now: number;
}): Promise<void> {
  await pool.query(
    `INSERT INTO devices (id, label, last_seen, status, battery, balance, created_at)
     VALUES ($1, $2, $3, 'online', $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       label     = COALESCE(EXCLUDED.label, devices.label),
       last_seen = EXCLUDED.last_seen,
       status    = 'online',
       battery   = COALESCE(EXCLUDED.battery, devices.battery),
       balance   = COALESCE(EXCLUDED.balance, devices.balance)`,
    [
      params.id,
      params.label ?? null,
      params.now,
      params.battery ?? null,
      params.balance ?? null,
      params.now,
    ],
  );
}

export async function setDeviceStatus(
  id: string,
  status: DeviceRow["status"],
): Promise<void> {
  await pool.query(`UPDATE devices SET status = $1 WHERE id = $2`, [status, id]);
}

export async function getDevices(): Promise<DeviceRow[]> {
  const { rows } = await pool.query(`SELECT * FROM devices ORDER BY id`);
  return rows.map(toDevice);
}

export async function getDevice(id: string): Promise<DeviceRow | undefined> {
  const { rows } = await pool.query(`SELECT * FROM devices WHERE id = $1`, [id]);
  return rows[0] ? toDevice(rows[0]) : undefined;
}

export async function recordEvent(
  deviceId: string,
  type: string,
  detail: string | null,
  at: number,
): Promise<void> {
  await pool.query(
    `INSERT INTO events (device_id, type, detail, at) VALUES ($1, $2, $3, $4)`,
    [deviceId, type, detail, at],
  );
}

export async function getRecentEvents(limit = 50): Promise<EventRow[]> {
  const { rows } = await pool.query(
    `SELECT * FROM events ORDER BY at DESC LIMIT $1`,
    [limit],
  );
  return rows.map(toEvent);
}

// ---- Prepaid balance ----

/** Record a new balance reading: update the device and log a 'balance' event. */
export async function recordBalance(
  deviceId: string,
  units: number,
  at: number,
): Promise<void> {
  await pool.query(
    `INSERT INTO devices (id, last_seen, status, balance, created_at)
     VALUES ($1, $2, 'unknown', $3, $2)
     ON CONFLICT (id) DO UPDATE SET balance = EXCLUDED.balance`,
    [deviceId, at, units],
  );
  await pool.query(
    `INSERT INTO events (device_id, type, detail, at) VALUES ($1, 'balance', $2, $3)`,
    [deviceId, units.toString(), at],
  );
}

export interface BalanceReading {
  at: number;
  units: number;
}

/** Balance readings for a device, oldest first, for burn-rate estimation. */
export async function getBalanceReadings(
  deviceId: string,
  limit = 200,
): Promise<BalanceReading[]> {
  const { rows } = await pool.query(
    `SELECT at, detail FROM events
     WHERE device_id = $1 AND type = 'balance'
     ORDER BY at ASC LIMIT $2`,
    [deviceId, limit],
  );
  return rows
    .map((r) => ({ at: Number(r.at), units: Number(r.detail) }))
    .filter((r) => Number.isFinite(r.units));
}

/** The device holding the most recent balance reading, if any. */
export async function getPrimaryBalanceDevice(): Promise<DeviceRow | undefined> {
  const { rows } = await pool.query(
    `SELECT d.* FROM devices d
     WHERE d.balance IS NOT NULL
     ORDER BY (
       SELECT MAX(at) FROM events e WHERE e.device_id = d.id AND e.type = 'balance'
     ) DESC NULLS LAST
     LIMIT 1`,
  );
  return rows[0] ? toDevice(rows[0]) : undefined;
}
