"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview", icon: IconBolt },
  { href: "/balance", label: "Prepaid balance", icon: IconGauge },
  { href: "/devices", label: "Devices", icon: IconChip },
  { href: "/activity", label: "Activity", icon: IconPulse },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col bg-bark px-3 py-5 md:flex">
      <div className="flex items-center gap-2.5 px-2.5 pb-6">
        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand-500 text-lg text-bark shadow-sm">
          ⚡
        </span>
        <div className="leading-tight">
          <p className="font-display text-[17px] font-bold text-white">Kekeli</p>
          <p className="font-mono text-[10px] text-bark-text-2">home power</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] transition ${
                isActive
                  ? "bg-bark-2 font-semibold text-white"
                  : "font-medium text-bark-text hover:bg-bark-2/60 hover:text-white"
              }`}
            >
              <span
                className={`transition ${isActive ? "text-brand-400" : "text-bark-text-2 group-hover:text-bark-text"}`}
              >
                <Icon />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-[10px] bg-bark-2/70 px-3.5 py-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-bark-text-2">Phase 2</p>
        <p className="mt-1 text-[12px] leading-snug text-bark-text">
          Point an old phone at the meter to read units automatically.
        </p>
      </div>
    </aside>
  );
}

/* --- small, hand-picked line icons (18px, currentColor) --- */
function IconBolt() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  );
}
function IconGauge() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 14 15 9" />
      <path d="M3.5 18a9 9 0 1 1 17 0" />
      <circle cx="12" cy="14" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconChip() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </svg>
  );
}
function IconPulse() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l2 6 4-14 2 8h6" />
    </svg>
  );
}
