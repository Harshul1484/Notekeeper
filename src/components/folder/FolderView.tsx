import { lazy, Suspense } from "react";
import { cn } from "../../lib/util";
import { useUI } from "../../store/ui";
import type { Folder } from "../../types";
import { FocusTab } from "../focus/FocusTab";
import { NotebooksTab } from "../notebooks/NotebooksTab";
import { FolderHeader } from "./FolderHeader";
import { FolderTabs } from "./FolderTabs";

// The canvas is only needed when its tab is open.
const CanvasTab = lazy(() => import("../canvas/CanvasTab").then((m) => ({ default: m.CanvasTab })));

export function FolderView({ folder }: { folder: Folder }) {
  const tab = useUI((s) => s.tab);
  return (
    <div className="flex min-h-full flex-col px-4 pt-6 pb-4 sm:px-6 md:px-10 md:pt-9 md:pb-8">
      <FolderHeader folder={folder} />
      <div className="mt-6 flex flex-1 flex-col md:mt-7">
        <FolderTabs />
        <section
          id="folder-panel"
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          className={cn(
            "relative flex flex-1 flex-col rounded-tr-[14px] rounded-b-[14px] border border-line bg-panel",
            tab === "canvas" ? "min-h-[520px] overflow-hidden" : "min-h-[420px]",
          )}
        >
          <div
            key={`${folder.id}-${tab}`}
            className={cn("anim-rise", tab === "canvas" ? "absolute inset-0" : "flex flex-1 flex-col")}
          >
            {tab === "focus" && <FocusTab folder={folder} />}
            {tab === "notebooks" && <NotebooksTab folder={folder} />}
            {tab === "canvas" && (
              <Suspense fallback={null}>
                <CanvasTab folder={folder} />
              </Suspense>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
