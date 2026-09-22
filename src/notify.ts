import nodemailer from "nodemailer";
import {
  config,
  emailEnabled,
  telegramEnabled,
} from "./config.js";

let transporter: nodemailer.Transporter | null = null;
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transporter;
}

async function sendEmail(subject: string, body: string): Promise<void> {
  if (!emailEnabled) return;
  try {
    await getTransporter().sendMail({
      from: config.smtp.user,
      to: config.smtp.to,
      subject,
      text: body,
    });
    console.log(`[notify] email sent: ${subject}`);
  } catch (err) {
    console.error("[notify] email failed:", err);
  }
}

async function sendTelegram(text: string): Promise<void> {
  if (!telegramEnabled) return;
  try {
    const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: config.telegram.chatId,
        text,
        parse_mode: "HTML",
      }),
    });
    if (!res.ok) {
      console.error("[notify] telegram failed:", res.status, await res.text());
    } else {
      console.log("[notify] telegram sent");
    }
  } catch (err) {
    console.error("[notify] telegram failed:", err);
  }
}

/** Fan out one alert to every enabled channel. */
export async function notify(title: string, body: string): Promise<void> {
  const line = `${title}\n${body}`.trim();
  await Promise.all([
    sendEmail(title, body),
    sendTelegram(`<b>${escapeHtml(title)}</b>\n${escapeHtml(body)}`),
  ]);
  if (!emailEnabled && !telegramEnabled) {
    console.log(`[notify] (no channels configured) ${line}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function channelSummary(): string {
  const on: string[] = [];
  if (emailEnabled) on.push("email");
  if (telegramEnabled) on.push("telegram");
  return on.length ? on.join(", ") : "none (set up .env to enable)";
}
