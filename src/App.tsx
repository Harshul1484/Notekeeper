import { lazy, Suspense, useEffect } from "react";
import { CardModal } from "./components/focus/CardModal";
import { FolderView } from "./components/folder/FolderView";
import { QuickViewPage } from "./components/folder/QuickViewPage";
import { SettingsModal } from "./components/layout/SettingsModal";
import { Sidebar } from "./components/layout/Sidebar";
import { WindowChrome } from "./components/layout/WindowChrome";
import { useGlobalHotkeys } from "./hooks/useGlobalHotkeys";
import { useIsMobile } from "./hooks/useMediaQuery";
import { useTheme } from "./hooks/useTheme";
import { useUrlSync } from "./hooks/useUrlSync";
import { cn } from "./lib/util";
import { useData } from "./store/data";
import { useUI } from "./store/ui";

// The editor pulls in TipTap; load it only when a notebook is opened.
const NotebookEditor = lazy(() =>
  import("./components/notebooks/NotebookEditor").then((m) => ({ default: m.NotebookEditor })),
);

function MainContent() {
  const view = useUI((s) => s.view);
  const openNotebookId = useUI((s) => s.openNotebookId);
  const folder = useData((s) => (view.kind === "folder" ? s.folders.find((f) => f.id === view.folderId) : undefined));
  const notebookExists = useData((s) => !!openNotebookId && s.notebooks.some((n) => n.id === openNotebookId));

  // If the selected folder disappeared (deleted, import), fall back gracefully.
  useEffect(() => {
    if (view.kind === "folder" && !folder) {
      const first = useData.getState().folders.find((f) => !f.parentId);
      if (first) useUI.getState().openFolder(first.id);
      else useUI.getState().openQuickView("today");
    }
  }, [view, folder]);

  if (openNotebookId && notebookExists) {
    return (
      <Suspense fallback={null}>
        <NotebookEditor key={openNotebookId} notebookId={openNotebookId} />
      </Suspense>
    );
  }
  if (view.kind === "folder") return folder ? <FolderView folder={folder} /> : null;
  return <QuickViewPage kind={view.kind} />;
}

function MobileDrawer() {
  const open = useUI((s) => s.drawerOpen);
  const set = useUI((s) => s.set);
  return (
    <div className={cn("fixed inset-0 z-50", !open && "pointer-events-none")} aria-hidden={!open}>
      <div
        className={cn(
          "absolute inset-0 bg-(--overlay) transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={() => set({ drawerOpen: false })}
      />
      <div
        className={cn(
          "absolute inset-y-0 left-0 overflow-hidden border-r border-line shadow-[var(--shadow-window)] transition-transform duration-200 ease-[var(--ease)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar />
      </div>
    </div>
  );
}

export default function App() {
  const isMobile = useIsMobile();
  const collapsed = useUI((s) => s.sidebarCollapsed);
  useGlobalHotkeys(isMobile);
  useTheme();
  useUrlSync();

  return (
    <div className="flex h-dvh overflow-hidden bg-window">
      {!isMobile && (
        <aside
          aria-label="Sidebar"
          className={cn(
            "shrink-0 overflow-hidden border-line transition-[width] duration-200 ease-[var(--ease)]",
            collapsed ? "w-0" : "w-[248px] border-r",
          )}
        >
          <Sidebar />
        </aside>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <WindowChrome />
        <main id="main" className="scroll-soft min-h-0 flex-1 overflow-y-auto">
          <MainContent />
        </main>
      </div>
      {isMobile && <MobileDrawer />}
      <CardModal />
      <SettingsModal />
    </div>
  );
}
