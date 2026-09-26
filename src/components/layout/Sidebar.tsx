import {
  RiAddLine,
  RiCloseLine,
  RiMoonLine,
  RiSearchLine,
  RiSettings3Line,
  RiSideBarLine,
  RiSunLine,
} from "@remixicon/react";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { useResolvedTheme } from "../../hooks/useTheme";
import { cn } from "../../lib/util";
import { IconButton } from "../ui/Buttons";
import { Tooltip } from "../ui/Tooltip";
import { createFolderAndRename } from "../../store/actions";
import { useQuickCounts } from "../../store/selectors";
import { useUI } from "../../store/ui";
import type { QuickView } from "../../types";
import { FolderTree } from "./FolderTree";
import { SearchResults } from "./SearchResults";

export const SEARCH_INPUT_ID = "global-search";

function SearchBox() {
  const search = useUI((s) => s.search);
  const set = useUI((s) => s.set);
  return (
    <div className="relative">
      <RiSearchLine size={15} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-subtle" />
      <input
        id={SEARCH_INPUT_ID}
        type="search"
        value={search}
        onChange={(e) => set({ search: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            set({ search: "" });
            e.currentTarget.blur();
          }
        }}
        placeholder="Search"
        aria-label="Search folders, cards, and notebooks"
        className="h-8 w-full rounded-lg border border-line bg-panel/70 pr-8 pl-8 text-[13px] text-ink transition-colors duration-150 outline-none placeholder:text-subtle focus:border-line-strong focus:bg-panel [&::-webkit-search-cancel-button]:hidden"
      />
      {search ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => set({ search: "" })}
          className="absolute top-1/2 right-2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted hover:text-ink"
        >
          <RiCloseLine size={14} />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-line bg-window px-1.5 font-sans text-[10.5px] text-subtle">
          /
        </kbd>
      )}
    </div>
  );
}

const QUICK: { kind: QuickView; label: string }[] = [
  { kind: "today", label: "Today" },
  { kind: "recent", label: "Recent" },
  { kind: "pinned", label: "Pinned" },
];

function QuickLinks() {
  const counts = useQuickCounts();
  const view = useUI((s) => s.view);
  const openQuickView = useUI((s) => s.openQuickView);
  return (
    <ul className="flex flex-col gap-px">
      {QUICK.map(({ kind, label }) => {
        const active = view.kind === kind;
        return (
          <li key={kind}>
            <button
              type="button"
              onClick={() => openQuickView(kind)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-[30px] w-full items-center rounded-lg px-2 text-left text-[13.5px] transition-colors duration-150",
                active ? "bg-active font-medium text-ink" : "text-ink-2 hover:bg-hover",
              )}
            >
              <span className="flex-1">{label}</span>
              <span className="text-[12px] text-subtle tabular-nums">{counts[kind] || ""}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar() {
  const search = useUI((s) => s.search);
  const set = useUI((s) => s.set);
  const isMobile = useIsMobile();
  const theme = useResolvedTheme();
  const searching = search.trim().length > 0;

  return (
    <div className="flex h-full w-[248px] flex-col bg-sidebar">
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line/70 pr-2 pl-4">
        {/* logo.png has ~20% transparent padding; let it overflow the slot (no clipping)
            so the visible mark is ~22px */}
        <span className="relative grid size-[22px] shrink-0 place-items-center" aria-hidden>
          <img
            src="/logo.png"
            alt=""
            className="pointer-events-none absolute size-[35px] max-w-none -translate-y-px select-none"
          />
        </span>
        <span className="flex-1 truncate text-[13px] text-ink-2">My Notes</span>
        <IconButton
          aria-label={isMobile ? "Close sidebar" : "Hide sidebar"}
          title={isMobile ? "Close sidebar" : "Hide sidebar"}
          onClick={() => set(isMobile ? { drawerOpen: false } : { sidebarCollapsed: true })}
          className="size-7"
        >
          <RiSideBarLine size={16} />
        </IconButton>
      </div>
      <div className="px-3 pt-3 pb-2">
        <SearchBox />
      </div>

      <div className="scroll-soft min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {searching ? (
          <SearchResults query={search} />
        ) : (
          <>
            <QuickLinks />
            <div className="mt-5 mb-1 flex items-center justify-between pr-1 pl-2">
              <h2 className="text-[13px] font-semibold text-ink">My folders</h2>
              <Tooltip label="New folder">
                <button
                  type="button"
                  aria-label="New folder"
                  onClick={() => createFolderAndRename(null)}
                  className="grid size-6 place-items-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink"
                >
                  <RiAddLine size={15} />
                </button>
              </Tooltip>
            </div>
            <FolderTree />
          </>
        )}
      </div>

      <div className="flex flex-col gap-px border-t border-line/70 px-3 py-2.5">
        <button
          type="button"
          onClick={() => createFolderAndRename(null)}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13.5px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
        >
          New folder <RiAddLine size={15} className="text-muted" />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => set({ settingsOpen: true, drawerOpen: false })}
            className="flex h-8 flex-1 items-center gap-2 rounded-lg px-2 text-[13.5px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
          >
            <RiSettings3Line size={16} className="text-muted" /> Settings
          </button>
          <IconButton
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Light theme" : "Dark theme"}
            onClick={() => set({ theme: theme === "dark" ? "light" : "dark" })}
          >
            {theme === "dark" ? <RiSunLine size={16} /> : <RiMoonLine size={16} />}
          </IconButton>
        </div>
      </div>
    </div>
  );
}
