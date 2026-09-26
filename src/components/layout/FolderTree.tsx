import { RiArrowRightSLine, RiMoreLine } from "@remixicon/react";
import { createContext, useContext, useEffect, useRef, useState, type DragEvent } from "react";
import { folderDot } from "../../lib/colors";
import { cn } from "../../lib/util";
import { folderSubtree, useData, type DropPosition } from "../../store/data";
import { sortedChildren, useFolderCounts } from "../../store/selectors";
import { useUI } from "../../store/ui";
import type { Folder } from "../../types";
import { Tooltip } from "../ui/Tooltip";

interface DragState {
  dragId: string | null;
  drop: { id: string; pos: DropPosition } | null;
  setDragId: (id: string | null) => void;
  setDrop: (d: { id: string; pos: DropPosition } | null) => void;
  counts: Map<string, number>;
}

const DragCtx = createContext<DragState | null>(null);

export function FolderTree() {
  const folders = useData((s) => s.folders);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<DragState["drop"]>(null);
  const counts = useFolderCounts();
  const roots = sortedChildren(folders, null);

  return (
    <DragCtx.Provider value={{ dragId, drop, setDragId, setDrop, counts }}>
      <ul role="tree" aria-label="My folders" className="flex flex-col gap-px">
        {roots.map((f) => (
          <FolderNode key={f.id} folder={f} />
        ))}
      </ul>
    </DragCtx.Provider>
  );
}

function RenameInput({ folder }: { folder: Folder }) {
  const updateFolder = useData((s) => s.updateFolder);
  const set = useUI((s) => s.set);
  const [value, setValue] = useState(folder.name);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.select(), []);

  const finish = (save: boolean) => {
    if (save && value.trim()) updateFolder(folder.id, { name: value.trim() });
    set({ renamingFolderId: null });
  };

  return (
    <input
      ref={ref}
      value={value}
      aria-label="Folder name"
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(true);
        if (e.key === "Escape") {
          e.stopPropagation();
          finish(false);
        }
      }}
      className="h-6 min-w-0 flex-1 rounded-md border border-line-strong bg-panel px-1.5 text-[13px] text-ink outline-none"
    />
  );
}

function FolderNode({ folder }: { folder: Folder }) {
  const folders = useData((s) => s.folders);
  const moveFolder = useData((s) => s.moveFolder);
  const expanded = useUI((s) => !!s.expanded[folder.id]);
  const active = useUI((s) => s.view.kind === "folder" && s.view.folderId === folder.id);
  const renaming = useUI((s) => s.renamingFolderId === folder.id);
  const { openFolder, toggleExpanded, set } = useUI.getState();
  const drag = useContext(DragCtx)!;

  const children = sortedChildren(folders, folder.id);
  const hasChildren = children.length > 0;
  const drop = drag.drop?.id === folder.id ? drag.drop.pos : null;
  const count = drag.counts.get(folder.id) ?? 0;

  const canDropHere = () =>
    !!drag.dragId && drag.dragId !== folder.id && !folderSubtree(folders, drag.dragId).has(folder.id);

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!canDropHere()) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pos: DropPosition = y < rect.height * 0.28 ? "before" : y > rect.height * 0.72 ? "after" : "inside";
    if (drag.drop?.id !== folder.id || drag.drop.pos !== pos) drag.setDrop({ id: folder.id, pos });
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (drag.dragId && drop) {
      moveFolder(drag.dragId, folder.id, drop);
      if (drop === "inside") toggleExpanded(folder.id, true);
    }
    drag.setDragId(null);
    drag.setDrop(null);
  };

  const openMenu = (x: number, y: number) => set({ folderMenu: { folderId: folder.id, x, y } });

  return (
    <li
      role="treeitem"
      aria-label={folder.name || "Untitled folder"}
      aria-expanded={hasChildren ? expanded : undefined}
      aria-selected={active}
    >
      <div
        draggable={!renaming}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", folder.id);
          e.dataTransfer.effectAllowed = "move";
          drag.setDragId(folder.id);
        }}
        onDragOver={onDragOver}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node) && drag.drop?.id === folder.id) drag.setDrop(null);
        }}
        onDrop={onDrop}
        onDragEnd={() => {
          drag.setDragId(null);
          drag.setDrop(null);
        }}
        onClick={() => openFolder(folder.id)}
        onDoubleClick={() => set({ renamingFolderId: folder.id })}
        onContextMenu={(e) => {
          e.preventDefault();
          openMenu(e.clientX, e.clientY);
        }}
        className={cn(
          "group relative flex h-[30px] cursor-pointer items-center rounded-lg pr-1.5 text-[13.5px] transition-colors duration-150 select-none",
          active ? "bg-active font-medium text-ink" : "text-ink-2 hover:bg-hover",
          drop === "inside" && "bg-select/10 ring-1 ring-select/60",
          drag.dragId === folder.id && "opacity-50",
        )}
      >
        {drop === "before" && <span className="absolute -top-px right-1 left-5 h-0.5 rounded-full bg-select" />}
        {drop === "after" && <span className="absolute right-1 -bottom-px left-5 h-0.5 rounded-full bg-select" />}

        <button
          type="button"
          tabIndex={hasChildren ? 0 : -1}
          aria-label={hasChildren ? (expanded ? "Collapse" : "Expand") : undefined}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleExpanded(folder.id);
          }}
          className={cn("grid h-full w-[18px] shrink-0 place-items-center text-subtle", hasChildren && "hover:text-ink")}
        >
          {hasChildren && (
            <RiArrowRightSLine
              size={15}
              className={cn("transition-transform duration-150", expanded && "rotate-90")}
            />
          )}
        </button>
        <span className="mr-2 size-[9px] shrink-0 rounded-full" style={{ background: folderDot(folder.color) }} />
        {renaming ? (
          <RenameInput folder={folder} />
        ) : (
          <span className="min-w-0 flex-1 truncate">{folder.name || "Untitled folder"}</span>
        )}
        {!renaming && (
          <>
            <span className="ml-2 text-[12px] text-subtle tabular-nums group-hover:hidden">{count || ""}</span>
            <Tooltip label="More options">
              <button
                type="button"
                aria-label={`${folder.name} options`}
                onClick={(e) => {
                  e.stopPropagation();
                  const r = e.currentTarget.getBoundingClientRect();
                  openMenu(r.left, r.bottom + 4);
                }}
                className="ml-1 hidden size-5 place-items-center rounded-md text-muted hover:bg-shade/5 hover:text-ink group-hover:grid"
              >
                <RiMoreLine size={15} />
              </button>
            </Tooltip>
          </>
        )}
      </div>

      {hasChildren && expanded && (
        <ul role="group" className="anim-fade mt-px ml-[22px] flex flex-col gap-px border-l border-line pl-1">
          {children.map((c) => (
            <FolderNode key={c.id} folder={c} />
          ))}
        </ul>
      )}
    </li>
  );
}
