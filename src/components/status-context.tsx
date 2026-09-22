"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type DeviceStatus = "online" | "offline" | "unknown";

export interface Device {
  id: string;
  label: string | null;
  status: DeviceStatus;
  battery: number | null;
  balance: number | null;
  last_seen: number | null;
  silentSeconds: number | null;
}

export interface Balance {
  units: number | null;
  updatedAt: number | null;
  burnPerDay: number | null;
  daysLeft: number | null;
  low: boolean;
  lowThreshold: number;
  fullReference: number;
  currency: string;
  pricePerUnit: number;
}

export interface StatusEvent {
  id: number;
  device_id: string;
  type: string;
  detail: string | null;
  at: number;
}

export interface StatusResponse {
  ok: boolean;
  now: number;
  offlineAfterSeconds: number;
  channels: string;
  devices: Device[];
  events: StatusEvent[];
  balance: Balance;
}

interface StatusCtx {
  data: StatusResponse | null;
  error: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<StatusCtx | null>(null);

export function StatusProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const json = (await res.json()) as StatusResponse;
      setData(json);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  return <Ctx.Provider value={{ data, error, refresh }}>{children}</Ctx.Provider>;
}

export function useStatus(): StatusCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStatus must be used within StatusProvider");
  return ctx;
}
