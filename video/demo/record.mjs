// Records the Notekeeper film from the real app.
//
//   node record.mjs shots 12 18.5 30     → out/demo/shot-<t>.png at those times
//   node record.mjs preview [--until s]  → out/demo/preview.mp4 (30fps, 1280 wide)
//   node record.mjs full                 → out/demo/film-silent.mp4 (60fps, 2 subframes blended)
//
// Every run steps virtual time at 120 Hz: Playwright's clock drives the app's timers,
// rAF and Date; CSS animations are paused and seeked to the same time; the mouse and
// keyboard are real Playwright input, so the app handles every hover, click and key.
// Also writes out/demo/sfx.json (the sound cues, from what was actually done).
import { chromium } from "playwright-core";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./server.mjs";
import { ACTIONS, DURATION, BEAT, camera, toScreen } from "./timeline.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../out/demo");
const DIST = path.resolve(HERE, "../../dist");
const CHROME = process.env.CHROME ?? "C:/Users/HP/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe";
const FFMPEG = process.env.FFMPEG ?? execFileSync("py", ["-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"]).toString().trim();
const RATE = 120; // simulation steps per second
const STEP = 1 / RATE;
fs.mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const mode = args[0] ?? "shots";
const untilIdx = args.indexOf("--until");
// sheet <every> <from> <to>: evenly spaced stills, tiled into contact sheets for review.
const sheet = mode === "sheet" ? { every: Number(args[1] ?? 1), from: Number(args[2] ?? 0), to: Number(args[3] ?? DURATION) } : null;
const shotTimes = mode === "shots"
  ? args.slice(1).filter((a, i, all) => all[i - 1] !== "--until" && a !== "--until").map(Number)
  : sheet ? Array.from({ length: Math.floor((sheet.to - sheet.from) / sheet.every) + 1 }, (_, k) => sheet.from + k * sheet.every) : [];
let END = shotTimes.length ? Math.max(...shotTimes) + STEP : DURATION;
if (untilIdx > 0) END = Number(args[untilIdx + 1]);

/* ---------------- seeded helpers ---------------- */
let seed = 1234567;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const minJerk = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (10 - 15 * u + 6 * u * u));

