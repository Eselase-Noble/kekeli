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

  databaseUrl: str(
    "DATABASE_URL",
    "postgres://postgres:postgres@localhost:5432/ecg_monitor",
  ),

  offlineAfterSeconds: num("OFFLINE_AFTER_SECONDS", 180),
  checkIntervalSeconds: num("CHECK_INTERVAL_SECONDS", 30),

  // Prepaid balance (kWh "units").
  lowBalanceUnits: num("LOW_BALANCE_UNITS", 10),
  fullBalanceUnits: num("FULL_BALANCE_UNITS", 100), // gauge reference for "full"
  pricePerUnit: num("PRICE_PER_UNIT", 0), // GHS per kWh; 0 = unknown, hide cost
  currency: str("CURRENCY", "GHS"),

  smtp: {
    host: str("SMTP_HOST"),
    port: num("SMTP_PORT", 587),
    user: str("SMTP_USER"),
    // Gmail app passwords are shown with spaces; strip them.
    pass: str("SMTP_PASS").replace(/\s/g, ""),
    to: str("ALERT_EMAIL_TO"),
  },

  telegram: {
    botToken: str("TELEGRAM_BOT_TOKEN"),
    chatId: str("TELEGRAM_CHAT_ID"),
  },

  // SMS via Arkesel (Ghana). Recipients: comma-separated phone numbers.
  arkesel: {
    apiKey: str("ARKESEL_API_KEY"),
    senderId: str("ARKESEL_SENDER_ID"),
    to: str("ALERT_SMS_TO"),
  },
};

export const emailEnabled = Boolean(
  config.smtp.host && config.smtp.user && config.smtp.pass && config.smtp.to,
);

export const telegramEnabled = Boolean(
  config.telegram.botToken && config.telegram.chatId,
);

export const smsEnabled = Boolean(
  config.arkesel.apiKey && config.arkesel.senderId && config.arkesel.to,
);
