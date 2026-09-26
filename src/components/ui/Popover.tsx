import { useCallback, useRef, useState, type ReactNode } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";
import { cn } from "../../lib/util";

interface Props {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "end";
  className?: string;
}

/** A small anchored panel that closes on outside click or Escape. */
export function Popover({ trigger, children, side = "bottom", align = "start", className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  return (
    <div
      ref={ref}
      className="relative inline-flex"
      data-popover-open={open || undefined}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          close();
        }
      }}
    >
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={cn(
            "anim-rise absolute z-50 min-w-[180px] rounded-xl border border-line bg-panel p-1.5",
            side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5",
            align === "start" ? "left-0" : "right-0",
            className,
          )}
          style={{ boxShadow: "var(--shadow-float)" }}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  children,
  onClick,
  danger,
  active,
  icon,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors duration-150",
        danger ? "text-danger hover:bg-danger/10" : "text-ink-2 hover:bg-hover",
        active && "bg-active text-ink",
      )}
    >
      {icon && <span className="grid w-4 place-items-center text-muted">{icon}</span>}
      {children}
    </button>
  );
}
