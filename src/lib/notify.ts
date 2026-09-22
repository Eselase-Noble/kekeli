import nodemailer from "nodemailer";
import {
  config,
  emailEnabled,
  telegramEnabled,
  smsEnabled,
} from "@/lib/config";
import type { Alert } from "@/lib/templates";

const ARKESEL_SEND_URL = "https://sms.arkesel.com/api/v2/sms/send";

let transporter: nodemailer.Transporter | null = null;
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const isGmail = /gmail\.com$/i.test(config.smtp.host);
    transporter = isGmail
      ? // nodemailer's built-in Gmail preset is more reliable than raw host/port.
        nodemailer.createTransport({
          service: "gmail",
          auth: { user: config.smtp.user, pass: config.smtp.pass },
        })
      : nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.port === 465,
          auth: { user: config.smtp.user, pass: config.smtp.pass },
        });
  }
  return transporter;
}

async function sendEmail(alert: Alert): Promise<void> {
  if (!emailEnabled) return;
  try {
    await getTransporter().sendMail({
      from: `"Kekeli" <${config.smtp.user}>`,
      to: config.smtp.to,
      subject: alert.subject,
      text: alert.text,
      html: alert.html,
    });
    console.log(`[notify] email sent: ${alert.subject}`);
  } catch (err) {
    console.error("[notify] email failed:", err);
  }
}

async function sendTelegram(alert: Alert): Promise<void> {
  if (!telegramEnabled) return;
  try {
    // Telegram gets the plain-text version wrapped lightly for readability.
    const text = `<b>${escapeHtml(alert.subject)}</b>\n${escapeHtml(alert.text)}`;
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

async function sendSms(alert: Alert): Promise<void> {
  if (!smsEnabled) return;
  const recipients = config.arkesel.to
    .split(",")
    .map((n) => n.replace(/\D/g, ""))
    .filter(Boolean);
  if (recipients.length === 0) return;

  const message = alert.sms.slice(0, 480);
  try {
    const res = await fetch(ARKESEL_SEND_URL, {
      method: "POST",
      headers: {
        "api-key": config.arkesel.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: config.arkesel.senderId,
        recipients,
        message,
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      status?: string;
      message?: string;
    };
    if (!res.ok || payload.status !== "success") {
      console.error(
        `[notify] sms failed (${res.status}):`,
        payload.message ?? "unknown error",
      );
    } else {
      console.log(`[notify] sms sent to ${recipients.length} recipient(s)`);
    }
  } catch (err) {
    console.error("[notify] sms failed:", err);
  }
}

/** Fan out one fully-rendered alert to every enabled channel. */
export async function sendAlert(alert: Alert): Promise<void> {
  await Promise.all([sendEmail(alert), sendTelegram(alert), sendSms(alert)]);
  if (!emailEnabled && !telegramEnabled && !smsEnabled) {
    console.log(`[notify] (no channels configured) ${alert.subject}`);
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
  if (smsEnabled) on.push("sms");
  return on.length ? on.join(", ") : "none (set up .env to enable)";
}
