import { RiPencilLine } from "@remixicon/react";
import { useEffect, useRef, useState } from "react";
import { useData } from "../../store/data";
import type { Folder } from "../../types";
import { AutoTextarea } from "../ui/AutoTextarea";
import { Tooltip } from "../ui/Tooltip";

export function FolderHeader({ folder }: { folder: Folder }) {
  const updateFolder = useData((s) => s.updateFolder);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(folder.name);
    setEditing(false);
  }, [folder.id, folder.name]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    if (name.trim()) updateFolder(folder.id, { name: name.trim() });
    else setName(folder.name);
    setEditing(false);
  };

  return (
    <header className="max-w-[760px]">
      <div className="flex min-h-[52px] items-center gap-3">
        {editing ? (
          <input
            ref={inputRef}
            value={name}
            aria-label="Folder name"
            onChange={(e) => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                e.stopPropagation();
                setName(folder.name);
                setEditing(false);
              }
            }}
            className="w-full min-w-0 rounded-lg bg-transparent font-serif text-[32px] leading-tight font-medium tracking-[-0.01em] text-ink outline-none md:text-[40px]"
          />
        ) : (
          <>
            <h1
              className="min-w-0 truncate font-serif text-[32px] leading-tight font-medium tracking-[-0.01em] text-ink md:text-[40px]"
              onDoubleClick={() => setEditing(true)}
            >
              {folder.name || "Untitled folder"}
            </h1>
            <Tooltip label="Rename folder">
              <button
                type="button"
                aria-label="Rename folder"
                onClick={() => setEditing(true)}
                className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong bg-panel/70 text-ink-2 transition-colors duration-150 hover:bg-panel hover:text-ink"
              >
                <RiPencilLine size={14} />
              </button>
            </Tooltip>
          </>
        )}
      </div>
      <AutoTextarea
        value={folder.description}
        onChange={(e) => updateFolder(folder.id, { description: e.target.value })}
        placeholder="Add a short description…"
        aria-label="Folder description"
        className="mt-2 -ml-2 rounded-lg px-2 py-1 text-[15px] leading-[1.6] text-muted transition-colors duration-150 placeholder:text-subtle hover:bg-hover focus:bg-panel/70"
      />
    </header>
  );
}
