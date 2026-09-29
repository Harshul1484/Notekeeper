// Shared timeline for the Notekeeper product film. Used by stage.html (camera, captions,
// intro/hero text) and record.mjs (real mouse + keyboard driving the real app).
// Everything visual here is a pure function of t (seconds).

export const BPM = 120;
export const BEAT = 60 / BPM;
export const DURATION = 84; // 42 bars
export const APP = { w: 1920, h: 1080 };

/* ---------------- springs (closed form) ---------------- */
export function step(t, w, z) {
  if (t <= 0) return 0;
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w * t) * (1 + w * t);
}
export const SP = {
  cam: { w: 3.4, z: 1 },       // cinematic: no overshoot, ~1.4s to settle
  camQuick: { w: 5, z: 1 },
  reveal: { w: 3, z: 0.95 },
  ui: { w: 14, z: 0.9 },
};
/** Sum of one spring per target change → pure function of t. */
export function track(keys, sp) {
  return (t) => {
    let v = keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const s = keys[i][2] || sp;
      v += (keys[i][1] - keys[i - 1][1]) * step(t - keys[i][0], s.w, s.z);
    }
    return v;
  };
}
export const presence = (t, tin, tout = Infinity, w = 9) => step(t - tin, w, 1) * (1 - step(t - tout, w * 1.4, 1));

/* ---------------- camera ----------------
 * [time, scale, centreX, centreY] in app coordinates (1920×1080 app viewport).
 */
const CAM = [
  [0, 0.86, 960, 540],
  [6.0, 0.86, 960, 540, SP.reveal],   // app revealed (window rises separately)
  [8.5, 0.9, 960, 540],               // slow push
  [10.0, 1.5, 640, 380],              // sidebar + start of main
  [15.4, 1.72, 420, 420],             // tighter on the tree
  [17.3, 1.42, 440, 590],             // the menu and its color submenu
  [20.3, 1.0, 1084, 560],             // pull back to the folder
  [21.9, 1.42, 960, 540],             // into the card
  [24.2, 1.5, 960, 560],
  [36.9, 1.05, 1084, 560],            // back out, card in its grid
  [39.4, 1.7, 1084, 330],             // into the editor
  [46.9, 1.3, 1084, 560],             // follow the page down to the image
  [50.6, 1.0, 960, 540],              // pull back to the whole app
  [52.9, 1.22, 1084, 640],            // canvas board
  [62.5, 0.95, 960, 540],
  [65.2, 1.34, 960, 540],             // card again (connection)
  [69.2, 1.1, 1084, 520],             // its notebook
  [70.3, 1.62, 600, 300],             // sidebar search
  [72.6, 1.25, 960, 540],             // the result
  [73.7, 1.3, 520, 600],              // sidebar: Goals and its Canvas tab
  [75.5, 1.4, 520, 770],              // down to the theme toggle
  [76.8, 0.86, 960, 540, SP.camQuick],// widen: the whole UI changes
  [78.3, 0.64, 960, 430],             // hero: pull back, room for the title
];
const camS = track(CAM.map(([t, s, , , sp]) => [t, s, sp]), SP.cam);
const camX = track(CAM.map(([t, , x, , sp]) => [t, x, sp]), SP.cam);
const camY = track(CAM.map(([t, , , y, sp]) => [t, y, sp]), SP.cam);
/** Window reveal: rises in from slightly below at the start of the product. */
const reveal = (t) => step(t - 6.0, SP.reveal.w, SP.reveal.z);
export function camera(t) {
  const r = reveal(t);
  const s = camS(t) * (0.94 + 0.06 * r);
  const cx = camX(t), cy = camY(t) - (1 - r) * 60;
  return { s, cx, cy, tx: 960 - cx * s, ty: 540 - cy * s, reveal: r };
}
export const toScreen = (cam, x, y) => [cam.tx + x * cam.s, cam.ty + y * cam.s];
export const toApp = (cam, sx, sy) => [(sx - cam.tx) / cam.s, (sy - cam.ty) / cam.s];

