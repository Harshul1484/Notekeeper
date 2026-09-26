import { RiDeleteBinLine, RiFolderAddLine, RiPencilLine } from "@remixicon/react";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useClickOutside } from "../../hooks/useClickOutside";
import { FOLDER_COLORS, folderDot } from "../../lib/colors";
import { createFolderAndRename } from "../../store/actions";
import { folderSubtree, useData } from "../../store/data";
import { useUI } from "../../store/ui";
import { ColorSwatches } from "../ui/ColorSwatches";
import { MenuItem } from "../ui/Popover";

export function FolderContextMenu() {
  const menu = useUI((s) => s.folderMenu);
  if (!menu) return null;
  return <Menu key={`${menu.folderId}-${menu.x}-${menu.y}`} {...menu} />;
}

function Menu({ folderId, x, y }: { folderId: string; x: number; y: number }) {
  const folder = useData((s) => s.folders.find((f) => f.id === folderId));
  const folders = useData((s) => s.folders);
  const { updateFolder, deleteFolder } = useData.getState();
  const ui = useUI.getState();
  const ref = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [pos, setPos] = useState({ x, y });
  const close = () => ui.set({ folderMenu: null });
  useClickOutside(ref, close);

  // Keep the menu inside the viewport.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: Math.min(x, window.innerWidth - r.width - 8),
      y: Math.min(y, window.innerHeight - r.height - 8),
    });
  }, [x, y]);

  if (!folder) return null;
  const nested = folderSubtree(folders, folderId).size - 1;

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={`${folder.name} options`}
      className="anim-rise fixed z-[70] w-[220px] rounded-xl border border-line bg-panel p-1.5"
      style={{ left: pos.x, top: pos.y, boxShadow: "var(--shadow-float)" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MenuItem
        icon={<RiPencilLine size={15} />}
        onClick={() => {
          ui.set({ renamingFolderId: folderId, folderMenu: null });
        }}
      >
        Rename
      </MenuItem>
      <MenuItem
        icon={<RiFolderAddLine size={15} />}
        onClick={() => {
          close();
          createFolderAndRename(folderId);
        }}
      >
        New subfolder
      </MenuItem>
      <div className="my-1 h-px bg-line" />
      <div className="px-2.5 pt-1 pb-2">
        <p className="mb-2 text-[11.5px] font-medium text-subtle">Color</p>
        <ColorSwatches
          colors={FOLDER_COLORS}
          value={folder.color}
          toCss={folderDot}
          size={18}
          onChange={(color) => updateFolder(folderId, { color })}
        />
      </div>
      <div className="my-1 h-px bg-line" />
      {confirming ? (
        <div className="px-2.5 py-1.5">
          <p className="mb-2 text-[12px] leading-snug text-ink-2">
            Delete “{folder.name}”{nested ? ` and ${nested} subfolder${nested > 1 ? "s" : ""}` : ""} with all its
            cards, notebooks, and canvas?
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              autoFocus
              onClick={() => {
                const view = ui.view;
                deleteFolder(folderId);
                close();
                if (view.kind === "folder" && folderSubtree(folders, folderId).has(view.folderId)) {
                  const next = useData.getState().folders.find((f) => !f.parentId);
                  if (next) ui.openFolder(next.id);
                  else ui.openQuickView("today");
                }
              }}
              className="h-7 rounded-lg bg-danger px-2.5 text-[12.5px] font-medium text-white hover:opacity-90"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-7 rounded-lg px-2.5 text-[12.5px] text-ink-2 hover:bg-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <MenuItem danger icon={<RiDeleteBinLine size={15} />} onClick={() => setConfirming(true)}>
          Delete folder
        </MenuItem>
      )}
    </div>,
    document.body,
  );
}