/* ---------------- browser ---------------- */
const server = await startServer();
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--force-color-profile=srgb", "--font-render-hinting=none", "--hide-scrollbars", "--disable-lcd-text"],
});
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  colorScheme: "light",
  reducedMotion: "no-preference",
});
const START = new Date("2026-10-06T09:30:00");
await context.clock.install({ time: START });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && !m.text().startsWith("Failed to load resource") && errors.push(m.text()));
page.on("response", (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`));
await page.goto(`${origin}/__demo/stage.html`);
await page.waitForFunction(() => window.stageReady === true);
const app = await (async () => {
  for (let i = 0; i < 200; i++) {
    const f = page.frames().find((fr) => fr !== page.mainFrame() && fr.url().startsWith(origin));
    if (f && (await f.evaluate(() => !!document.querySelector("aside")).catch(() => false))) return f;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("app did not load");
})();
await app.evaluate(() => document.fonts.ready);
await page.evaluate(() => document.fonts.ready);
// Warm the lazy canvas chunk so the Canvas tab opens without a loading flash.
const canvasChunk = fs.readdirSync(path.join(DIST, "assets")).find((f) => /^CanvasTab-.*\.js$/.test(f));
if (canvasChunk) await app.evaluate((u) => import(u), `/assets/${canvasChunk}`);
const cdp = await context.newCDPSession(page);

/* ---------------- app helpers ---------------- */
const settle = () =>
  page.evaluate(async () => {
    for (let i = 0; i < 4; i++) await new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
  });

/** Resolves a target to a point in app coordinates. */
async function resolve(target) {
  const p = await app.evaluate((t) => {
    const clean = (s) => s.replace(/\s+/g, " ").trim();
    let els = [...document.querySelectorAll(t.sel)].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    });
    if (t.text) {
      const exact = els.filter((e) => clean(e.textContent) === t.text);
      els = exact.length ? exact : els.filter((e) => clean(e.textContent).includes(t.text));
    }
    const onTop = (e) => {
      const r = e.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return hit && (e === hit || e.contains(hit) || hit.contains(e));
    };
    const top = els.filter(onTop);
    const pool = top.length ? top : els;
    const e = pool[t.i ?? 0];
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width * (t.fx ?? 0.5) + (t.dx ?? 0), y: r.top + r.height * (t.fy ?? 0.5) + (t.dy ?? 0) };
  }, target);
  if (!p) { console.warn(`!! target not found: ${JSON.stringify(target)}`); return null; }
  return p;
}

/* ---------------- cursor ---------------- */
const cur = { x: 1500, y: 930, down: false, path: null, ripples: [] };
function cursorAt(t) {
  const pth = cur.path;
  if (pth) {
    const u = minJerk((t - pth.t0) / pth.dur);
    const dx = pth.x1 - pth.x0, dy = pth.y1 - pth.y0;
    const d = Math.hypot(dx, dy) || 1;
    const arc = Math.sin(Math.PI * u) * pth.arc;
    cur.x = pth.x0 + dx * u + (-dy / d) * arc;
    cur.y = pth.y0 + dy * u + (dx / d) * arc;
    if (u >= 1) cur.path = null;
  }
  return cur;
}
const fitts = (d) => Math.min(0.95, Math.max(0.3, 0.3 + 0.11 * Math.log2(1 + d / 30)));

/* ---------------- event queue ---------------- */
const sfx = [];
const cue = (t, kind) => sfx.push({ t: Math.round(t * 1000) / 1000, kind });
const queue = [];
ACTIONS.forEach((a, i) => {
  const next = ACTIONS[i + 1]?.t ?? a.t + 1.5;
  const gap = next - a.t;
  const at = (t, fn) => queue.push({ t, fn });
  switch (a.do) {
    case "place":
      at(a.t, () => Object.assign(cur, a.at, { path: null }));
      break;
    case "move":
    case "drag":
      at(a.t, async (t) => {
        cursorAt(t);
        const p = a.to ? await resolve(a.to) : { x: cur.x + a.by.x, y: cur.y + a.by.y };
        if (!p) return;
        const d = Math.hypot(p.x - cur.x, p.y - cur.y);
        const dur = a.dur ?? Math.max(0.2, Math.min(fitts(d), gap - 0.12));
        const arc = a.do === "drag" ? d * 0.03 : d * (0.05 + rand() * 0.05) * (rand() < 0.5 ? -1 : 1);
        cur.path = { t0: t, dur, x0: cur.x, y0: cur.y, x1: p.x, y1: p.y, arc: Math.min(arc, 60) };
      });
      break;
    case "click":
      at(a.t, async (t) => {
        if (process.env.DEBUG) console.log(t.toFixed(2), "click at", cur.x.toFixed(0), cur.y.toFixed(0), await app.evaluate(([x, y]) => document.elementFromPoint(x, y)?.outerHTML.slice(0, 120), [cur.x, cur.y]));
      });
      at(a.t, async (t) => { cur.down = true; cur.ripples.push({ t0: t, x: cur.x, y: cur.y }); cue(t, a.sfx ?? "click"); await page.mouse.down(); });
      at(a.t + 0.07, async () => { cur.down = false; await page.mouse.up(); });
      if (process.env.DEBUG) at(a.t + 0.3, async (t) => console.log(t.toFixed(2), "after click: theme", await app.evaluate(() => document.documentElement.outerHTML.slice(0, 160))));
      break;
    case "rclick":
      at(a.t, async (t) => { cur.down = true; cur.ripples.push({ t0: t, x: cur.x, y: cur.y }); cue(t, "click"); await page.mouse.down({ button: "right" }); });
      at(a.t + 0.07, async () => { cur.down = false; await page.mouse.up({ button: "right" }); });
      break;
    case "dblclick":
      at(a.t, async (t) => { cur.down = true; cur.ripples.push({ t0: t, x: cur.x, y: cur.y }); cue(t, "click"); await page.mouse.down({ clickCount: 1 }); });
      at(a.t + 0.06, async () => { cur.down = false; await page.mouse.up({ clickCount: 1 }); });
      at(a.t + 0.14, async (t) => { cur.down = true; cue(t, "click"); await page.mouse.down({ clickCount: 2 }); });
      at(a.t + 0.2, async () => { cur.down = false; await page.mouse.up({ clickCount: 2 }); });
      break;
    case "down":
      at(a.t, async (t) => { cur.down = true; cue(t, "grab"); await page.mouse.down(); });
      break;
    case "up":
      at(a.t, async (t) => { cur.down = false; cue(t, "drop"); await page.mouse.up(); });
      break;
    case "key":
      at(a.t, async (t) => { cue(t, a.key === "Enter" ? "enter" : "tick"); await page.keyboard.press(a.key); });
      break;
    case "type": {
      const n = a.text.length;
      const base = Math.min(0.085, (gap - 0.15) / n);
      let tt = a.t;
      for (const ch of a.text) {
        at(tt, async (t) => { cue(t, "type"); await page.keyboard.type(ch); });
        tt += base * (ch === " " ? 1.25 : 0.8 + rand() * 0.4);
      }
      break;
    }
    case "paste":
      at(a.t, async (t) => {
        cue(t, "pop");
        await app.evaluate(async (file) => {
          const blob = await (await fetch(`/__demo/${file}`)).blob();
          const dt = new DataTransfer();
          dt.items.add(new File([blob], file, { type: blob.type }));
          document.activeElement.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
        }, a.file);
        // The app reads the file asynchronously; wait (in real time) for the image to land.
        for (let k = 0; k < 100; k++) {
          if (await app.evaluate(() => !!document.querySelector(".notes-prose img"))) break;
          await new Promise((r) => setTimeout(r, 20));
        }
      });
      break;
    default:
      throw new Error(`unknown action ${a.do}`);
  }
});
queue.sort((a, b) => a.t - b.t);

/* ---------------- capture ---------------- */
async function grab(format = "jpeg") {
  const { data } = await cdp.send("Page.captureScreenshot", { format, quality: format === "jpeg" ? 94 : undefined });
  return Buffer.from(data, "base64");
}

let ff = null;
let captureEvery = 0;
if (mode === "preview") {
  captureEvery = RATE / 30;
  ff = spawn(FFMPEG, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", "30", "-c:v", "mjpeg", "-i", "-",
    "-vf", "scale=1280:-2:flags=lanczos", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
    path.join(OUT, "preview.mp4")], { stdio: ["pipe", "inherit", "inherit"] });
} else if (mode === "full") {
  captureEvery = 1; // 120 Hz in, blended to 60fps
  ff = spawn(FFMPEG, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(RATE), "-c:v", "mjpeg", "-i", "-",
    "-vf", "tmix=frames=2:weights='1 1',select='eq(mod(n\\,2)\\,1)',setpts=N/(60*TB)",
    "-r", "60", "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    path.join(OUT, "film-silent.mp4")], { stdio: ["pipe", "inherit", "inherit"] });
}
const SHEET_DIR = path.join(OUT, "sheet");
let sheetN = 0;
if (sheet) { fs.rmSync(SHEET_DIR, { recursive: true, force: true }); fs.mkdirSync(SHEET_DIR, { recursive: true }); }
const pending = new Set(shotTimes.map((t) => Math.round(t * RATE)));

let clockMs = 0;
let qi = 0;
const total = Math.round(END * RATE);
const started = Date.now();
for (let i = 0; i < total; i++) {
  const t = i * STEP;
  const ms = Math.round(t * 1000);
  if (ms > clockMs) {
    await page.clock.runFor(ms - clockMs);
    clockMs = ms;
  }
  // Discrete input due by now, in order; each one settles before the next.
  while (qi < queue.length && queue[qi].t <= t + 1e-9) {
    await queue[qi++].fn(t);
    await settle();
  }
  cursorAt(t);
  cur.ripples = cur.ripples.filter((r) => t - r.t0 < 0.6);
  const cam = camera(t);
  await page.evaluate(([tt, c]) => window.stage.seek(tt, c), [t, { x: cur.x, y: cur.y, down: cur.down, ripples: cur.ripples }]);
  const [sx, sy] = toScreen(cam, cur.x, cur.y);
  await page.mouse.move(sx, sy);
  await settle();
  await page.evaluate((m) => window.stage.syncAnimations(m), t * 1000);

  if (ff && i % captureEvery === 0) {
    const buf = await grab();
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  }
  if (pending.has(i)) {
    if (sheet) fs.writeFileSync(path.join(SHEET_DIR, `s-${String(sheetN++).padStart(3, "0")}.jpg`), await grab());
    else fs.writeFileSync(path.join(OUT, `shot-${t.toFixed(2)}.png`), await grab("png"));
  }
  if (i % (RATE * 5) === 0) console.log(`t=${t.toFixed(1)}s  ${((Date.now() - started) / 1000).toFixed(0)}s elapsed`);
}

if (ff) {
  ff.stdin.end();
  await new Promise((r, j) => ff.on("close", (c) => (c === 0 ? r() : j(new Error("ffmpeg " + c)))));
}
if (sheet) {
  // 4×3 tiles per sheet, left to right, top to bottom.
  const per = 12;
  for (let k = 0; k * per < sheetN; k++) {
    execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-start_number", String(k * per), "-i", path.join(SHEET_DIR, "s-%03d.jpg"),
      "-frames:v", "1", "-vf", `scale=640:-1,tile=4x3:padding=4:color=white`, path.join(OUT, `sheet-${k}.jpg`)]);
  }
  console.log(`${sheetN} stills → ${Math.ceil(sheetN / per)} sheets (from ${sheet.from}s every ${sheet.every}s)`);
}
fs.writeFileSync(path.join(OUT, "sfx.json"), JSON.stringify({ duration: DURATION, beat: BEAT, cues: sfx }, null, 1));
console.log(`done in ${((Date.now() - started) / 1000).toFixed(0)}s; ${sfx.length} sound cues`);
console.log(errors.length ? "PAGE ERRORS:\n" + [...new Set(errors)].join("\n") : "no page errors");
await browser.close();
server.close();
