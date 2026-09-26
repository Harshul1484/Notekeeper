import { RiBook2Line, RiPushpinFill } from "@remixicon/react";
import { useMemo, type KeyboardEvent } from "react";
import { pastelBg, pastelEdge } from "../../lib/colors";
import { relativeTime } from "../../lib/date";
import { htmlToText } from "../../lib/util";
import type { Notebook } from "../../types";

interface Props {
  notebook: Notebook;
  folderName: string;
  onOpen: () => void;
}

const useSnippet = (html: string) => useMemo(() => htmlToText(html).slice(0, 260), [html]);

const activate = (onOpen: () => void) => ({
  role: "button" as const,
  tabIndex: 0,
  onClick: onOpen,
  onKeyDown: (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  },
});

export function NotebookTile({ notebook: n, folderName, onOpen }: Props) {
  const snippet = useSnippet(n.content);
  return (
    <div
      {...activate(onOpen)}
      aria-label={`Open notebook: ${n.title || "Untitled notebook"}`}
      className="group flex min-h-[196px] cursor-pointer flex-col rounded-[14px] border p-3.5 text-left transition-[transform,filter] duration-200 ease-[var(--ease)] hover:-translate-y-0.5 hover:brightness-[1.015]"
      style={{ background: pastelBg(n.color), borderColor: pastelEdge(n.color) }}
    >
      <div className="flex min-h-[20px] items-center gap-1.5 text-[12px]">
        <span className="shrink-0 rounded-md bg-raise/90 px-1.5 py-[3px] text-[11.5px] leading-none font-medium text-ink">
          {relativeTime(n.updatedAt)}
        </span>
        <span className="min-w-0 truncate text-ink-2/80">{folderName}</span>
        {n.pinned && <RiPushpinFill size={13} className="ml-auto text-ink-2/70" aria-label="Pinned" />}
      </div>
      <h3 className="mt-2.5 line-clamp-2 font-serif text-[17px] leading-[1.3] font-semibold text-ink">
        {n.title || "Untitled notebook"}
      </h3>
      <p className="mt-1.5 line-clamp-4 text-[12.5px] leading-[1.45] text-ink-2/85">
        {snippet || <span className="text-ink-2/50">Empty notebook</span>}
      </p>
      <div className="mt-auto flex items-center gap-1 overflow-hidden pt-4">
        <RiBook2Line size={14} className="mr-1 shrink-0 text-ink-2/70" />
        {n.tags.slice(0, 3).map((t) => (
          <span key={t} className="truncate rounded-full bg-raise/55 px-2 py-0.5 text-[11.5px] text-ink-2">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function NotebookRow({ notebook: n, folderName, onOpen }: Props) {
  const snippet = useSnippet(n.content);
  return (
    <div
      {...activate(onOpen)}
      aria-label={`Open notebook: ${n.title || "Untitled notebook"}`}
      className="group flex cursor-pointer items-center gap-4 rounded-xl px-3 py-3 transition-colors duration-150 hover:bg-hover"
    >
      <span
        className="grid size-9 shrink-0 place-items-center rounded-[10px] border"
        style={{ background: pastelBg(n.color), borderColor: pastelEdge(n.color) }}
      >
        <RiBook2Line size={16} className="text-ink-2/80" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-serif text-[15.5px] font-semibold text-ink">{n.title || "Untitled notebook"}</h3>
          {n.pinned && <RiPushpinFill size={12} className="shrink-0 text-ink-2/60" aria-label="Pinned" />}
        </div>
        <p className="truncate text-[12.5px] text-muted">{snippet || "Empty notebook"}</p>
      </div>
      <div className="hidden shrink-0 items-center gap-1 lg:flex">
        {n.tags.slice(0, 2).map((t) => (
          <span key={t} className="rounded-full bg-chip px-2 py-0.5 text-[11.5px] text-chip-ink">
            {t}
          </span>
        ))}
      </div>
      <span className="hidden w-24 shrink-0 truncate text-right text-[12px] text-subtle sm:block">{folderName}</span>
      <span className="w-20 shrink-0 text-right text-[12px] text-muted tabular-nums">{relativeTime(n.updatedAt)}</span>
    </div>
  );
}
