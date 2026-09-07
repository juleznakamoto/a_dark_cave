/**
 * Open a 1920x1080 trailer capture window (Chrome app mode, 1x scale).
 *
 * High-DPI Windows scaling (this machine is 200% on a 3:2 3120x2080 panel)
 * makes a normal fullscreen capture the wrong aspect and the wrong CSS size.
 * This launches a dedicated Chrome profile so those flags actually apply.
 *
 * Usage:
 *   npm run trailer
 *   npm run trailer -- http://localhost:5000/?devSave=village
 *   npm run trailer -- --devSave=bastion
 *   npm run trailer -- --port=5000 --devSave=sleep-active
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const TRAILER_WIDTH = 1920;
const TRAILER_HEIGHT = 1080;
const DEBUG_PORT = 9333;
const DEFAULT_PORT = Number(process.env.PORT) || 5000;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  join(homedir(), "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"),
].filter(Boolean);

function parseArgs(argv) {
  let url = null;
  let port = DEFAULT_PORT;
  let devSave = null;
  for (const arg of argv) {
    if (arg.startsWith("http://") || arg.startsWith("https://")) {
      url = arg;
      continue;
    }
    if (arg.startsWith("--port=")) {
      port = Number(arg.slice("--port=".length)) || DEFAULT_PORT;
      continue;
    }
    if (arg.startsWith("--devSave=")) {
      devSave = arg.slice("--devSave=".length);
    }
  }
  if (!url) {
    const target = new URL(`http://localhost:${port}/`);
    if (devSave) target.searchParams.set("devSave", devSave);
    url = target.href;
  }
  return { url };
}

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    "Chrome not found. Install Chrome or set CHROME_PATH to chrome.exe.",
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch {
      // Chrome is still starting.
    }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function cdpCall(ws, idRef, method, params) {
  const id = ++idRef.value;
  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      let payload;
      try {
        payload = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (payload.id !== id) return;
      ws.removeEventListener("message", onMessage);
      if (payload.error) {
        reject(new Error(`${method}: ${JSON.stringify(payload.error)}`));
        return;
      }
      resolve(payload.result);
    };
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function withCdp(wsUrl, run) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  const idRef = { value: 0 };
  const send = (method, params) => cdpCall(ws, idRef, method, params);
  try {
    return await run(send);
  } finally {
    ws.close();
  }
}

async function sizeContentArea(page) {
  return withCdp(page.webSocketDebuggerUrl, async (send) => {
    await send("Runtime.enable");
    const windowInfo = await send("Browser.getWindowForTarget", {
      targetId: page.id,
    });
    const windowId = windowInfo.windowId;
    const measure = async () => {
      const result = await send("Runtime.evaluate", {
        expression:
          "({ innerWidth, innerHeight, devicePixelRatio, outerWidth, outerHeight })",
        returnByValue: true,
      });
      return result.result.value;
    };

    let metrics = await measure();
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const deltaW = TRAILER_WIDTH - metrics.innerWidth;
      const deltaH = TRAILER_HEIGHT - metrics.innerHeight;
      if (deltaW === 0 && deltaH === 0 && metrics.devicePixelRatio === 1) {
        return metrics;
      }
      const bounds = (
        await send("Browser.getWindowBounds", { windowId })
      ).bounds;
      await send("Browser.setWindowBounds", {
        windowId,
        bounds: {
          left: bounds.left,
          top: bounds.top,
          width: bounds.width + deltaW,
          height: bounds.height + deltaH,
          windowState: "normal",
        },
      });
      await sleep(150);
      metrics = await measure();
    }
    return metrics;
  });
}

async function warnIfServerDown(url) {
  try {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      console.warn(
        `[trailer] ${url} returned ${response.status}. Is npm run dev running?`,
      );
    }
  } catch {
    console.warn(`[trailer] Could not reach ${url}. Start the game with npm run dev first.`);
  }
}

const { url } = parseArgs(process.argv.slice(2));
const chromePath = findChrome();
const profileDir = join(
  process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"),
  "a-dark-cave-trailer-chrome",
);
mkdirSync(profileDir, { recursive: true });

await warnIfServerDown(url);

console.log(`[trailer] Opening ${url}`);
console.log(`[trailer] Chrome: ${chromePath}`);
console.log(`[trailer] Profile: ${profileDir}`);

const child = spawn(
  chromePath,
  [
    `--app=${url}`,
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--remote-debugging-address=127.0.0.1`,
    `--window-size=${TRAILER_WIDTH},${TRAILER_HEIGHT}`,
    "--window-position=80,40",
    "--force-device-scale-factor=1",
    "--high-dpi-support=1",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-infobars",
    "--disable-session-crashed-bubble",
    "--hide-crash-restore-bubble",
    "--disable-features=TranslateUI,MediaRouter",
    "--disable-sync",
  ],
  { detached: true, stdio: "ignore" },
);
child.unref();

let targets;
try {
  targets = await waitForJson(
    `http://127.0.0.1:${DEBUG_PORT}/json/list`,
    20000,
  );
} catch (error) {
  console.warn(`[trailer] ${error.message}`);
  console.warn(
    "[trailer] Window launched, but it could not be resized. In OBS, crop the title bar.",
  );
  process.exit(0);
}

const page = targets.find(
  (target) =>
    target.type === "page" &&
    typeof target.url === "string" &&
    (target.url.startsWith("http://") || target.url.startsWith("https://")),
);
if (!page?.webSocketDebuggerUrl) {
  console.warn("[trailer] No page target yet. Size the window in OBS if needed.");
  process.exit(0);
}

try {
  const metrics = await sizeContentArea(page);
  const titleBar = Math.max(0, metrics.outerHeight - metrics.innerHeight);
  console.log(
    `[trailer] Content ${metrics.innerWidth}x${metrics.innerHeight} @ ${metrics.devicePixelRatio}x`,
  );
  if (
    metrics.innerWidth !== TRAILER_WIDTH ||
    metrics.innerHeight !== TRAILER_HEIGHT ||
    metrics.devicePixelRatio !== 1
  ) {
    console.warn(
      "[trailer] Could not lock an exact 1920x1080 content area. Check the window is fully on-screen.",
    );
  }
  if (titleBar > 0) {
    console.log(
      `[trailer] Chrome title bar is ${titleBar}px. In OBS Window Capture, add a Crop/Pad filter and crop Top ${titleBar}.`,
    );
  }
} catch (error) {
  console.warn(`[trailer] Resize failed: ${error.message}`);
  console.warn("[trailer] Capture the window in OBS and crop the title bar.");
}

console.log("[trailer] OBS: canvas and output 1920x1080, Window Capture this Chrome app window.");
