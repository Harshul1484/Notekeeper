import {
  RiAddLine,
  RiAlarmLine,
  RiArrowGoBackLine,
  RiBook2Line,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiLinkM,
  RiPaletteLine,
  RiPushpinFill,
  RiPushpinLine,
} from "@remixicon/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { folderDot, pastelBg, pastelEdge, PASTELS } from "../../lib/colors";
import { addDaysISO, dueLabel } from "../../lib/date";
import { cn, uid } from "../../lib/util";
import { completeCard, restoreCard } from "../../store/actions";
import { useData } from "../../store/data";
import { useUI } from "../../store/ui";
import type { FocusCard, Priority } from "../../types";
import { AutoTextarea } from "../ui/AutoTextarea";
import { GhostButton, IconButton, PrimaryButton } from "../ui/Buttons";
import { ColorSwatches } from "../ui/ColorSwatches";
import { DatePicker } from "../ui/DatePicker";
import { Modal } from "../ui/Modal";
import { MenuItem, Popover } from "../ui/Popover";
import { ProgressRing } from "../ui/ProgressRing";
import { TagEditor } from "../ui/TagEditor";

const isBlank = (c: FocusCard) =>
  !c.title.trim() && !c.detail.trim() && !c.checklist.length && !c.tags.length && !c.linkedNotebookIds.length;

