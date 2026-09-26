import * as RadixPopover from "@radix-ui/react-popover";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/util";

interface Props {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "end";
  className?: string;
}

/**
 * A small anchored panel. Rendered in a portal (Radix Popover) so scrolling or
 * clipped containers such as the editor toolbar can't cut it off; it flips or
 * shifts to stay on screen, and closes on outside click or Escape.
 */
export function Popover({ trigger, children, side = "bottom", align = "start", className }: Props) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen}>
      <RadixPopover.Anchor asChild>
        <span ref={anchorRef} className="inline-flex">
          {trigger({ open, toggle })}
        </span>
      </RadixPopover.Anchor>
      <RadixPopover.Portal>
        <RadixPopover.Content
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={12}
          // The trigger toggles itself; don't also treat its click as "outside".
          onInteractOutside={(e) => {
            if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
          }}
          // Keep Escape from also closing a card or notebook behind the popover.
          onEscapeKeyDown={(e) => e.stopPropagation()}
          // Leave focus where the action put it (e.g. back in the editor).
          onCloseAutoFocus={(e) => e.preventDefault()}
          className={cn(
            "anim-rise z-[80] min-w-[180px] rounded-xl border border-line bg-panel p-1.5",
            className,
          )}
          style={{ boxShadow: "var(--shadow-float)" }}
        >
          {children(close)}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
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
