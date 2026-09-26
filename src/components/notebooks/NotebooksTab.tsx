import { RiAddLine, RiLayoutGridLine, RiListUnordered } from "@remixicon/react";
import { useMemo } from "react";
import { cn } from "../../lib/util";
import { createNotebookAndOpen } from "../../store/actions";
import { useData } from "../../store/data";
import { useUI } from "../../store/ui";
import type { Folder } from "../../types";
import { CARD_GRID } from "../focus/FocusTab";
import { PillButton } from "../ui/Buttons";
import { Tooltip } from "../ui/Tooltip";
import { SectionLabel } from "../ui/SectionLabel";
import { NotebookRow, NotebookTile } from "./NotebookTile";

function LayoutToggle() {
  const layout = useUI((s) => s.notebookLayout);
  const set = useUI((s) => s.set);
  const opt = (value: "grid" | "list", label: string, Icon: typeof RiListUnordered) => (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={layout === value}
        onClick={() => set({ notebookLayout: value })}
        className={cn(
          "grid h-6 w-7 place-items-center rounded-md transition-colors duration-150",
          layout === value ? "bg-panel text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-muted hover:text-ink",
        )}
      >
        <Icon size={14} />
      </button>
    </Tooltip>
  );
  return (
    <div className="flex rounded-lg border border-line bg-window p-0.5">
      {opt("grid", "Grid view", RiLayoutGridLine)}
      {opt("list", "List view", RiListUnordered)}
    </div>
  );
}

export function NotebooksTab({ folder }: { folder: Folder }) {
  const all = useData((s) => s.notebooks);
  const layout = useUI((s) => s.notebookLayout);
  const set = useUI((s) => s.set);
  const notebooks = useMemo(
    () => all.filter((n) => n.folderId === folder.id).sort((a, b) => b.updatedAt - a.updatedAt),
    [all, folder.id],
  );
  const open = (id: string) => set({ openNotebookId: id });

  return (
    <div className="p-4 sm:p-5 md:p-6">
      <SectionLabel right={<LayoutToggle />}>
        <span>
          Notebooks <span className="text-muted tabular-nums">({notebooks.length})</span>
        </span>
        <PillButton onClick={() => createNotebookAndOpen(folder.id)} title="New notebook" shortcut="N">
          <RiAddLine size={14} className="text-muted" /> New
        </PillButton>
      </SectionLabel>

      {notebooks.length === 0 ? (
        <div className="mt-4 grid place-items-center rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center">
          <p className="font-serif text-[17px] font-medium text-ink-2">No notebooks yet</p>
          <p className="mt-1 text-[13px] text-muted">Longer notes, meeting logs, and drafts live here.</p>
        </div>
      ) : layout === "grid" ? (
        <div className={cn(CARD_GRID, "mt-4")}>
          {notebooks.map((n) => (
            <NotebookTile key={n.id} notebook={n} folderName={folder.name} onOpen={() => open(n.id)} />
          ))}
        </div>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-line/70">
          {notebooks.map((n) => (
            <NotebookRow key={n.id} notebook={n} folderName={folder.name} onOpen={() => open(n.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
