import { RiBook2Line, RiFlagFill, RiPushpinFill } from "@remixicon/react";
import { pastelBg, pastelEdge } from "../../lib/colors";
import { daysUntil, dueLabel } from "../../lib/date";
import { cn } from "../../lib/util";
import type { FocusCard } from "../../types";
import { ProgressRing } from "../ui/ProgressRing";

interface Props {
  card: FocusCard;
  folderName: string;
  onOpen: () => void;
  fading?: boolean;
}

function DueBadge({ iso, done }: { iso: string; done: boolean }) {
  const overdue = !done && daysUntil(iso) < 0;
  return (
    <span
      className={cn(
        "shrink-0 rounded-md bg-raise/90 px-1.5 py-[3px] text-[11.5px] leading-none font-medium",
        overdue ? "text-danger" : "text-ink",
      )}
    >
      {overdue ? `Overdue · ${dueLabel(iso)}` : dueLabel(iso)}
    </span>
  );
}

export function FocusCardTile({ card, folderName, onOpen, fading }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open card: ${card.title || "Untitled card"}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group flex min-h-[196px] cursor-pointer flex-col rounded-[14px] border p-3.5 text-left transition-[transform,opacity,filter] duration-200 ease-[var(--ease)] hover:-translate-y-0.5 hover:brightness-[1.015] active:translate-y-0",
        fading && "pointer-events-none scale-[0.96] opacity-0",
        card.done && "opacity-60 hover:opacity-90",
      )}
      style={{ background: pastelBg(card.color), borderColor: pastelEdge(card.color) }}
    >
      <div className="flex min-h-[20px] items-center gap-1.5 text-[12px]">
        {card.dueDate && <DueBadge iso={card.dueDate} done={card.done} />}
        <span className="min-w-0 truncate text-ink-2/80">{folderName}</span>
        <span className="ml-auto flex items-center gap-1 text-ink-2/70">
          {card.priority === "high" && !card.done && <RiFlagFill size={13} aria-label="High priority" />}
          {card.pinned && <RiPushpinFill size={13} aria-label="Pinned" />}
        </span>
      </div>

      <h3
        className={cn(
          "mt-2.5 line-clamp-3 font-serif text-[17px] leading-[1.3] font-semibold text-ink",
          card.done && "line-through decoration-ink/30",
          !card.title && "text-ink/40",
        )}
      >
        {card.title || "Untitled card"}
      </h3>
      {card.detail && <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-[1.45] text-ink-2/85">{card.detail}</p>}

      <div className="mt-auto flex items-center justify-between pt-4 text-[12px] text-ink-2/80">
        <span className="flex items-center gap-1" title="Linked notebooks">
          <RiBook2Line size={14} />
          <span className="tabular-nums">{card.linkedNotebookIds.length}</span>
          {card.checklist.length > 0 && (
            <span className="ml-2 tabular-nums">
              {card.checklist.filter((k) => k.done).length}/{card.checklist.length}
            </span>
          )}
        </span>
        <ProgressRing value={card.progress} />
      </div>
    </div>
  );
}
