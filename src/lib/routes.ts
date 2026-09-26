import type { SeedData } from "../data/seed";
import type { FocusCard, Folder, Notebook, QuickView, Tab, View } from "../types";

/**
 * Permalinks. Readable paths that follow the folder tree:
 *
 *   /today  /recent  /pinned
 *   /studio-work                          folder (Focus tab)
 *   /studio-work/q4-launch                subfolder
 *   /studio-work/q4-launch/notebooks      …/canvas for the other tabs
 *   /studio-work/notebooks/launch-run-of-show
 *   ...?card=reply-to-dana-about-the-retainer
 *
 * Names are turned into slugs; siblings with the same name get -2, -3, …
 * Older id-based links (/folder/<id>, /notebook/<id>, ?card=<id>) still resolve.
 */
export interface RouteState {
  view: View;
  tab: Tab;
  openNotebookId: string | null;
  openCardId: string | null;
}

type Data = Pick<SeedData, "folders" | "notebooks" | "cards">;

const QUICK = new Set<string>(["today", "recent", "pinned"]);
const TABS = new Set<string>(["notebooks", "canvas"]);

export const slugify = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled";

/** Unique slugs within a group, in a stable order (duplicates become name-2, name-3, …). */
function uniqueSlugs<T extends { id: string }>(items: T[], name: (t: T) => string): Map<string, string> {
  const out = new Map<string, string>();
  const used = new Map<string, number>();
  for (const item of items) {
    const base = slugify(name(item));
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    out.set(item.id, n === 1 ? base : `${base}-${n}`);
  }
  return out;
}

const byOrder = (a: Folder, b: Folder) => a.order - b.order;
const byCreated = (a: { createdAt: number; id: string }, b: { createdAt: number; id: string }) =>
  a.createdAt - b.createdAt || a.id.localeCompare(b.id);

const folderSlugs = (folders: Folder[], parentId: string | null) =>
  uniqueSlugs(folders.filter((f) => f.parentId === parentId).sort(byOrder), (f) => f.name);

const notebookSlugs = (notebooks: Notebook[], folderId: string) =>
  uniqueSlugs(notebooks.filter((n) => n.folderId === folderId).sort(byCreated), (n) => n.title);

const cardSlugs = (cards: FocusCard[], folderId: string) =>
  uniqueSlugs(cards.filter((c) => c.folderId === folderId).sort(byCreated), (c) => c.title);

/** "/studio-work/q4-launch" for a folder, walking up to the root. */
function folderPath(data: Data, folderId: string): string | null {
  const segments: string[] = [];
  let cur = data.folders.find((f) => f.id === folderId);
  while (cur) {
    segments.unshift(folderSlugs(data.folders, cur.parentId).get(cur.id)!);
    const parentId = cur.parentId;
    cur = parentId ? data.folders.find((f) => f.id === parentId) : undefined;
  }
  return segments.length ? `/${segments.join("/")}` : null;
}

export function pathFor(s: RouteState, data: Data): string {
  let path = "/";
  if (s.openNotebookId) {
    const nb = data.notebooks.find((n) => n.id === s.openNotebookId);
    const base = nb && folderPath(data, nb.folderId);
    if (nb && base) path = `${base}/notebooks/${notebookSlugs(data.notebooks, nb.folderId).get(nb.id)}`;
  } else if (s.view.kind === "folder") {
    const base = folderPath(data, s.view.folderId);
    if (base) path = s.tab === "focus" ? base : `${base}/${s.tab}`;
  } else {
    path = `/${s.view.kind}`;
  }

  const card = s.openCardId ? data.cards.find((c) => c.id === s.openCardId) : undefined;
  if (card) path += `?card=${cardSlugs(data.cards, card.folderId).get(card.id)}`;
  return path;
}

/** Absolute URL for sharing/bookmarking. */
export const urlFor = (s: Partial<RouteState> & Pick<RouteState, "view">, data: Data) =>
  `${window.location.origin}${pathFor({ tab: "focus", openNotebookId: null, openCardId: null, ...s }, data)}`;

function findCard(data: Data, key: string | null, folderId: string | null): string | null {
  if (!key) return null;
  if (data.cards.some((c) => c.id === key)) return key; // legacy id link
  // Prefer the folder being shown, then any folder.
  const folderIds = folderId ? [folderId, ...data.folders.map((f) => f.id)] : data.folders.map((f) => f.id);
  for (const id of folderIds) {
    for (const [cardId, slug] of cardSlugs(data.cards, id)) if (slug === key) return cardId;
  }
  return null;
}

/**
 * Reads the navigation state from a URL. Returns null for "/" or a path that no
 * longer matches anything, so the caller keeps its current state.
 */
export function parseLocation(pathname: string, search: string, data: Data): RouteState | null {
  const segs = pathname.split("/").filter(Boolean).map((s) => decodeURIComponent(s).toLowerCase());
  const cardKey = new URLSearchParams(search).get("card");
  const route = (view: View, tab: Tab = "focus", openNotebookId: string | null = null): RouteState => ({
    view,
    tab,
    openNotebookId,
    openCardId: findCard(data, cardKey, view.kind === "folder" ? view.folderId : null),
  });

  if (!segs.length) return null;
  if (segs.length === 1 && QUICK.has(segs[0])) return route({ kind: segs[0] as QuickView });

  // Legacy id-based links.
  if (segs[0] === "folder" && data.folders.some((f) => f.id === segs[1])) {
    return route({ kind: "folder", folderId: segs[1] }, TABS.has(segs[2]) ? (segs[2] as Tab) : "focus");
  }
  if (segs[0] === "notebook") {
    const nb = data.notebooks.find((n) => n.id === segs[1]);
    if (nb) return route({ kind: "folder", folderId: nb.folderId }, "notebooks", nb.id);
  }

  // Walk the folder tree one slug at a time.
  let folder: Folder | undefined;
  let i = 0;
  for (; i < segs.length; i++) {
    const slugs = folderSlugs(data.folders, folder?.id ?? null);
    const next = data.folders.find((f) => slugs.get(f.id) === segs[i]);
    if (!next) break;
    folder = next;
  }
  if (!folder) return null;

  const view: View = { kind: "folder", folderId: folder.id };
  const rest = segs.slice(i);
  if (rest[0] === "notebooks" && rest[1]) {
    for (const [nbId, slug] of notebookSlugs(data.notebooks, folder.id)) {
      if (slug === rest[1]) return route(view, "notebooks", nbId);
    }
    return route(view, "notebooks");
  }
  return route(view, TABS.has(rest[0]) ? (rest[0] as Tab) : "focus");
}