export function CardModal() {
  const id = useUI((s) => s.openCardId);
  const card = useData((s) => (id ? s.cards.find((c) => c.id === id) : undefined));
  if (!card) return null;
  return <CardDetail key={card.id} card={card} />;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-3 py-1.5">
      <span className="text-[12.5px] text-ink-2/75">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const PRIORITIES: Priority[] = ["low", "medium", "high"];

function CardDetail({ card }: { card: FocusCard }) {
  const folder = useData((s) => s.folders.find((f) => f.id === card.folderId));
  const allCards = useData((s) => s.cards);
  const notebooks = useData((s) => s.notebooks);
  const folders = useData((s) => s.folders);
  const { updateCard, deleteCard, addNotebook } = useData.getState();
  const ui = useUI.getState();
  const [newItem, setNewItem] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const patch = (p: Partial<FocusCard>) => updateCard(card.id, p);
  const close = () => ui.set({ openCardId: null });

  // A card that was opened with "+ Add" and closed untouched is discarded.
  useEffect(() => {
    const id = card.id;
    return () => {
      window.setTimeout(() => {
        if (useUI.getState().openCardId === id) return; // remounted (StrictMode)
        const latest = useData.getState().cards.find((c) => c.id === id);
        if (latest && isBlank(latest)) useData.getState().deleteCard(id);
      });
    };
  }, [card.id]);

  const tagSuggestions = useMemo(() => [...new Set(allCards.flatMap((c) => c.tags))].sort(), [allCards]);
  const linked = notebooks.filter((n) => card.linkedNotebookIds.includes(n.id));
  const folderName = (id: string) => folders.find((f) => f.id === id)?.name ?? "";
  const doneCount = card.checklist.filter((k) => k.done).length;

  const toggleLink = (notebookId: string) =>
    patch({
      linkedNotebookIds: card.linkedNotebookIds.includes(notebookId)
        ? card.linkedNotebookIds.filter((x) => x !== notebookId)
        : [...card.linkedNotebookIds, notebookId],
    });

  const openNotebook = (notebookId: string, folderId: string) => {
    ui.set({ openCardId: null });
    ui.openFolder(folderId, "notebooks");
    ui.set({ openNotebookId: notebookId });
  };

  const addChecklistItem = () => {
    const text = newItem.trim();
    if (!text) return;
    patch({ checklist: [...card.checklist, { id: uid(), text, done: false }] });
    setNewItem("");
  };

  return (
    <Modal
      label="Card details"
      onClose={close}
      className="max-w-[600px] rounded-[18px] border"
      style={{ background: pastelBg(card.color), borderColor: pastelEdge(card.color) }}
    >
      <div className="flex items-center gap-2 px-5 pt-4 pb-1">
        <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-2/80">
          {folder && <span className="size-2 rounded-full" style={{ background: folderDot(folder.color) }} />}
          <span className="truncate">{folder?.name}</span>
          {card.done && <span className="rounded-md bg-raise/70 px-1.5 py-0.5 text-[11px] font-medium text-ink">Done</span>}
        </span>
        <div className="ml-auto flex items-center">
          <IconButton
            aria-label={card.pinned ? "Unpin" : "Pin"}
            title={card.pinned ? "Unpin" : "Pin"}
            onClick={() => patch({ pinned: !card.pinned })}
            className="text-ink-2 hover:bg-shade/5"
          >
            {card.pinned ? <RiPushpinFill size={16} /> : <RiPushpinLine size={16} />}
          </IconButton>
          <IconButton aria-label="Close" onClick={close} className="text-ink-2 hover:bg-shade/5">
            <RiCloseLine size={18} />
          </IconButton>
        </div>
      </div>

      <div className="scroll-soft min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <AutoTextarea
          value={card.title}
          autoFocus={!card.title}
          placeholder="What needs attention?"
          aria-label="Card title"
          onChange={(e) => patch({ title: e.target.value.replace(/\n/g, " ") })}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          className="-mx-2 rounded-lg px-2 py-0.5 font-serif text-[24px] leading-[1.25] font-semibold text-ink transition-colors duration-150 placeholder:text-ink/30 hover:bg-raise/25 focus:bg-raise/45"
        />
        <AutoTextarea
          value={card.detail}
          placeholder="Add a short detail…"
          aria-label="Card detail"
          onChange={(e) => patch({ detail: e.target.value })}
          className="-mx-2 mt-1.5 rounded-lg px-2 py-1 text-[14px] leading-[1.55] text-ink-2 transition-colors duration-150 placeholder:text-ink/35 hover:bg-raise/25 focus:bg-raise/45"
        />

        <div className="mt-4 rounded-xl bg-raise/45 px-3.5 py-2">
          <Field label="Due">
            <DatePicker
              value={card.dueDate}
              onChange={(dueDate) => patch({ dueDate })}
              placeholder="Add due date"
            />
          </Field>
          <Field label="Priority">
            <div className="inline-flex rounded-lg bg-shade/5 p-0.5" role="radiogroup" aria-label="Priority">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={card.priority === p}
                  onClick={() => patch({ priority: p })}
                  className={cn(
                    "h-6 rounded-md px-2.5 text-[12px] capitalize transition-colors duration-150",
                    card.priority === p ? "bg-raise text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-ink-2/75 hover:text-ink",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Tags">
            <TagEditor tags={card.tags} onChange={(tags) => patch({ tags })} suggestions={tagSuggestions} />
          </Field>
          <Field label="Progress">
            <div className="flex items-center gap-3">
              <ProgressRing value={card.progress} size={20} />
              {card.checklist.length ? (
                <span className="text-[12.5px] text-ink-2/80">{card.progress}% · from the checklist</span>
              ) : (
                <>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={card.progress}
                    aria-label="Progress"
                    onChange={(e) => patch({ progress: Number(e.target.value) })}
                    className="w-40 accent-[var(--ink-button)]"
                  />
                  <span className="w-9 text-[12.5px] text-ink-2/80 tabular-nums">{card.progress}%</span>
                </>
              )}
            </div>
          </Field>
        </div>

        <section className="mt-5">
          <h3 className="mb-2 flex items-center gap-2 text-[13px] font-medium text-ink-2">
            Checklist
            {card.checklist.length > 0 && (
              <span className="text-ink-2/60 tabular-nums">
                {doneCount}/{card.checklist.length}
              </span>
            )}
          </h3>
          <ul className="-mx-2 flex flex-col">
            {card.checklist.map((item) => (
              <li
                key={item.id}
                className="group flex items-center gap-3 rounded-lg py-1.5 pr-1.5 pl-3 transition-colors duration-150 focus-within:bg-raise/45 hover:bg-raise/40"
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  aria-label={`Mark "${item.text}" ${item.done ? "not done" : "done"}`}
                  onChange={() =>
                    patch({
                      checklist: card.checklist.map((k) => (k.id === item.id ? { ...k, done: !k.done } : k)),
                    })
                  }
                  className="check"
                />
                <input
                  value={item.text}
                  aria-label="Checklist item"
                  onChange={(e) =>
                    patch({
                      checklist: card.checklist.map((k) => (k.id === item.id ? { ...k, text: e.target.value } : k)),
                    })
                  }
                  className={cn(
                    "min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none focus-visible:outline-none",
                    item.done && "text-ink-2/55 line-through",
                  )}
                />
                <button
                  type="button"
                  aria-label="Remove item"
                  onClick={() => patch({ checklist: card.checklist.filter((k) => k.id !== item.id) })}
                  className="grid size-6 place-items-center rounded-md text-ink-2/50 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-shade/5 hover:text-ink focus:opacity-100"
                >
                  <RiCloseLine size={14} />
                </button>
              </li>
            ))}
            <li className="flex items-center gap-3 rounded-lg py-1.5 pr-1.5 pl-3 transition-colors duration-150 focus-within:bg-raise/45">
              <span className="grid size-[18px] shrink-0 place-items-center">
                <RiAddLine size={16} className="text-ink-2/50" />
              </span>
              <input
                value={newItem}
                placeholder="Add an item"
                aria-label="New checklist item"
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
                onBlur={addChecklistItem}
                className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-2/45 focus-visible:outline-none"
              />
            </li>
          </ul>
        </section>

        {linked.length > 0 && (
          <section className="mt-5">
            <h3 className="mb-2 text-[13px] font-medium text-ink-2">Linked notebooks</h3>
            <div className="flex flex-wrap gap-1.5">
              {linked.map((n) => (
                <span key={n.id} className="inline-flex items-center rounded-lg bg-raise/60 text-[12.5px] text-ink">
                  <button
                    type="button"
                    onClick={() => openNotebook(n.id, n.folderId)}
                    className="flex items-center gap-1.5 py-1 pr-1 pl-2 hover:underline"
                  >
                    <RiBook2Line size={14} className="text-ink-2/70" />
                    {n.title || "Untitled notebook"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Unlink ${n.title}`}
                    onClick={() => toggleLink(n.id)}
                    className="mr-0.5 grid size-5 place-items-center rounded text-ink-2/50 hover:bg-shade/5 hover:text-ink"
                  >
                    <RiCloseLine size={13} />
                  </button>
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="flex flex-wrap items-center gap-1 rounded-b-[18px] border-t border-shade/5 bg-raise/30 px-3 py-2.5 sm:px-4">
        {card.done ? (
          <PrimaryButton
            onClick={() => {
              restoreCard(card.id);
              close();
            }}
          >
            <RiArrowGoBackLine size={15} /> Restore
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={() => completeCard(card.id)}>
            <RiCheckLine size={15} /> Done
          </PrimaryButton>
        )}

        <Popover
          side="top"
          trigger={({ toggle }) => (
            <GhostButton onClick={toggle}>
              <RiAlarmLine size={15} /> Snooze
            </GhostButton>
          )}
        >
          {(closePop) =>
            (
              [
                ["Tomorrow", 1],
                ["In 3 days", 3],
                ["Next week", 7],
              ] as const
            ).map(([label, days]) => (
              <MenuItem
                key={label}
                onClick={() => {
                  patch({ dueDate: addDaysISO(days) });
                  closePop();
                }}
              >
                <span className="flex-1">{label}</span>
                <span className="text-[11.5px] text-subtle">{dueLabel(addDaysISO(days))}</span>
              </MenuItem>
            ))
          }
        </Popover>

        <Popover
          side="top"
          className="w-[260px]"
          trigger={({ toggle }) => (
            <GhostButton onClick={toggle}>
              <RiLinkM size={15} /> Link
            </GhostButton>
          )}
        >
          {(closePop) => {
            const sorted = [...notebooks].sort(
              (a, b) => Number(b.folderId === card.folderId) - Number(a.folderId === card.folderId),
            );
            return (
              <div className="scroll-soft max-h-[260px] overflow-y-auto">
                <MenuItem
                  icon={<RiAddLine size={15} />}
                  onClick={() => {
                    const id = addNotebook(card.folderId, { title: card.title, color: card.color });
                    patch({ linkedNotebookIds: [...card.linkedNotebookIds, id] });
                    closePop();
                  }}
                >
                  New notebook from this card
                </MenuItem>
                {sorted.length > 0 && <div className="my-1 h-px bg-line" />}
                {sorted.map((n) => (
                  <MenuItem
                    key={n.id}
                    active={card.linkedNotebookIds.includes(n.id)}
                    icon={card.linkedNotebookIds.includes(n.id) ? <RiCheckLine size={14} /> : <RiBook2Line size={14} />}
                    onClick={() => toggleLink(n.id)}
                  >
                    <span className="min-w-0 flex-1 truncate">{n.title || "Untitled notebook"}</span>
                    <span className="max-w-[80px] truncate text-[11px] text-subtle">{folderName(n.folderId)}</span>
                  </MenuItem>
                ))}
              </div>
            );
          }}
        </Popover>

        <Popover
          side="top"
          trigger={({ toggle }) => (
            <GhostButton onClick={toggle} aria-label="Change color">
              <RiPaletteLine size={15} /> <span className="hidden sm:inline">Color</span>
            </GhostButton>
          )}
        >
          {() => (
            <div className="p-1.5">
              <ColorSwatches colors={PASTELS} value={card.color} toCss={pastelBg} onChange={(color) => patch({ color })} />
            </div>
          )}
        </Popover>

        <div className="ml-auto">
          {confirmDelete ? (
            <span className="flex items-center gap-1">
              <button
                type="button"
                autoFocus
                onClick={() => {
                  close();
                  deleteCard(card.id);
                }}
                className="h-8 rounded-lg bg-danger px-3 text-[13px] font-medium text-white hover:opacity-90"
              >
                Delete card
              </button>
              <GhostButton onClick={() => setConfirmDelete(false)}>Cancel</GhostButton>
            </span>
          ) : (
            <IconButton
              aria-label="Delete card"
              title="Delete"
              onClick={() => setConfirmDelete(true)}
              className="text-ink-2/70 hover:bg-shade/5 hover:text-danger"
            >
              <RiDeleteBinLine size={16} />
            </IconButton>
          )}
        </div>
      </footer>
    </Modal>
  );
}
