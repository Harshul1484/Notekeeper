import { useEffect } from "react";
import { parseLocation, pathFor, type RouteState } from "../lib/routes";
import { useData } from "../store/data";
import { useUI } from "../store/ui";

const QUICK_TITLE = { today: "Today", recent: "Recent", pinned: "Pinned" } as const;

const sameRoute = (a: RouteState, b: RouteState) =>
  a.view === b.view && a.tab === b.tab && a.openNotebookId === b.openNotebookId && a.openCardId === b.openCardId;

/** Keeps the address bar, browser history, and tab title in step with navigation. */
export function useUrlSync() {
  useEffect(() => {
    const here = () => window.location.pathname + window.location.search;
    const currentPath = () => pathFor(useUI.getState(), useData.getState());

    // Open whatever the URL points at (a permalink, or Back/Forward).
    const applyLocation = () => {
      const route = parseLocation(window.location.pathname, window.location.search, useData.getState());
      if (!route) return;
      // Quick views have no tabs; keep the folder tab the user last had.
      const tab = route.view.kind === "folder" ? route.tab : useUI.getState().tab;
      useUI.setState({ ...route, tab, drawerOpen: false });
    };

    applyLocation();
    // "/" or a stale link: show the current state's own URL instead.
    window.history.replaceState(null, "", currentPath());

    window.addEventListener("popstate", applyLocation);

    // Navigating adds a history entry.
    const unsubUI = useUI.subscribe((state, prev) => {
      if (sameRoute(state, prev)) return;
      const path = currentPath();
      if (path !== here()) window.history.pushState(null, "", path);
    });

    // Renaming a folder/notebook/card changes its slug: update the address in place.
    const unsubData = useData.subscribe((state, prev) => {
      if (state.folders === prev.folders && state.notebooks === prev.notebooks && state.cards === prev.cards) return;
      const path = currentPath();
      if (path !== here()) window.history.replaceState(null, "", path);
    });

    return () => {
      window.removeEventListener("popstate", applyLocation);
      unsubUI();
      unsubData();
    };
  }, []);

  // Tab title: notebook title, folder name, or quick view.
  const view = useUI((s) => s.view);
  const openNotebookId = useUI((s) => s.openNotebookId);
  const title = useData((s) => {
    if (openNotebookId) {
      const nb = s.notebooks.find((n) => n.id === openNotebookId);
      if (nb) return nb.title || "Untitled notebook";
    }
    if (view.kind === "folder") return s.folders.find((f) => f.id === view.folderId)?.name ?? "";
    return QUICK_TITLE[view.kind];
  });
  useEffect(() => {
    document.title = title ? `${title} · Notekeeper` : "Notekeeper";
  }, [title]);
}
