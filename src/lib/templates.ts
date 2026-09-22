/**
 * Alert templates for Kekeli, rendered once per event and reused across every
 * channel: rich HTML email, plain-text email, and SMS.
 *
 * Design notes:
 *  - Email is a table-based layout for broad client support (Gmail, Outlook, iOS).
 *  - SMS is coerced to the GSM-7 charset: any emoji / curly quote / en-dash
 *    silently forces the whole message into UCS-2 (70 chars/segment instead of
 *    160, double the cost). We keep the fixed parts ASCII-clean.
 */

export interface Alert {
  subject: string;
  text: string;
  html: string;
  sms: string;
}

const BRAND = "Kekeli";
const TAGLINE = "Home power & prepaid monitor";

// Palette (kept in sync with the app's brand, but inlined for email clients).
const C = {
  ink: "#111827",
  body: "#374151",
  muted: "#6b7280",
  line: "#e5e7eb",
  paper: "#f4f5f7",
  amber: "#c2410c", // deep amber used for the header + accents
  amberSoft: "#fff7ed",
  amberEdge: "#fed7aa",
  green: "#15803d",
  greenSoft: "#f0fdf4",
  greenEdge: "#bbf7d0",
  red: "#b91c1c",
  redSoft: "#fef2f2",
  redEdge: "#fecaca",
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function gsmSafe(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[·•]/g, "-");
}

function composeSms(lines: Array<string | null | undefined>): string {
  return lines
    .filter((l): l is string => Boolean(l))
    .map(gsmSafe)
    .join("\n");
}

