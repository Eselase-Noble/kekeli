"use client";

import { useStatus } from "@/components/status-context";
import { agoMs } from "@/components/panels";

export function Topbar() {
  const { data, error } = useStatus();
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-paper/80 px-5 py-3 backdrop-blur sm:px-8">
      <div className="flex items-center gap-2 md:hidden">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500 text-sm text-bark">⚡</span>
        <span className="font-display font-bold">Kekeli</span>
      </div>
      <div className="ml-auto flex items-center gap-3 text-[12px] text-ink-2">
        <span className={`pill ${error ? "bg-off-50 text-off" : "bg-on-50 text-on"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${error ? "bg-off" : "bg-on"}`} />
          {error ? "offline" : "live"}
        </span>
        <span className="hidden sm:inline">updated {data ? agoMs(data.now, Date.now()) : "…"}</span>
      </div>
    </header>
  );
}
