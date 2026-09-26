import { useData } from "./data";
import { useUI } from "./ui";

const FADE_MS = 220;

/** Fade the card out of the grid, then move it to the Done section. */
export function completeCard(id: string) {
  const ui = useUI.getState();
  ui.set({ fading: { ...ui.fading, [id]: true }, openCardId: null });
  window.setTimeout(() => {
    useData.getState().updateCard(id, { done: true, doneAt: Date.now() });
    const { [id]: _, ...rest } = useUI.getState().fading;
    useUI.getState().set({ fading: rest });
  }, FADE_MS);
}

export function restoreCard(id: string) {
  useData.getState().updateCard(id, { done: false, doneAt: undefined });
}

export function createCardAndOpen(folderId: string) {
  const id = useData.getState().addCard(folderId);
  useUI.getState().set({ openCardId: id });
  return id;
}

export function createNotebookAndOpen(folderId: string) {
  const id = useData.getState().addNotebook(folderId);
  useUI.getState().set({ openNotebookId: id });
  return id;
}

export function createFolderAndRename(parentId: string | null) {
  const id = useData.getState().addFolder(parentId);
  const ui = useUI.getState();
  if (parentId) ui.toggleExpanded(parentId, true);
  ui.set({ renamingFolderId: id });
  ui.openFolder(id);
  return id;
}

export function openCardInContext(cardId: string) {
  const card = useData.getState().cards.find((c) => c.id === cardId);
  if (!card) return;
  const ui = useUI.getState();
  ui.set({ openCardId: cardId, search: "", drawerOpen: false });
}

export function openNotebookInContext(notebookId: string) {
  const nb = useData.getState().notebooks.find((n) => n.id === notebookId);
  if (!nb) return;
  const ui = useUI.getState();
  ui.set({ search: "", drawerOpen: false, openCardId: null, openNotebookId: notebookId });
}

/** Expand every ancestor of a folder so it is visible in the tree. */
export function revealFolder(folderId: string) {
  const { folders } = useData.getState();
  const ui = useUI.getState();
  const expanded = { ...ui.expanded };
  let cur = folders.find((f) => f.id === folderId);
  while (cur?.parentId) {
    expanded[cur.parentId] = true;
    cur = folders.find((f) => f.id === cur!.parentId);
  }
  ui.set({ expanded });
}
