import { RiCloseLine } from "@remixicon/react";
import { useId, useState } from "react";
import { cn } from "../../lib/util";

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  className?: string;
}

const normalize = (t: string) => t.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-");

export function TagEditor({ tags, onChange, suggestions = [], className }: Props) {
  const [draft, setDraft] = useState("");
  const listId = useId();
  const add = (raw: string) => {
    const t = normalize(raw);
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setDraft("");
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-chip py-0.5 pr-1 pl-2.5 text-[12.5px] text-chip-ink"
        >
          {t}
          <button
            type="button"
            aria-label={`Remove tag ${t}`}
            onClick={() => onChange(tags.filter((x) => x !== t))}
            className="grid size-4 place-items-center rounded-full text-chip-ink/60 hover:bg-shade/5 hover:text-chip-ink"
          >
            <RiCloseLine size={12} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        list={listId}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => draft && add(draft)}
        placeholder={tags.length ? "Add tag" : "Add tags…"}
        className="min-w-[80px] flex-1 bg-transparent py-0.5 text-[12.5px] text-ink-2 outline-none placeholder:text-subtle focus-visible:outline-none"
      />
      <datalist id={listId}>
        {suggestions
          .filter((s) => !tags.includes(s))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  );
}
