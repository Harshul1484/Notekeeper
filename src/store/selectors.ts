import { useMemo } from "react";
import { daysUntil, isDueOrOverdue, WEEK_MS } from "../lib/date";
import type { CardSort, FocusCard, Folder, Notebook, QuickView } from "../types";
import { useData } from "./data";
import { useUI } from "./ui";

export const useFolders = () => useData((s) => s.folders);

export const useFolder = (id: string | null | undefined) =>
  useData((s) => (id ? s.folders.find((f) => f.id === id) : undefined));

export const sortedChildren = (folders: Folder[], parentId: string | null) =>
  folders.filter((f) => f.parentId === parentId).sort((a, b) => a.order - b.order);

/** Items (open cards + notebooks) directly inside each folder. */
export function useFolderCounts() {
  const cards = useData((s) => s.cards);
  const notebooks = useData((s) => s.notebooks);
  return useMemo(() => {
    const counts = new Map<string, number>();
    const bump = (id: string) => counts.set(id, (counts.get(id) ?? 0) + 1);
    cards.forEach((c) => !c.done && bump(c.folderId));
    notebooks.forEach((n) => bump(n.folderId));
    return counts;
  }, [cards, notebooks]);
}

const recentCutoff = () => Date.now() - WEEK_MS;

export function quickViewItems(
  kind: QuickView,
  cards: FocusCard[],
  notebooks: Notebook[],
): { cards: FocusCard[]; notebooks: Notebook[] } {
  switch (kind) {
    case "today":
      return {
        cards: sortCards(
          cards.filter((c) => !c.done && isDueOrOverdue(c.dueDate)),
          "due",
        ),
        notebooks: [],
      };
    case "recent": {
      const cutoff = recentCutoff();
      return {
        cards: sortCards(cards.filter((c) => !c.done && c.updatedAt >= cutoff), "updated"),
        notebooks: notebooks
          .filter((n) => n.updatedAt >= cutoff)
          .sort((a, b) => b.updatedAt - a.updatedAt),
      };
    }
    case "pinned":
      return {
        cards: sortCards(cards.filter((c) => !c.done && c.pinned), "updated"),
        notebooks: notebooks.filter((n) => n.pinned).sort((a, b) => b.updatedAt - a.updatedAt),
      };
  }
}

export function useQuickCounts() {
  const cards = useData((s) => s.cards);
  const notebooks = useData((s) => s.notebooks);
  return useMemo(() => {
    const count = (k: QuickView) => {
      const r = quickViewItems(k, cards, notebooks);
      return r.cards.length + r.notebooks.length;
    };
    return { today: count("today"), recent: count("recent"), pinned: count("pinned") };
  }, [cards, notebooks]);
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

export function sortCards(cards: FocusCard[], sort: CardSort) {
  const byUpdated = (a: FocusCard, b: FocusCard) => b.updatedAt - a.updatedAt;
  const byDue = (a: FocusCard, b: FocusCard) => {
    if (a.dueDate && b.dueDate) return daysUntil(a.dueDate) - daysUntil(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  };
  const sorted = [...cards];
  if (sort === "updated") sorted.sort(byUpdated);
  if (sort === "due") sorted.sort((a, b) => byDue(a, b) || byUpdated(a, b));
  if (sort === "priority")
    sorted.sort(
      (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byDue(a, b) || byUpdated(a, b),
    );
  return sorted;
}

/** The folder currently shown in the main area, if any. */
export function useCurrentFolderId() {
  const view = useUI((s) => s.view);
  return view.kind === "folder" ? view.folderId : null;
}
