/*
 * ECG Monitor — ESP32 / ESP8266 heartbeat
 * ----------------------------------------
 * Flash this to a cheap ESP32/ESP8266 plugged into a wall socket.
 * While it has power + WiFi, it pings the server every 60s.
 * When the power (light) goes out, the pings stop -> server alerts you.
 *
 * Arduino IDE: install the ESP32 (or ESP8266) board package, set your
 * board, fill in the CONFIG below, and upload.
 *
 * TIP: to survive the router dying with the power, either put the router
 * on a small UPS, or use an ESP32 with a SIM/GSM module instead of WiFi.
 */

#include <WiFi.h>          // ESP32.  For ESP8266 use <ESP8266WiFi.h>
#include <HTTPClient.h>    // ESP32.  For ESP8266 use <ESP8266HTTPClient.h>

// ------------ CONFIG ------------
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

const char* SERVER   = "http://your-server-or-ip:3000";  // no trailing slash
const char* API_KEY  = "change-me";
const char* DEVICE_ID = "home-esp32";
const char* LABEL     = "Living room";

const unsigned long INTERVAL_MS = 60000;  // ping every 60s
// --------------------------------

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting WiFi");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " connected" : " FAILED");
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) { connectWifi(); return; }

  HTTPClient http;
  String url = String(SERVER) + "/api/heartbeat";
  http.begin(url);
  http.addHeader("content-type", "application/json");
  http.addHeader("x-api-key", API_KEY);

  String body = String("{\"id\":\"") + DEVICE_ID +
                "\",\"label\":\"" + LABEL + "\"}";

  int code = http.POST(body);
  Serial.printf("heartbeat -> HTTP %d\n", code);
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(200);
  connectWifi();
  sendHeartbeat();
}

void loop() {
  sendHeartbeat();
  delay(INTERVAL_MS);
}
