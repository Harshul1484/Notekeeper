import { useMemo } from "react";
import { cn } from "../../lib/util";
import { useData } from "../../store/data";
import { quickViewItems } from "../../store/selectors";
import { useUI } from "../../store/ui";
import type { QuickView } from "../../types";
import { FocusCardTile } from "../focus/FocusCardTile";
import { CARD_GRID } from "../focus/FocusTab";
import { NotebookTile } from "../notebooks/NotebookTile";
import { SectionLabel } from "../ui/SectionLabel";

const COPY: Record<QuickView, { title: string; description: string; empty: string }> = {
  today: {
    title: "Today",
    description: "Cards due today, plus anything that slipped past its date.",
    empty: "Nothing due today. Enjoy the quiet.",
  },
  recent: {
    title: "Recent",
    description: "Everything you've touched in the last seven days, newest first.",
    empty: "Nothing edited this week yet.",
  },
  pinned: {
    title: "Pinned",
    description: "Cards and notebooks you've pinned to keep close at hand.",
    empty: "Pin a card or notebook to keep it here.",
  },
};

export function QuickViewPage({ kind }: { kind: QuickView }) {
  const cards = useData((s) => s.cards);
  const notebooks = useData((s) => s.notebooks);
  const folders = useData((s) => s.folders);
  const fading = useUI((s) => s.fading);
  const set = useUI((s) => s.set);
  const items = useMemo(() => quickViewItems(kind, cards, notebooks), [kind, cards, notebooks]);
  const folderName = (id: string) => folders.find((f) => f.id === id)?.name ?? "";
  const copy = COPY[kind];
  const empty = !items.cards.length && !items.notebooks.length;

  return (
    <div className="flex min-h-full flex-col px-4 pt-6 pb-4 sm:px-6 md:px-10 md:pt-9 md:pb-8">
      <header className="max-w-[760px]">
        <h1 className="font-serif text-[32px] leading-tight font-medium tracking-[-0.01em] md:text-[40px]">
          {copy.title}
        </h1>
        <p className="mt-2 text-[15px] leading-[1.6] text-muted">{copy.description}</p>
      </header>

      <section
        key={kind}
        className="anim-rise mt-7 flex flex-1 flex-col gap-6 rounded-[14px] border border-line bg-panel p-4 sm:p-5 md:p-6"
      >
        {empty && (
          <div className="grid flex-1 place-items-center py-16 text-center font-serif text-[17px] text-ink-2">
            {copy.empty}
          </div>
        )}
        {items.cards.length > 0 && (
          <div>
            <SectionLabel>
              Cards <span className="text-muted tabular-nums">({items.cards.length})</span>
            </SectionLabel>
            <div className={cn(CARD_GRID, "mt-4")}>
              {items.cards.map((c) => (
                <FocusCardTile
                  key={c.id}
                  card={c}
                  folderName={folderName(c.folderId)}
                  fading={!!fading[c.id]}
                  onOpen={() => set({ openCardId: c.id })}
                />
              ))}
            </div>
          </div>
        )}
        {items.notebooks.length > 0 && (
          <div>
            <SectionLabel>
              Notebooks <span className="text-muted tabular-nums">({items.notebooks.length})</span>
            </SectionLabel>
            <div className={cn(CARD_GRID, "mt-4")}>
              {items.notebooks.map((n) => (
                <NotebookTile
                  key={n.id}
                  notebook={n}
                  folderName={folderName(n.folderId)}
                  onOpen={() => set({ openNotebookId: n.id })}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
