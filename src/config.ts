import "dotenv/config";

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function str(name: string, fallback = ""): string {
  const raw = process.env[name];
  return raw === undefined ? fallback : raw;
}

export const config = {
  port: num("PORT", 3000),
  apiKey: str("API_KEY", "change-me"),

  offlineAfterSeconds: num("OFFLINE_AFTER_SECONDS", 180),
  checkIntervalSeconds: num("CHECK_INTERVAL_SECONDS", 30),

  smtp: {
    host: str("SMTP_HOST"),
    port: num("SMTP_PORT", 587),
    user: str("SMTP_USER"),
    pass: str("SMTP_PASS"),
    to: str("ALERT_EMAIL_TO"),
  },

  telegram: {
    botToken: str("TELEGRAM_BOT_TOKEN"),
    chatId: str("TELEGRAM_CHAT_ID"),
  },
};

export const emailEnabled = Boolean(
  config.smtp.host && config.smtp.user && config.smtp.pass && config.smtp.to,
);

export const telegramEnabled = Boolean(
  config.telegram.botToken && config.telegram.chatId,
);
