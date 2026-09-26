import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createSeed, type SeedData } from "../data/seed";
import { FOLDER_COLORS } from "../lib/colors";
import { uid } from "../lib/util";
import type { CanvasItem, FocusCard, Folder, Notebook } from "../types";

export type DropPosition = "before" | "after" | "inside";

interface DataActions {
  addFolder: (parentId: string | null, name?: string) => string;
  updateFolder: (id: string, patch: Partial<Omit<Folder, "id">>) => void;
  deleteFolder: (id: string) => void;
  moveFolder: (id: string, targetId: string, position: DropPosition) => void;

  addCard: (folderId: string, patch?: Partial<FocusCard>) => string;
  updateCard: (id: string, patch: Partial<Omit<FocusCard, "id">>) => void;
  deleteCard: (id: string) => void;

  addNotebook: (folderId: string, patch?: Partial<Notebook>) => string;
  updateNotebook: (id: string, patch: Partial<Omit<Notebook, "id">>) => void;
  deleteNotebook: (id: string) => void;

  /** Replace every canvas item that belongs to `folderId`. */
  setFolderCanvas: (folderId: string, items: CanvasItem[]) => void;

  replaceAll: (data: SeedData) => void;
}

export type DataState = SeedData & DataActions;

/** `id` plus every folder nested below it. */
export function folderSubtree(folders: Folder[], id: string): Set<string> {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    }
  }
  return ids;
}

export const useData = create<DataState>()(
  persist(
    (set, get) => ({
      ...createSeed(),

      addFolder: (parentId, name = "Untitled folder") => {
        const id = uid();
        const { folders } = get();
        const siblings = folders.filter((f) => f.parentId === parentId);
        const parent = folders.find((f) => f.id === parentId);
        const color =
          parent?.color ?? FOLDER_COLORS[folders.filter((f) => !f.parentId).length % FOLDER_COLORS.length];
        set({
          folders: [
            ...folders,
            { id, name, color, description: "", parentId, order: siblings.length },
          ],
        });
        return id;
      },

      updateFolder: (id, patch) =>
        set({ folders: get().folders.map((f) => (f.id === id ? { ...f, ...patch } : f)) }),

      deleteFolder: (id) => {
        const s = get();
        const ids = folderSubtree(s.folders, id);
        set({
          folders: s.folders.filter((f) => !ids.has(f.id)),
          cards: s.cards.filter((c) => !ids.has(c.folderId)),
          notebooks: s.notebooks.filter((n) => !ids.has(n.folderId)),
          canvasItems: s.canvasItems.filter((i) => !ids.has(i.folderId)),
        });
      },

      moveFolder: (id, targetId, position) => {
        const { folders } = get();
        if (id === targetId || folderSubtree(folders, id).has(targetId)) return;
        const target = folders.find((f) => f.id === targetId);
        const moving = folders.find((f) => f.id === id);
        if (!target || !moving) return;

        const parentId = position === "inside" ? target.id : target.parentId;
        const siblings = folders
          .filter((f) => f.parentId === parentId && f.id !== id)
          .sort((a, b) => a.order - b.order);
        const at =
          position === "inside"
            ? siblings.length
            : siblings.findIndex((f) => f.id === targetId) + (position === "after" ? 1 : 0);
        siblings.splice(at, 0, { ...moving, parentId });

        const order = new Map(siblings.map((f, i) => [f.id, i]));
        set({
          folders: folders.map((f) =>
            f.id === id
              ? { ...f, parentId, order: order.get(id)! }
              : order.has(f.id)
                ? { ...f, order: order.get(f.id)! }
                : f,
          ),
        });
      },

      addCard: (folderId, patch) => {
        const id = uid();
        const now = Date.now();
        const card: FocusCard = {
          id,
          folderId,
          title: "",
          detail: "",
          color: "butter",
          tags: [],
          progress: 0,
          checklist: [],
          done: false,
          priority: "medium",
          linkedNotebookIds: [],
          createdAt: now,
          updatedAt: now,
          ...patch,
        };
        set({ cards: [card, ...get().cards] });
        return id;
      },

      updateCard: (id, patch) =>
        set({
          cards: get().cards.map((c) => {
            if (c.id !== id) return c;
            const next = { ...c, ...patch, updatedAt: Date.now() };
            if (next.checklist.length) {
              next.progress = Math.round(
                (next.checklist.filter((k) => k.done).length / next.checklist.length) * 100,
              );
            }
            return next;
          }),
        }),

      deleteCard: (id) => set({ cards: get().cards.filter((c) => c.id !== id) }),

      addNotebook: (folderId, patch) => {
        const id = uid();
        const now = Date.now();
        const notebook: Notebook = {
          id,
          folderId,
          title: "",
          content: "",
          tags: [],
          color: "sand",
          createdAt: now,
          updatedAt: now,
          ...patch,
        };
        set({ notebooks: [notebook, ...get().notebooks] });
        return id;
      },

      updateNotebook: (id, patch) =>
        set({
          notebooks: get().notebooks.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n,
          ),
        }),

      deleteNotebook: (id) =>
        set({
          notebooks: get().notebooks.filter((n) => n.id !== id),
          cards: get().cards.map((c) =>
            c.linkedNotebookIds.includes(id)
              ? { ...c, linkedNotebookIds: c.linkedNotebookIds.filter((x) => x !== id) }
              : c,
          ),
        }),

      setFolderCanvas: (folderId, items) =>
        set({
          canvasItems: [...get().canvasItems.filter((i) => i.folderId !== folderId), ...items],
        }),

      replaceAll: (data) => set({ ...data }),
    }),
    {
      name: "notes.data.v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ folders, cards, notebooks, canvasItems }) => ({
        folders,
        cards,
        notebooks,
        canvasItems,
      }),
    },
  ),
);

// Write the sample data on first launch so its relative due dates stay fixed.
if (typeof localStorage !== "undefined" && !localStorage.getItem("notes.data.v1")) {
  useData.setState((s) => ({ folders: s.folders }));
}
