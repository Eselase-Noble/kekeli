# ⚡ Kekeli

> **Kekeli** — Ewe for *"light"*.

Know whether **the light is on at home** — and (soon) **your prepaid meter balance** —
from anywhere. Built for Ghana's ECG prepaid setup, but works with any grid.

The idea is simple: a cheap always-on device at home sends a small **"I'm alive"
heartbeat** every minute. While there's power + internet, it reports in. When the
power (light) goes out, the heartbeats stop — and the server alerts you.

> **Any device that can make an HTTP request is compatible** — an ESP32, an old
> phone, a Raspberry Pi, a smart plug, even a `curl` cron job. They all just POST
> to the same endpoint.

```
  [ Device at home ]              [ Kekeli server ]            [ You at work ]
  phone / ESP32 / plug  ─ping─▶   tracks last-seen   ──▶   email / SMS / Telegram
  (anything with HTTP)            detects outages          "⚠️ Power OFF at 2:14pm"
                                  + status dashboard        "✅ Power back at 3:40pm"
```

---

## What works today (Phase 1)

- ✅ Real-time **power on/off detection** via device heartbeats
- ✅ **Prepaid balance tracking** — record your meter units, see a fuel gauge,
  an estimated days-left (from usage), and refill cost
- ✅ **Alerts** on power lost/restored **and low balance** — **email**,
  **SMS (Arkesel/Ghana)** and **Telegram**, with professional templates
- ✅ A distinctive **Next.js + Tailwind dashboard** (sidebar + KPIs + balance +
  activity) you can open on your phone at work
- ✅ **Event history** (outages, recoveries, balance updates, with timestamps)
- ✅ Postgres-backed, so it survives restarts and free-tier redeploys
- ✅ Ready-to-use device clients: **ESP32/ESP8266 sketch** + **phone/PC script**

### Coming next
- **Phase 2** — point an old phone's camera at the meter and auto-read the
  balance (OCR), so you don't type it in
- **Phase 3** — history graphs, multiple homes, on-demand "is the power on?" check

---

## Tech stack

Matches its sibling project **obofo** so the two feel related:

- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS v4** with a small design-token system (pine = light on, clay = light off)
- **Postgres** via `pg`
- **Nodemailer** (email) · **Arkesel** (SMS) · **Telegram Bot API**
- Background outage-detection loop started from `src/instrumentation.ts`

---

## Quick start

### 1. Prerequisites
- **Node.js 20+**
- **Postgres** running locally (or a cloud connection string)

### 2. Install
```bash
npm install
cp .env.example .env      # then edit .env (see below)
```

### 3. Create the database (local Postgres)
```bash
createdb -U postgres ecg_monitor      # or: psql -U postgres -c "CREATE DATABASE ecg_monitor;"
```
Tables are created automatically on first run (via `instrumentation.ts`).

### 4. Configure `.env`
At minimum set a strong `API_KEY` and your `DATABASE_URL`. Everything else has
sane defaults.

```ini
API_KEY=some-long-random-string
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ecg_monitor
OFFLINE_AFTER_SECONDS=180        # alert after 3 missed 60s heartbeats
```

Enable alerts (optional — any combination):

- **Email** (free with a Gmail *App Password*): fill `SMTP_*` and `ALERT_EMAIL_TO`.
- **SMS** (Ghana, via [Arkesel]): set `ARKESEL_API_KEY`, `ARKESEL_SENDER_ID`, `ALERT_SMS_TO`.
- **Telegram** (free): create a bot with [@BotFather], message it once, get your
  chat id from [@userinfobot], then set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.

### 5. Run
```bash
npm run dev                 # development (hot reload)  → http://localhost:3000
# or
npm run build && npm start  # production
```

> If port 3000 is taken (e.g. by obofo), run on another port:
> `PORT=3005 npm run dev`

---

## Connecting a device

Every device sends the same heartbeat. Pick whichever hardware you have.

### Test it with curl (no hardware needed)
```bash
curl -X POST http://localhost:3000/api/heartbeat \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"id":"home","label":"My House","battery":90}'
```

### Old phone or any computer
Use the ready-made script — it pings every 60s and reports battery on Termux:
```bash
SERVER=https://your-server.com API_KEY=YOUR_API_KEY DEVICE_ID=home-phone \
  ./devices/phone-or-pc/heartbeat.sh
```
On Android: install **Termux**, `pkg install curl`, then run it. Keep it alive
with **Termux:Boot** + `termux-wake-lock`.

### ESP32 / ESP8266
Open `devices/esp32/heartbeat.ino` in the Arduino IDE, fill in your WiFi +
server details, and flash. ~GHS 40–80 of hardware.

