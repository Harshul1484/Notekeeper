import * as ContextMenu from "@radix-ui/react-context-menu";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  RiArrowRightSLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiFolderAddLine,
  RiLink,
  RiPaletteLine,
  RiPencilLine,
} from "@remixicon/react";
import { useState, type ReactElement, type ReactNode } from "react";
import { FOLDER_COLORS, folderDot } from "../../lib/colors";
import { urlFor } from "../../lib/routes";
import { cn } from "../../lib/util";
import { createFolderAndRename } from "../../store/actions";
import { folderSubtree, useData } from "../../store/data";
import { useUI } from "../../store/ui";
import type { Folder, FolderColor } from "../../types";
import { Tooltip } from "../ui/Tooltip";

/*
 * Folder actions, shared by the right-click menu (Radix Context Menu) and the
 * row's ⋯ button (Radix Dropdown Menu). Both primitives expose the same parts,
 * so the items are written once against whichever set is passed in.
 */
type Kit = typeof DropdownMenu;

export const menuContentClass =
  "anim-rise z-[80] min-w-[220px] rounded-xl border border-line bg-panel p-1.5 text-[13px] outline-none";

const itemClass =
  "flex w-full cursor-default items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-ink-2 outline-none select-none data-[highlighted]:bg-hover data-[highlighted]:text-ink";

const Icon = ({ children }: { children: ReactNode }) => (
  <span className="grid w-4 place-items-center text-muted">{children}</span>
);

function FolderMenuItems({ kit: M, folder }: { kit: Kit; folder: Folder }) {
  const folders = useData((s) => s.folders);
  const [confirming, setConfirming] = useState(false);
  const nested = folderSubtree(folders, folder.id).size - 1;

  const remove = () => {
    const ui = useUI.getState();
    const view = ui.view;
    const removed = folderSubtree(useData.getState().folders, folder.id);
    useData.getState().deleteFolder(folder.id);
    if (view.kind === "folder" && removed.has(view.folderId)) {
      const next = useData.getState().folders.find((f) => !f.parentId);
      if (next) ui.openFolder(next.id);
      else ui.openQuickView("today");
    }
  };

  return (
    <>
      <M.Item className={itemClass} onSelect={() => useUI.getState().set({ renamingFolderId: folder.id })}>
        <Icon>
          <RiPencilLine size={15} />
        </Icon>
        Rename
      </M.Item>
      <M.Item className={itemClass} onSelect={() => createFolderAndRename(folder.id)}>
        <Icon>
          <RiFolderAddLine size={15} />
        </Icon>
        New subfolder
      </M.Item>
      <M.Item
        className={itemClass}
        onSelect={() =>
          void navigator.clipboard?.writeText(urlFor({ view: { kind: "folder", folderId: folder.id } }, useData.getState()))
        }
      >
        <Icon>
          <RiLink size={15} />
        </Icon>
        Copy link
      </M.Item>

      <M.Sub>
        <M.SubTrigger className={cn(itemClass, "data-[state=open]:bg-hover")}>
          <Icon>
            <RiPaletteLine size={15} />
          </Icon>
          <span className="flex-1">Color</span>
          <span className="size-2.5 rounded-full" style={{ background: folderDot(folder.color) }} />
          <RiArrowRightSLine size={15} className="text-muted" />
        </M.SubTrigger>
        <M.Portal>
          <M.SubContent
            sideOffset={6}
            collisionPadding={8}
            className={cn(menuContentClass, "min-w-[168px]")}
            style={{ boxShadow: "var(--shadow-float)" }}
          >
            <M.RadioGroup
              value={folder.color}
              onValueChange={(color) => useData.getState().updateFolder(folder.id, { color: color as FolderColor })}
            >
              {FOLDER_COLORS.map((c) => (
                <M.RadioItem key={c} value={c} className={itemClass}>
                  <span className="size-3 rounded-full" style={{ background: folderDot(c) }} />
                  <span className="flex-1 capitalize">{c}</span>
                  <M.ItemIndicator>
                    <RiCheckLine size={14} className="text-ink" />
                  </M.ItemIndicator>
                </M.RadioItem>
              ))}
            </M.RadioGroup>
          </M.SubContent>
        </M.Portal>
      </M.Sub>

      <M.Separator className="my-1 h-px bg-line" />
      <M.Item
        className={cn(
          itemClass,
          "text-danger data-[highlighted]:bg-danger/10 data-[highlighted]:text-danger",
          confirming && "bg-danger/10 font-medium",
        )}
        onSelect={(e) => {
          if (!confirming) {
            e.preventDefault(); // keep the menu open for the confirm step
            setConfirming(true);
          } else remove();
        }}
      >
        <Icon>
          <RiDeleteBinLine size={15} className="text-danger" />
        </Icon>
        {confirming ? "Click again to delete" : "Delete folder"}
      </M.Item>
      {confirming && (
        <p className="px-2.5 pt-1 pb-1.5 text-[11.5px] leading-snug text-muted">
          Deletes “{folder.name}”{nested ? ` and ${nested} subfolder${nested > 1 ? "s" : ""}` : ""} with all cards,
          notebooks, and canvas items.
        </p>
      )}
    </>
  );
}

/** Shared content props: keep focus where Rename/New subfolder put it, and keep Escape local. */
const contentProps = {
  collisionPadding: 8,
  className: menuContentClass,
  style: { boxShadow: "var(--shadow-float)" },
  onCloseAutoFocus: (e: Event) => e.preventDefault(),
  onEscapeKeyDown: (e: KeyboardEvent) => e.stopPropagation(),
};

/** Right-click anywhere on the folder row. */
export function FolderContextMenu({ folder, children }: { folder: Folder; children: ReactElement }) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content {...contentProps} aria-label={`${folder.name} options`}>
          <FolderMenuItems kit={ContextMenu as unknown as Kit} folder={folder} />
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

/** The ⋯ button on the folder row. */
export function FolderDropdownMenu({ folder, trigger, tooltip }: { folder: Folder; trigger: ReactElement; tooltip?: string }) {
  return (
    <DropdownMenu.Root modal={false}>
      <Tooltip label={tooltip}>
        <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      </Tooltip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content {...contentProps} align="start" sideOffset={4} aria-label={`${folder.name} options`}>
          <FolderMenuItems kit={DropdownMenu} folder={folder} />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
