import { useData } from "../../store/data";
import type { CanvasItem } from "../../types";

/**
 * Per-folder undo/redo for the canvas. Snapshots are whole item arrays; items
 * are immutable, so snapshots share unchanged objects and stay cheap.
 * History lives in memory only and resets on reload.
 */
interface Stack {
  past: CanvasItem[][];
  future: CanvasItem[][];
}

const LIMIT = 100;
const stacks = new Map<string, Stack>();
const listeners = new Set<() => void>();

const stackFor = (folderId: string) => {
  let s = stacks.get(folderId);
  if (!s) stacks.set(folderId, (s = { past: [], future: [] }));
  return s;
};

const notify = () => listeners.forEach((l) => l());

export const folderItems = (folderId: string) =>
  useData.getState().canvasItems.filter((i) => i.folderId === folderId);

/** Apply a change and record the previous state for undo. */
export function commit(folderId: string, next: CanvasItem[]) {
  const s = stackFor(folderId);
  s.past.push(folderItems(folderId));
  if (s.past.length > LIMIT) s.past.shift();
  s.future = [];
  useData.getState().setFolderCanvas(folderId, next);
  notify();
}

export function undo(folderId: string) {
  const s = stackFor(folderId);
  const prev = s.past.pop();
  if (!prev) return;
  s.future.push(folderItems(folderId));
  useData.getState().setFolderCanvas(folderId, prev);
  notify();
}

export function redo(folderId: string) {
  const s = stackFor(folderId);
  const next = s.future.pop();
  if (!next) return;
  s.past.push(folderItems(folderId));
  useData.getState().setFolderCanvas(folderId, next);
  notify();
}

export const canUndo = (folderId: string) => (stacks.get(folderId)?.past.length ?? 0) > 0;
export const canRedo = (folderId: string) => (stacks.get(folderId)?.future.length ?? 0) > 0;

export function subscribeHistory(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