> ⚠️ **The router problem:** your WiFi router also dies when the power goes out,
> so a WiFi device can't send a "power went off" message — the server infers the
> outage from *silence*, which works fine. To be extra sure, put the router (and
> device) on a small **UPS/power bank**, or use an **ESP32 + SIM module** / a
> **phone on mobile data** so it can confirm the outage even without home WiFi.

---

## API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/heartbeat` | `x-api-key` | Device check-in (JSON body: `id`, `label?`, `battery?`, `balance?`) |
| `GET`  | `/api/heartbeat?id=...&key=...` | key in query | Same, for minimal devices that only do GET |
| `GET`  | `/api/status` | none | Dashboard data: devices, events + balance summary |
| `POST` | `/api/balance` | `x-api-key` | Set current prepaid units (JSON: `units`, `deviceId?`) |
| `GET`  | `/api/balance` | none | Current balance summary |
| `GET`  | `/api/health` | none | Health check for hosting platforms |

---

## Configuration reference

| Variable | Default | Meaning |
|----------|---------|---------|
| `PORT` | `3000` | HTTP port (`next start`/`next dev`) |
| `API_KEY` | `change-me` | Shared secret devices must send |
| `DATABASE_URL` | local postgres | Postgres connection string |
| `PGSSL` | — | Set to `1` for cloud Postgres that requires SSL |
| `OFFLINE_AFTER_SECONDS` | `180` | Silence before a device is declared OFF |
| `CHECK_INTERVAL_SECONDS` | `30` | How often the monitor re-evaluates devices |
| `LOW_BALANCE_UNITS` | `10` | Units at/below which a low-balance alert fires |
| `FULL_BALANCE_UNITS` | `100` | Gauge "full" reference on the dashboard |
| `PRICE_PER_UNIT` | `0` | GHS per kWh, for refill-cost estimate (0 = hide) |
| `CURRENCY` | `GHS` | Currency label |
| `SMTP_HOST/PORT/USER/PASS`, `ALERT_EMAIL_TO` | — | Email alerts (blank = off) |
| `ARKESEL_API_KEY`, `ARKESEL_SENDER_ID`, `ALERT_SMS_TO` | — | SMS alerts (blank = off) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | — | Telegram alerts (blank = off) |

---

## Deploying (so it runs 24/7, not on your laptop)

Any Node host with a Postgres add-on works — **Render, Railway, Fly.io, Vercel**
all have free/cheap tiers:

1. Push this repo to GitHub.
2. Create a Node/Next.js web service; build `npm install && npm run build`, start `npm start`.
3. Add a Postgres instance and paste its URL into `DATABASE_URL` (set `PGSSL=1`).
4. Set `API_KEY` and your alert secrets as environment variables.
5. Point your home device's `SERVER` at the deployed URL.

> Note: the outage-detection loop runs inside the server process
> (`instrumentation.ts`), so deploy as a long-running Node server (not a purely
> serverless/edge setup that spins down).

---

## Project structure

```
src/
  app/
    layout.tsx           # fonts (Space Grotesk / Inter / JetBrains Mono) + metadata
    globals.css          # Tailwind v4 + Kekeli design tokens
    page.tsx             # shell: sidebar + dashboard
    actions.ts           # server action: update balance from the UI
    api/
      heartbeat/route.ts # device check-in (POST + GET)
      status/route.ts    # dashboard data (devices, events, balance)
      balance/route.ts   # get/set prepaid units
      health/route.ts    # health check
  components/
    Sidebar.tsx          # dark nav rail with scrollspy
    Dashboard.tsx        # KPIs + balance panel + devices + activity
  lib/
    config.ts            # env config
    db.ts                # Postgres layer (devices, events, balance)
    notify.ts            # email + SMS + Telegram fan-out
    templates.ts         # professional email + GSM-safe SMS templates
    monitor.ts           # outage/recovery detection + alerts
    balance.ts           # balance summary, burn-rate estimate, low-balance alert
  instrumentation.ts     # startup: init DB, start monitor loop
devices/
  esp32/heartbeat.ino        # ESP32/ESP8266 client
  phone-or-pc/heartbeat.sh   # phone (Termux) / computer client
```

---

## Tech

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 (Space Grotesk / Inter /
JetBrains Mono) · Postgres (`pg`) · Nodemailer · Arkesel SMS · Telegram Bot API

[Arkesel]: https://arkesel.com
[@BotFather]: https://t.me/BotFather
[@userinfobot]: https://t.me/userinfobot
