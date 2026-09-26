import type { CanvasItem } from "../../types";

export interface Pt {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 3;

export const center = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

export const normRect = (a: Pt, b: Pt): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(a.x - b.x),
  h: Math.abs(a.y - b.y),
});

export const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const contains = (outer: Rect, inner: Rect) =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;

export const containsPoint = (r: Rect, p: Pt) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/** Where a line from the rect's center toward `toward` leaves the rect (plus padding). */
export function edgePoint(r: Rect, toward: Pt, pad = 8): Pt {
  const c = center(r);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (!dx && !dy) return c;
  const sx = dx ? (r.w / 2 + pad) / Math.abs(dx) : Infinity;
  const sy = dy ? (r.h / 2 + pad) / Math.abs(dy) : Infinity;
  const t = Math.min(sx, sy, 1);
  return { x: c.x + dx * t, y: c.y + dy * t };
}

/** A gently curved path between two points, bowing to one side. */
export function curvePath(a: Pt, b: Pt) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const bow = Math.min(36, len * 0.1);
  const cx = mx - (dy / len) * bow;
  const cy = my + (dx / len) * bow;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

export function boundingBox(items: CanvasItem[]): Rect | null {
  const boxes = items.filter((i) => i.type !== "arrow");
  if (!boxes.length) return null;
  const x1 = Math.min(...boxes.map((i) => i.x));
  const y1 = Math.min(...boxes.map((i) => i.y));
  const x2 = Math.max(...boxes.map((i) => i.x + i.w));
  const y2 = Math.max(...boxes.map((i) => i.y + i.h));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export const MIN_SIZE: Record<CanvasItem["type"], { w: number; h: number }> = {
  sticky: { w: 90, h: 70 },
  text: { w: 80, h: 32 },
  section: { w: 160, h: 120 },
  image: { w: 60, h: 40 },
  arrow: { w: 0, h: 0 },
};
