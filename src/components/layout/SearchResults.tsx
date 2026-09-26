import { RiBook2Line, RiStickyNoteLine } from "@remixicon/react";
import { useMemo, type ReactNode } from "react";
import { folderDot, pastelBg } from "../../lib/colors";
import { htmlToText } from "../../lib/util";
import { openCardInContext, openNotebookInContext, revealFolder } from "../../store/actions";
import { useData } from "../../store/data";
import { useUI } from "../../store/ui";

const LIMIT = 6;

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (!count) return null;
  return (
    <section className="mb-3">
      <h3 className="mb-1 px-2 text-[11.5px] font-medium tracking-wide text-subtle uppercase">
        {title} <span className="tabular-nums">· {count}</span>
      </h3>
      <ul className="flex flex-col gap-px">{children}</ul>
    </section>
  );
}

function Row({ onClick, icon, title, meta }: { onClick: () => void; icon: ReactNode; title: string; meta?: string }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 hover:bg-hover"
      >
        <span className="mt-[3px] grid shrink-0 place-items-center">{icon}</span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] text-ink">{title}</span>
          {meta && <span className="block truncate text-[11.5px] text-muted">{meta}</span>}
        </span>
      </button>
    </li>
  );
}

export function SearchResults({ query }: { query: string }) {
  const folders = useData((s) => s.folders);
  const cards = useData((s) => s.cards);
  const notebooks = useData((s) => s.notebooks);
  const ui = useUI.getState();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const has = (...fields: string[]) => fields.some((f) => f.toLowerCase().includes(q));
    return {
      folders: folders.filter((f) => has(f.name, f.description)),
      cards: cards.filter((c) => has(c.title, c.detail, c.tags.join(" "), ...c.checklist.map((k) => k.text))),
      notebooks: notebooks.filter((n) => has(n.title, n.tags.join(" "), htmlToText(n.content))),
    };
  }, [query, folders, cards, notebooks]);

  const folderName = (id: string) => folders.find((f) => f.id === id)?.name ?? "";
  const total = results.folders.length + results.cards.length + results.notebooks.length;

  if (!total) {
    return <p className="px-2 py-6 text-center text-[13px] text-muted">Nothing matches “{query.trim()}”.</p>;
  }

  return (
    <div className="anim-fade pt-1">
      <Group title="Folders" count={results.folders.length}>
        {results.folders.slice(0, LIMIT).map((f) => (
          <Row
            key={f.id}
            title={f.name}
            meta={f.description}
            icon={<span className="size-[9px] rounded-full" style={{ background: folderDot(f.color) }} />}
            onClick={() => {
              revealFolder(f.id);
              ui.openFolder(f.id);
              ui.set({ search: "" });
            }}
          />
        ))}
      </Group>
      <Group title="Cards" count={results.cards.length}>
        {results.cards.slice(0, LIMIT).map((c) => (
          <Row
            key={c.id}
            title={c.title || "Untitled card"}
            meta={`${folderName(c.folderId)}${c.done ? " · Done" : ""}`}
            icon={
              <span className="grid size-4 place-items-center rounded" style={{ background: pastelBg(c.color) }}>
                <RiStickyNoteLine size={11} className="text-ink-2" />
              </span>
            }
            onClick={() => {
              revealFolder(c.folderId);
              ui.openFolder(c.folderId, "focus");
              openCardInContext(c.id);
            }}
          />
        ))}
      </Group>
      <Group title="Notebooks" count={results.notebooks.length}>
        {results.notebooks.slice(0, LIMIT).map((n) => (
          <Row
            key={n.id}
            title={n.title || "Untitled notebook"}
            meta={folderName(n.folderId)}
            icon={
              <span className="grid size-4 place-items-center rounded" style={{ background: pastelBg(n.color) }}>
                <RiBook2Line size={11} className="text-ink-2" />
              </span>
            }
            onClick={() => {
              revealFolder(n.folderId);
              ui.openFolder(n.folderId, "notebooks");
              openNotebookInContext(n.id);
            }}
          />
        ))}
      </Group>
    </div>
  );
}