/* ---------------- text ---------------- */
export const INTRO = [
  [0.4, "Tasks here."],
  [1.9, "Notes there."],
  [3.4, "Plans somewhere else."],
];
export const INTRO_OUT = 5.0;
export const CAPTIONS = [
  [7.0, 11.2, "One quiet place for notes and plans."],
  [21.6, 25.2, "Know what needs you."],
  [38.3, 42.0, "Think it through."],
  [52.6, 56.2, "Plan what's next."],
  [64.6, 68.4, "Everything connected."],
  [71.0, 74.2, "Find anything."],
];
export const HERO = { tin: 78.9, title: "Notekeeper", line: "Notes and plans, in one quiet place." };
export const CURSOR_VISIBLE = [9.0, 78.5];

/* ---------------- interactions (driven for real by record.mjs) ----------------
 * move:     cursor travels to a target (human timing: min-jerk, slight arc)
 * click / rclick / dblclick at the current position; down / up for drags
 * drag:     move while the button is held, over `dur` seconds
 * type:     human-cadence typing; key: a single key
 * paste:    paste an image file into the focused editor (the app's own paste handler)
 * Targets:  { sel, text?, i?, fx?, fy?, dx?, dy? } resolved inside the app when the move starts.
 */
const T = (sel, extra = {}) => ({ sel, ...extra });
const row = (name) => T(`li[role="treeitem"][aria-label="${name}"] > div`, { fx: 0.3 });
export const ACTIONS = [
  { t: 9.0, do: "place", at: { x: 1500, y: 930 } },
  // Navigation
  { t: 10.3, do: "move", to: T("aside button", { text: "Pinned", fx: 0.3 }) },
  { t: 11.2, do: "click" },
  { t: 12.2, do: "move", to: row("Work") },
  { t: 13.0, do: "click" },
  { t: 13.9, do: "move", to: T('button[aria-label="New folder"]') },
  { t: 14.6, do: "click" },
  { t: 15.0, do: "type", text: "Launch" },
  { t: 15.9, do: "key", key: "Enter" },
  { t: 16.5, do: "move", to: row("Launch") },
  { t: 17.2, do: "rclick" },
  { t: 17.8, do: "move", to: T('[role="menuitem"]', { text: "Color", fx: 0.35 }) },
  { t: 18.7, do: "move", to: T('[role="menuitemradio"]', { text: "teal", fx: 0.3 }) },
  { t: 19.4, do: "click" },
  // Focus: a card
  { t: 20.6, do: "move", to: T("button", { text: "New card" }) },
  { t: 21.5, do: "click" },
  { t: 22.3, do: "type", text: "Write the launch post" },
  { t: 24.3, do: "move", to: T("button", { text: "Add due date" }) },
  { t: 24.9, do: "click" },
  { t: 25.5, do: "move", to: T("button", { text: "Tomorrow" }) },
  { t: 26.1, do: "click" },
  { t: 26.7, do: "move", to: T('[aria-label="New checklist item"]', { fx: 0.15 }) },
  { t: 27.2, do: "click" },
  { t: 27.4, do: "type", text: "Draft the copy" },
  { t: 28.6, do: "key", key: "Enter" },
  { t: 28.8, do: "type", text: "Pick a publish date" },
  { t: 30.4, do: "key", key: "Enter" },
  { t: 30.6, do: "type", text: "Share with the team" },
  { t: 32.2, do: "key", key: "Enter" },
  { t: 32.6, do: "move", to: T("input.check", { i: 0 }) },
  { t: 33.2, do: "click" },
  { t: 33.5, do: "move", to: T("input.check", { i: 1 }) },
  { t: 34.0, do: "click" },
  { t: 34.5, do: "move", to: T('[aria-label="Change color"]') },
  { t: 35.0, do: "click" },
  { t: 35.5, do: "move", to: T('button[aria-label="peach"]') },
  { t: 36.0, do: "click" },
  { t: 36.5, do: "key", key: "Escape" },
  { t: 36.9, do: "key", key: "Escape" },
  // Notebooks
  { t: 37.4, do: "move", to: T('[role="tab"]', { text: "Notebooks" }) },
  { t: 38.1, do: "click" },
  { t: 38.6, do: "move", to: T("button", { text: "New notebook" }) },
  { t: 39.2, do: "click" },
  { t: 39.8, do: "type", text: "Launch plan" },
  { t: 40.9, do: "key", key: "Enter" },
  { t: 41.2, do: "move", to: T('[aria-label="Heading 2"]') },
  { t: 41.8, do: "click" },
  { t: 42.0, do: "type", text: "Announcement" },
  { t: 43.1, do: "key", key: "Enter" },
  { t: 43.4, do: "move", to: T('[aria-label="Checklist"]') },
  { t: 43.9, do: "click" },
  { t: 44.2, do: "type", text: "Draft the post" },
  { t: 45.4, do: "key", key: "Enter" },
  { t: 45.6, do: "type", text: "Schedule the email" },
  { t: 47.1, do: "paste", file: "launch-moodboard.jpg" },
  { t: 47.9, do: "move", to: T('.notes-prose [data-resize-handle="right"]') },
  { t: 48.9, do: "down" },
  { t: 49.0, do: "drag", by: { x: -230, y: 0 }, dur: 1.0 },
  { t: 50.1, do: "up" },
  // Canvas
  { t: 50.9, do: "move", to: row("Goals") },
  { t: 51.6, do: "click" },
  { t: 52.1, do: "move", to: T('[role="tab"]', { text: "Canvas" }) },
  { t: 52.7, do: "click" },
  { t: 53.9, do: "move", to: T('[data-item-id="cv-b-later-3"]', { fx: 0.4 }) },
  { t: 54.6, do: "down" },
  { t: 54.75, do: "drag", to: T('[data-item-id="cv-b-now"]', { fx: 0.42, fy: 0.72 }), dur: 1.4 },
  { t: 56.4, do: "up" },
  { t: 56.9, do: "move", to: T('[data-item-id="cv-b-next"]', { fy: 0.8 }) },
  { t: 57.5, do: "dblclick" },
  { t: 57.9, do: "type", text: "Book the venue" },
  { t: 59.2, do: "move", to: T('[data-item-id="cv-b-guide"]', { fy: 1.25 }) },
  { t: 59.7, do: "click" },
  { t: 60.1, do: "move", to: T('[aria-label="Connector"]') },
  { t: 60.6, do: "click" },
  { t: 60.9, do: "move", to: T('[data-item-id="cv-b-now-1"]') },
  { t: 61.4, do: "down" },
  { t: 61.5, do: "drag", to: T('[data-item-id="cv-b-next-1"]'), dur: 0.9 },
  { t: 62.5, do: "up" },
  // Connection
  { t: 63.0, do: "move", to: row("Launch") },
  { t: 63.6, do: "click" },
  { t: 64.0, do: "move", to: T('[role="tab"]', { text: "Focus" }) },
  { t: 64.5, do: "click" },
  { t: 64.9, do: "move", to: T('[aria-label^="Open card: Write the launch post"]', { fy: 0.3 }) },
  { t: 65.5, do: "click" },
  { t: 66.2, do: "move", to: T("button", { text: "Link", fx: 0.5 }) },
  { t: 66.7, do: "click" },
  { t: 67.2, do: "move", to: T("button", { text: "Launch plan", fx: 0.3 }) },
  { t: 67.7, do: "click" },
  { t: 68.1, do: "key", key: "Escape" },
  { t: 68.4, do: "move", to: T('[role="dialog"] button', { text: "Launch plan" }) },
  { t: 69.0, do: "click" },
  // Search
  { t: 70.1, do: "key", key: "/" },
  { t: 70.5, do: "type", text: "launch" },
  { t: 71.5, do: "move", to: T("aside button", { text: "Write the launch post" }) },
  { t: 72.3, do: "click" },
  { t: 73.6, do: "key", key: "Escape" },
  // Theme: back to the board, then dark
  { t: 73.9, do: "move", to: row("Goals") },
  { t: 74.4, do: "click" },
  { t: 74.8, do: "move", to: T('[role="tab"]', { text: "Canvas" }) },
  { t: 75.3, do: "click" },
  { t: 75.7, do: "move", to: T('[aria-label="Switch to dark theme"]') },
  { t: 76.4, do: "click" },
  { t: 77.0, do: "move", to: T("main", { fx: 0.8, fy: 0.75 }) },
];
