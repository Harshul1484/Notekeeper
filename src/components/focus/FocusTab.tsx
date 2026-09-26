import { RiAddLine, RiArrowRightSLine, RiArrowUpDownLine, RiCheckLine } from "@remixicon/react";
import { useMemo, useState } from "react";
import { cn } from "../../lib/util";
import { createCardAndOpen } from "../../store/actions";
import { useData } from "../../store/data";
import { sortCards } from "../../store/selectors";
import { useUI } from "../../store/ui";
import type { CardSort, Folder } from "../../types";
import { PillButton } from "../ui/Buttons";
import { MenuItem, Popover } from "../ui/Popover";
import { SectionLabel } from "../ui/SectionLabel";
import { FocusCardTile } from "./FocusCardTile";

const SORT_LABEL: Record<CardSort, string> = {
  updated: "Recently updated",
  due: "Due date",
  priority: "Priority",
};

export const CARD_GRID =
  "grid grid-cols-1 gap-4 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]";

function SortMenu() {
  const sort = useUI((s) => s.cardSort);
  const set = useUI((s) => s.set);
  return (
    <Popover
      trigger={({ toggle }) => (
        <PillButton onClick={toggle} aria-label={`Sort: ${SORT_LABEL[sort]}`}>
          <RiArrowUpDownLine size={14} className="text-muted" />
          {SORT_LABEL[sort]}
        </PillButton>
      )}
    >
      {(close) =>
        (Object.keys(SORT_LABEL) as CardSort[]).map((k) => (
          <MenuItem
            key={k}
            active={k === sort}
            icon={k === sort ? <RiCheckLine size={14} /> : <span />}
            onClick={() => {
              set({ cardSort: k });
              close();
            }}
          >
            {SORT_LABEL[k]}
          </MenuItem>
        ))
      }
    </Popover>
  );
}

function TagChips({ counts }: { counts: [string, number][] }) {
  const selected = useUI((s) => s.tagFilter);
  const toggleTag = useUI((s) => s.toggleTag);
  const set = useUI((s) => s.set);
  return (
    <div>
      <SectionLabel
        right={
          selected.length > 0 && (
            <button
              type="button"
              onClick={() => set({ tagFilter: [] })}
              className="text-[12.5px] text-muted hover:text-ink"
            >
              Clear
            </button>
          )
        }
      >
        Tags
      </SectionLabel>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {counts.map(([tag, n]) => {
          const on = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={on}
              onClick={() => toggleTag(tag)}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full border pr-1 pl-3 text-[13px] transition-colors duration-150",
                on
                  ? "border-chip-ink bg-chip-ink text-window"
                  : "border-transparent bg-chip text-chip-ink hover:border-line-strong",
              )}
            >
              {tag}
              <span
                className={cn(
                  "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] tabular-nums",
                  on ? "bg-raise/20 text-window" : "bg-chip-count text-chip-ink",
                )}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FocusTab({ folder }: { folder: Folder }) {
  const cards = useData((s) => s.cards);
  const sort = useUI((s) => s.cardSort);
  const tagFilter = useUI((s) => s.tagFilter);
  const fading = useUI((s) => s.fading);
  const set = useUI((s) => s.set);
  const [showDone, setShowDone] = useState(false);

  const { active, done, tagCounts } = useMemo(() => {
    const mine = cards.filter((c) => c.folderId === folder.id);
    const active = mine.filter((c) => !c.done);
    const counts = new Map<string, number>();
    active.forEach((c) => c.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return {
      active,
      done: mine.filter((c) => c.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)),
      tagCounts: [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    };
  }, [cards, folder.id]);

  const visible = useMemo(() => {
    const filtered = tagFilter.length ? active.filter((c) => c.tags.some((t) => tagFilter.includes(t))) : active;
    return sortCards(filtered, sort);
  }, [active, tagFilter, sort]);

  const open = (id: string) => set({ openCardId: id });

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-5 md:p-6">
      {tagCounts.length > 0 && <TagChips counts={tagCounts} />}

      <div>
        <SectionLabel>
          <span>
            Cards <span className="text-muted tabular-nums">({active.length})</span>
          </span>
          <PillButton onClick={() => createCardAndOpen(folder.id)} title="New card" shortcut="N">
            <RiAddLine size={14} className="text-muted" /> Add
          </PillButton>
          <SortMenu />
        </SectionLabel>

        {visible.length > 0 ? (
          <div className={cn(CARD_GRID, "mt-4")}>
            {visible.map((c) => (
              <FocusCardTile
                key={c.id}
                card={c}
                folderName={folder.name}
                fading={!!fading[c.id]}
                onOpen={() => open(c.id)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 grid place-items-center rounded-[14px] border border-dashed border-line-strong px-6 py-12 text-center">
            <p className="font-serif text-[17px] font-medium text-ink-2">
              {active.length ? "No cards with these tags" : "Nothing needs your attention"}
            </p>
            <p className="mt-1 text-[13px] text-muted">
              {active.length ? (
                "Clear the filter to see everything."
              ) : (
                <>
                  Press <kbd className="rounded border border-line bg-window px-1 text-[11px]">N</kbd> or use + Add to
                  capture something quick.
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {done.length > 0 && (
        <div>
          <SectionLabel>
            <button
              type="button"
              aria-expanded={showDone}
              onClick={() => setShowDone((v) => !v)}
              className="flex items-center gap-1 text-ink-2 hover:text-ink"
            >
              <RiArrowRightSLine
                size={16}
                className={cn("text-muted transition-transform duration-150", showDone && "rotate-90")}
              />
              Done <span className="text-muted tabular-nums">({done.length})</span>
            </button>
          </SectionLabel>
          {showDone && (
            <div className={cn(CARD_GRID, "anim-rise mt-4")}>
              {done.map((c) => (
                <FocusCardTile key={c.id} card={c} folderName={folder.name} onOpen={() => open(c.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