function longDate(when: Date): string {
  return when.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function shortTime(when: Date): string {
  return when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} seconds`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"}`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h} hour${h === 1 ? "" : "s"}${rem ? ` ${rem} min` : ""}`;
}

/** Shared email chrome. `accent` colours the header + status rail. */
function shell(opts: {
  subject: string;
  preheader: string;
  accent: string;
  statusBg: string;
  statusEdge: string;
  statusText: string;
  statusLabel: string;
  headline: string;
  leadHtml: string;
  factRows: Array<[string, string]>;
  when: Date;
}): string {
  const {
    subject,
    preheader,
    accent,
    statusBg,
    statusEdge,
    statusText,
    statusLabel,
    headline,
    leadHtml,
    factRows,
    when,
  } = opts;

  const facts = factRows
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:6px 0;font-size:13px;color:${C.muted};width:130px;vertical-align:top;">${escapeHtml(k)}</td>
          <td style="padding:6px 0;font-size:14px;color:${C.ink};font-weight:600;">${escapeHtml(v)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.paper};-webkit-font-smoothing:antialiased;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${C.line};">
        <!-- header -->
        <tr><td style="background:${accent};padding:20px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:19px;font-weight:700;color:#ffffff;letter-spacing:0.2px;">${BRAND}</td>
            <td align="right" style="font-size:12px;color:rgba(255,255,255,0.85);">${escapeHtml(TAGLINE)}</td>
          </tr></table>
        </td></tr>
        <!-- status strip -->
        <tr><td style="padding:26px 28px 0;">
          <span style="display:inline-block;background:${statusBg};color:${statusText};border:1px solid ${statusEdge};font-size:12px;font-weight:700;padding:6px 12px;border-radius:8px;">${escapeHtml(statusLabel)}</span>
          <h1 style="margin:16px 0 0;font-size:22px;line-height:1.3;color:${C.ink};font-weight:700;">${escapeHtml(headline)}</h1>
          <div style="margin-top:10px;font-size:15px;line-height:1.55;color:${C.body};">${leadHtml}</div>
        </td></tr>
        <!-- facts -->
        <tr><td style="padding:18px 28px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line};padding-top:8px;">
            ${facts}
          </table>
        </td></tr>
        <tr><td style="padding:14px 28px 26px;">
          <div style="font-size:12px;color:${C.muted};">Recorded ${escapeHtml(longDate(when))}</div>
        </td></tr>
        <!-- footer -->
        <tr><td style="background:${C.paper};padding:16px 28px;border-top:1px solid ${C.line};">
          <div style="font-size:12px;color:${C.muted};line-height:1.5;">
            You're getting this because this address is set to receive ${BRAND} power alerts for your home.
          </div>
        </td></tr>
      </table>
      <div style="font-size:11px;color:${C.muted};margin-top:12px;">${BRAND} — ${escapeHtml(TAGLINE)}</div>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildPowerOffAlert(
  deviceLabel: string,
  lastSeen: number,
  silentMs: number,
  now: number,
): Alert {
  const when = new Date(now);
  const subject = `Power is OFF at home — ${deviceLabel}`;
  const lead = `<strong style="color:${C.ink};">${escapeHtml(deviceLabel)}</strong> stopped reporting ${escapeHtml(formatDuration(silentMs))} ago. This usually means the power (light) has gone out.`;

  const html = shell({
    subject,
    preheader: `${deviceLabel} went silent — the power is likely out.`,
    accent: C.amber,
    statusBg: C.redSoft,
    statusEdge: C.redEdge,
    statusText: C.red,
    statusLabel: "Power lost",
    headline: "The light just went out",
    leadHtml: lead,
    factRows: [
      ["Device", deviceLabel],
      ["Last seen", longDate(new Date(lastSeen))],
      ["Silent for", formatDuration(silentMs)],
    ],
    when,
  });

  const text = [
    `${BRAND} — Power lost`,
    ``,
    `${deviceLabel} stopped reporting ${formatDuration(silentMs)} ago.`,
    `The power (light) has likely gone out.`,
    ``,
    `Last seen: ${longDate(new Date(lastSeen))}`,
    `Recorded: ${longDate(when)}`,
  ].join("\n");

  const sms = composeSms([
    `${BRAND}: POWER OUT`,
    `${deviceLabel} went silent ${formatDuration(silentMs)} ago.`,
    `Last seen ${shortTime(new Date(lastSeen))}.`,
  ]);

  return { subject, text, html, sms };
}

export function buildPowerOnAlert(
  deviceLabel: string,
  now: number,
  outageMs?: number,
): Alert {
  const when = new Date(now);
  const subject = `Power is BACK at home — ${deviceLabel}`;
  const outageLine = outageMs
    ? ` The outage lasted about ${formatDuration(outageMs)}.`
    : "";
  const lead = `<strong style="color:${C.ink};">${escapeHtml(deviceLabel)}</strong> is reporting again — the power is back on.${escapeHtml(outageLine)}`;

  const facts: Array<[string, string]> = [["Device", deviceLabel], ["Back on", longDate(when)]];
  if (outageMs) facts.push(["Outage length", formatDuration(outageMs)]);

  const html = shell({
    subject,
    preheader: `${deviceLabel} is back online — the power has returned.`,
    accent: C.amber,
    statusBg: C.greenSoft,
    statusEdge: C.greenEdge,
    statusText: C.green,
    statusLabel: "Power restored",
    headline: "The light is back on",
    leadHtml: lead,
    factRows: facts,
    when,
  });

  const text = [
    `${BRAND} — Power restored`,
    ``,
    `${deviceLabel} is reporting again. The power is back on.${outageLine}`,
    ``,
    `Back on: ${longDate(when)}`,
  ].join("\n");

  const sms = composeSms([
    `${BRAND}: POWER BACK`,
    `${deviceLabel} is on again${outageMs ? ` after ${formatDuration(outageMs)}` : ""}.`,
    `at ${shortTime(when)}`,
  ]);

  return { subject, text, html, sms };
}

export function buildLowBalanceAlert(
  deviceLabel: string,
  units: number,
  currency: string,
  now: number,
  daysLeft?: number | null,
): Alert {
  const when = new Date(now);
  const subject = `Low prepaid units — ${units} left`;
  const daysLine =
    daysLeft != null && Number.isFinite(daysLeft)
      ? ` At your recent usage that's roughly ${daysLeft.toFixed(daysLeft < 2 ? 1 : 0)} day${daysLeft >= 2 ? "s" : ""} left.`
      : "";
  const lead = `Your prepaid meter is down to <strong style="color:${C.ink};">${units} units</strong>.${escapeHtml(daysLine)} Top up soon to avoid a self-inflicted blackout.`;

  const facts: Array<[string, string]> = [
    ["Meter", deviceLabel],
    ["Units left", `${units} kWh`],
  ];
  if (daysLeft != null && Number.isFinite(daysLeft)) {
    facts.push(["Est. days left", daysLeft < 2 ? daysLeft.toFixed(1) : String(Math.round(daysLeft))]);
  }

  const html = shell({
    subject,
    preheader: `Only ${units} prepaid units left — top up soon.`,
    accent: C.amber,
    statusBg: C.amberSoft,
    statusEdge: C.amberEdge,
    statusText: C.amber,
    statusLabel: "Low balance",
    headline: "Your units are running low",
    leadHtml: lead,
    factRows: facts,
    when,
  });

  const text = [
    `${BRAND} — Low balance`,
    ``,
    `Your prepaid meter has ${units} units left.${daysLine}`,
    `Top up soon to avoid a blackout.`,
    ``,
    `Recorded: ${longDate(when)}`,
  ].join("\n");

  const sms = composeSms([
    `${BRAND}: LOW UNITS`,
    `${units} kWh left on ${deviceLabel}.`,
    daysLeft != null && Number.isFinite(daysLeft)
      ? `~${daysLeft < 2 ? daysLeft.toFixed(1) : Math.round(daysLeft)} day(s) left. Top up soon.`
      : `Top up soon.`,
  ]);

  return { subject, text, html, sms };
}
