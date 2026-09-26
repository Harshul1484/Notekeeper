import { RiArtboardLine, RiBook2Line, RiFocus3Line, type RemixiconComponentType } from "@remixicon/react";
import { useUI } from "../../store/ui";
import type { Tab } from "../../types";

const TABS: { id: Tab; label: string; icon: RemixiconComponentType }[] = [
  { id: "focus", label: "Focus", icon: RiFocus3Line },
  { id: "notebooks", label: "Notebooks", icon: RiBook2Line },
  { id: "canvas", label: "Canvas", icon: RiArtboardLine },
];

/** Physical folder-style tabs; the active one merges into the panel below. */
export function FolderTabs() {
  const tab = useUI((s) => s.tab);
  const setTab = useUI((s) => s.setTab);
  return (
    <div role="tablist" aria-label="Folder sections" className="relative flex items-end gap-1">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`tab-${id}`}
          aria-selected={tab === id}
          aria-controls="folder-panel"
          data-active={tab === id}
          className="folder-tab"
          onClick={() => setTab(id)}
        >
          <Icon size={15} />
          {label}
        </button>
      ))}
    </div>
  );
}
