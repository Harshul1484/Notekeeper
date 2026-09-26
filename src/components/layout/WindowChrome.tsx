import { RiMenuLine, RiSideBarLine } from "@remixicon/react";
import { Fragment } from "react";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { folderDot } from "../../lib/colors";
import { useData } from "../../store/data";
import { useUI } from "../../store/ui";
import { IconButton } from "../ui/Buttons";

const QUICK_LABEL = { today: "Today", recent: "Recent", pinned: "Pinned" } as const;

function Breadcrumb() {
  const view = useUI((s) => s.view);
  const openFolder = useUI((s) => s.openFolder);
  const folders = useData((s) => s.folders);

  if (view.kind !== "folder") {
    return <span className="font-medium text-ink">{QUICK_LABEL[view.kind]}</span>;
  }

  const trail = [];
  let cur = folders.find((f) => f.id === view.folderId);
  while (cur) {
    trail.unshift(cur);
    cur = folders.find((f) => f.id === cur!.parentId);
  }

  return (
    <>
      {trail.map((f, i) => {
        const last = i === trail.length - 1;
        return (
          <Fragment key={f.id}>
            {i > 0 && <span className="text-subtle">/</span>}
            {last ? (
              <span className="flex min-w-0 items-center gap-1.5 font-medium text-ink">
                <span className="size-2 shrink-0 rounded-full" style={{ background: folderDot(f.color) }} />
                <span className="truncate">{f.name || "Untitled folder"}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => openFolder(f.id)}
                className="hidden truncate text-ink-2 hover:text-ink sm:inline"
              >
                {f.name}
              </button>
            )}
          </Fragment>
        );
      })}
    </>
  );
}

/** Top bar of the content area. The sidebar toggle lives in the sidebar header; it
 * appears here only when the sidebar is hidden (collapsed on desktop, drawer on mobile). */
export function WindowChrome() {
  const isMobile = useIsMobile();
  const set = useUI((s) => s.set);
  const collapsed = useUI((s) => s.sidebarCollapsed);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line/70 px-3 md:px-6">
      {isMobile ? (
        <IconButton aria-label="Open sidebar" onClick={() => set({ drawerOpen: true })}>
          <RiMenuLine size={18} />
        </IconButton>
      ) : (
        collapsed && (
          <IconButton
            aria-label="Show sidebar"
            title="Show sidebar"
            onClick={() => set({ sidebarCollapsed: false })}
            className="anim-fade -ml-1 size-7"
          >
            <RiSideBarLine size={16} />
          </IconButton>
        )
      )}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px]">
        <Breadcrumb />
      </nav>
    </header>
  );
}
