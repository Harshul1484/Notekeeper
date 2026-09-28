import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_FOLDER_ID } from "../data/seed";
import type { CardSort, Tab, View } from "../types";

export type ThemePref = "system" | "light" | "dark";

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface UIState {
  view: View;
  tab: Tab;
  sidebarCollapsed: boolean;
  theme: ThemePref;
  drawerOpen: boolean;
  expanded: Record<string, boolean>;
  openCardId: string | null;
  openNotebookId: string | null;
  renamingFolderId: string | null;
  settingsOpen: boolean;
  notebookLayout: "grid" | "list";
  cardSort: CardSort;
  tagFilter: string[];
  search: string;
  /** Cards animating out of the grid after being marked done. */
  fading: Record<string, true>;
  viewports: Record<string, Viewport>;

  openFolder: (folderId: string, tab?: Tab) => void;
  openQuickView: (kind: "today" | "recent" | "pinned") => void;
  setTab: (tab: Tab) => void;
  set: (patch: Partial<UIState>) => void;
  toggleExpanded: (folderId: string, value?: boolean) => void;
  toggleTag: (tag: string) => void;
  setViewport: (folderId: string, vp: Viewport) => void;
}

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      view: { kind: "folder", folderId: DEFAULT_FOLDER_ID },
      tab: "focus",
      sidebarCollapsed: false,
      theme: "system",
      drawerOpen: false,
      expanded: { "f-work": true },
      openCardId: null,
      openNotebookId: null,
      renamingFolderId: null,
      settingsOpen: false,
      notebookLayout: "grid",
      cardSort: "updated",
      tagFilter: [],
      search: "",
      fading: {},
      viewports: {},

      openFolder: (folderId, tab) =>
        set({
          view: { kind: "folder", folderId },
          tab: tab ?? get().tab,
          tagFilter: [],
          openNotebookId: null,
          drawerOpen: false,
        }),

      openQuickView: (kind) =>
        set({ view: { kind }, openNotebookId: null, tagFilter: [], drawerOpen: false }),

      setTab: (tab) => set({ tab, openNotebookId: null }),

      set: (patch) => set(patch),

      toggleExpanded: (folderId, value) =>
        set({ expanded: { ...get().expanded, [folderId]: value ?? !get().expanded[folderId] } }),

      toggleTag: (tag) => {
        const cur = get().tagFilter;
        set({ tagFilter: cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag] });
      },

      setViewport: (folderId, vp) => set({ viewports: { ...get().viewports, [folderId]: vp } }),
    }),
    {
      name: "notes.ui.v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        view: s.view,
        tab: s.tab,
        sidebarCollapsed: s.sidebarCollapsed,
        theme: s.theme,
        expanded: s.expanded,
        notebookLayout: s.notebookLayout,
        cardSort: s.cardSort,
        viewports: s.viewports,
      }),
    },
  ),
);
