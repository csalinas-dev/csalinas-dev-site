// Headless-Chrome screenshotter/measurer over raw CDP. No puppeteer, no deps.
// Usage: node .agent/scripts/shot.mjs <url> <width> <out.png|-> [evalFile.js]
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , url, widthArg, out, evalFile] = process.argv;
const width = Number(widthArg || 1440);
const CHROME =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

const profile = mkdtempSync(join(tmpdir(), "cdp-"));
const chrome = spawn(CHROME, [
  "--headless=new",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--hide-scrollbars",
  "--force-device-scale-factor=1",
  `--window-size=${width},1000`,
  "about:blank",
]);

// Chrome prints the ws:// endpoint on stderr when the port is 0.
const wsUrl = await new Promise((resolve, reject) => {
  let buf = "";
  const t = setTimeout(() => reject(new Error("chrome start timeout")), 30000);
  chrome.stderr.on("data", (d) => {
    buf += d;
    const m = buf.match(/ws:\/\/[^\s]+/);
    if (m) {
      clearTimeout(t);
      resolve(m[0]);
    }
  });
});

const ws = new WebSocket(wsUrl); // global WebSocket, Node 22+
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};
const send = (method, params = {}, sessionId) =>
  new Promise((resolve) => {
    const n = ++id;
    pending.set(n, resolve);
    ws.send(JSON.stringify({ id: n, method, params, sessionId }));
  });

const { result: target } = await send("Target.createTarget", {
  url: "about:blank",
});
const { result: attached } = await send("Target.attachToTarget", {
  targetId: target.targetId,
  flatten: true,
});
const s = attached.sessionId;

await send("Page.enable", {}, s);
await send("Runtime.enable", {}, s);
await send(
  "Emulation.setDeviceMetricsOverride",
  { width, height: 1000, deviceScaleFactor: 1, mobile: width < 900 },
  s
);
await send("Page.navigate", { url }, s);
await new Promise((r) => setTimeout(r, 3500)); // fonts + next/image decode

if (evalFile) {
  const { result } = await send(
    "Runtime.evaluate",
    {
      expression: readFileSync(evalFile, "utf8"),
      returnByValue: true,
      awaitPromise: true,
    },
    s
  );
  console.log(JSON.stringify(result.result?.value ?? result, null, 2));
}

if (out && out !== "-") {
  const { result: metrics } = await send("Page.getLayoutMetrics", {}, s);
  const h = Math.ceil(metrics.cssContentSize.height);
  await send(
    "Emulation.setDeviceMetricsOverride",
    { width, height: h, deviceScaleFactor: 1, mobile: width < 900 },
    s
  );
  await new Promise((r) => setTimeout(r, 800));
  const { result: shot } = await send(
    "Page.captureScreenshot",
    { format: "png", captureBeyondViewport: true },
    s
  );
  writeFileSync(out, Buffer.from(shot.data, "base64"));
  console.error(`wrote ${out} (${width}x${h})`);
}

ws.close();
chrome.kill();
process.exit(0);
