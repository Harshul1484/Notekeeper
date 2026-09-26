import type { RemixiconComponentType } from "@remixicon/react";
import type { ReactNode } from "react";
import { cn, formatShortcut } from "../../lib/util";

interface Props {
  icon: RemixiconComponentType;
  title: string;
  description: ReactNode;
  /** Buttons, e.g. a PrimaryButton to create the first item. */
  actions?: ReactNode;
  /** Keyboard shortcut offered as an alternative to the action, e.g. "N". */
  shortcut?: string;
  className?: string;
}

/** Centered empty state: icon, title, one-line explanation, and a way forward. */
export function EmptyState({ icon: Icon, title, description, actions, shortcut, className }: Props) {
  return (
    <div className={cn("anim-fade flex flex-1 flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="grid size-14 place-items-center rounded-2xl border border-line bg-chip text-chip-ink">
        <Icon size={24} />
      </div>
      <h3 className="mt-5 font-serif text-[19px] leading-snug font-medium text-ink">{title}</h3>
      <p className="mt-1.5 max-w-[360px] text-[13.5px] leading-relaxed text-muted">{description}</p>
      {actions && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
      {shortcut && (
        <p className="mt-3 text-[12px] text-subtle">
          or press{" "}
          <kbd className="rounded-md border border-line bg-window px-1.5 py-0.5 font-sans text-[11px] text-muted">
            {formatShortcut(shortcut)}
          </kbd>
        </p>
      )}
    </div>
  );
}
