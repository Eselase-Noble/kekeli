import { config } from "./config.js";
import { createServer } from "./server.js";
import { startMonitor } from "./monitor.js";
import { channelSummary } from "./notify.js";

const app = createServer();

app.listen(config.port, () => {
  console.log(`\n  ⚡ ECG Monitor running`);
  console.log(`  Dashboard:  http://localhost:${config.port}`);
  console.log(`  Heartbeat:  POST http://localhost:${config.port}/api/heartbeat`);
  console.log(`  Alerts via: ${channelSummary()}`);
  console.log(
    `  Offline after ${config.offlineAfterSeconds}s of silence, ` +
      `checked every ${config.checkIntervalSeconds}s\n`,
  );
  startMonitor();
});
