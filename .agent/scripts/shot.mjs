// Headless-Chrome screenshotter/measurer over raw CDP. No puppeteer, no deps.
// Usage: node .agent/scripts/shot.mjs <url> <width> <out.png|-> [evalFile.js]
// Prints {"viewport":{w,h,requested},"result":<evalFile value>} on stdout — the viewport is
// read back from the page, not assumed from argv.
// Exit 0 ok, 2 bad usage, 1 runtime/CDP failure, 3 the page script reported failure
// (`ok` falsy, threw, or returned nothing at all).
// A result with NO `ok` field is a measurement, not an assertion: it exits 0 and says so
// on stderr. A genuinely side-effect-only page script should end with `true`.
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , url, widthArg, out, evalFile] = process.argv;
const width = Number(widthArg);
const HEIGHT = 1000;

const USAGE =
  "usage: node .agent/scripts/shot.mjs <url> <width> <out.png|-> [evalFile.js]";
const usageError = (msg) => {
  console.error(`shot.mjs: ${msg}\n${USAGE}`);
  process.exit(2);
};
if (!url) usageError("missing <url>");
if (widthArg === undefined) usageError("missing <width>");
if (!Number.isFinite(width) || width <= 0)
  usageError(`<width> must be a positive number, got ${JSON.stringify(widthArg)}`);
if (!out) usageError("missing <out.png|-> (use - to skip the screenshot)");
if (evalFile && !existsSync(evalFile)) usageError(`evalFile not found: ${evalFile}`);

const CHROME =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

let ws;
const profile = mkdtempSync(join(tmpdir(), "cdp-"));
const chrome = spawn(CHROME, [
  "--headless=new",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--hide-scrollbars",
  "--force-device-scale-factor=1",
  `--window-size=${width},${HEIGHT}`,
  "about:blank",
]);
// Runs on normal exit and on the fatal exit an unhandled rejection causes. Both
// calls are synchronous — an exit handler cannot await, so nothing async here.
process.on("exit", () => {
  try {
    ws?.close();
  } catch {}
  try {
    chrome.kill();
  } catch {}
});

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

ws = new WebSocket(wsUrl); // global WebSocket, Node 22+
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
  new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, (msg) =>
      msg.error
        ? reject(
            new Error(
              `CDP ${method} failed: ${msg.error.message}${
                msg.error.data ? ` - ${msg.error.data}` : ""
              }`
            )
          )
        : resolve(msg)
    );
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

// A thrown expression comes back inside a *successful* CDP result, so send()
// rejecting cannot cover it.
const evaluate = async (expression, what = "evaluate") => {
  const { result } = await send(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    s
  );
  if (result.exceptionDetails)
    throw new Error(
      `${what} threw: ${
        result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text
      }`
    );
  return result.result?.value;
};

await send("Page.enable", {}, s);
await send("Runtime.enable", {}, s);
await send(
  "Emulation.setDeviceMetricsOverride",
  { width, height: HEIGHT, deviceScaleFactor: 1, mobile: width < 900 },
  s
);
// A dead server is reported as errorText inside a successful result, not as a CDP error.
const { result: nav } = await send("Page.navigate", { url }, s);
if (nav.errorText) throw new Error(`navigation failed: ${nav.errorText} (${url})`);
await new Promise((r) => setTimeout(r, 3500)); // fonts + next/image decode

// Ground truth, read back from the page rather than assumed from argv.
const viewport = await evaluate("({w: innerWidth, h: innerHeight})");
viewport.requested = width;
if (viewport.w !== width)
  console.error(
    `shot.mjs: WARNING measured viewport ${viewport.w}x${viewport.h} but ${width} was requested. ` +
      `A page with no <meta name="viewport"> lays out at 980px under mobile emulation (on below 900px).`
  );

// The page script's own verdict, recorded here and acted on at the very end — a
// failing run still prints its payload and still writes its screenshot, because a
// failed replay is exactly the run you want the PNG of.
const payload = { viewport };
let failure = null; // the reason this run failed, or null
let assertedNothing = false; // a measurement: it returned a value, but no `ok`

if (evalFile) {
  let result;
  try {
    result = await evaluate(readFileSync(evalFile, "utf8"), "the page script");
  } catch (e) {
    // An assertion that never finished is not an assertion that passed.
    failure = e.message;
    payload.error = failure;
  }

  if (!failure) {
    payload.result = result;

    if (result === undefined || result === null) {
      // JSON.stringify drops an undefined `result` key, so the printed payload
      // would otherwise say nothing at all. The usual cause is an async IIFE
      // that forgot to `return`; a real side-effect-only script ends with `true`.
      failure =
        "the page script returned no value — nothing was measured and nothing was asserted";
      payload.error = failure;
    } else if (typeof result === "object" && "ok" in result) {
      if (!result.ok)
        failure = `the page script reported ok: ${JSON.stringify(result.ok)}${
          result.error ? ` — ${result.error}` : ""
        }`;
    } else {
      assertedNothing = true;
    }
  }
}

console.log(JSON.stringify(payload, null, 2));

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
  console.error(
    `wrote ${out} (${viewport.w}x${h} px; viewport ${viewport.w}x${viewport.h})`
  );
}

if (failure) {
  // Repeated on stderr, in full: a caller reading only the tail — or only
  // stderr — still gets to see WHAT disagreed, which is the part that is
  // actionable. A bare non-zero teaches nobody anything.
  console.error(`shot.mjs: FAILED — ${failure}`);
  console.error(JSON.stringify(payload.result ?? payload, null, 2));
  process.exit(3);
}

if (assertedNothing)
  console.error(
    `shot.mjs: NOTE the page script returned no "ok" field, so this run asserted nothing — ` +
      `exit 0 means Chrome ran and printed a value, not that anything passed.`
  );

process.exit(0);
