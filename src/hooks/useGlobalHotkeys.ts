import { useEffect } from "react";
import { addDaysISO } from "../lib/date";
import { isTypingTarget } from "../lib/util";
import { createCardAndOpen, createNotebookAndOpen } from "../store/actions";
import { useData } from "../store/data";
import { useUI } from "../store/ui";
import { SEARCH_INPUT_ID } from "../components/layout/Sidebar";

export const NEW_STICKY_EVENT = "notes:new-sticky";

/** N — new item in the current tab. */
function createInCurrentView() {
  const ui = useUI.getState();
  const { view, tab } = ui;
  if (view.kind === "folder") {
    if (tab === "focus") createCardAndOpen(view.folderId);
    else if (tab === "notebooks" && !ui.openNotebookId) createNotebookAndOpen(view.folderId);
    else if (tab === "canvas") window.dispatchEvent(new CustomEvent(NEW_STICKY_EVENT));
    return;
  }
  // Quick views: drop a card into the first folder so it shows up here.
  const first = useData.getState().folders.find((f) => !f.parentId);
  if (!first) return;
  const id = useData.getState().addCard(first.id, {
    dueDate: view.kind === "today" ? addDaysISO(0) : undefined,
    pinned: view.kind === "pinned",
  });
  ui.set({ openCardId: id });
}

function focusSearch(isMobile: boolean) {
  const ui = useUI.getState();
  if (isMobile) ui.set({ drawerOpen: true });
  else if (ui.sidebarCollapsed) ui.set({ sidebarCollapsed: false });
  // Wait a frame for the drawer / sidebar to render.
  requestAnimationFrame(() => document.getElementById(SEARCH_INPUT_ID)?.focus());
}

export function useGlobalHotkeys(isMobile: boolean) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUI.getState();

      if (e.key === "Escape") {
        if (ui.folderMenu) return ui.set({ folderMenu: null });
        if (ui.openCardId) return ui.set({ openCardId: null });
        if (ui.settingsOpen) return ui.set({ settingsOpen: false });
        if (ui.drawerOpen) return ui.set({ drawerOpen: false });
        if (isTypingTarget(e.target)) return (e.target as HTMLElement).blur();
        if (ui.openNotebookId) return ui.set({ openNotebookId: null });
        return;
      }

      if (e.defaultPrevented || isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (ui.openCardId || ui.settingsOpen || ui.folderMenu) return;

      if (e.key === "/") {
        e.preventDefault();
        focusSearch(isMobile);
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        createInCurrentView();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobile]);
}
