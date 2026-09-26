import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactElement, ReactNode } from "react";
import { formatShortcut } from "../../lib/util";

/** Wrap the app once; sets a shared delay so moving between buttons feels instant. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={400} skipDelayDuration={300}>
      {children}
    </RadixTooltip.Provider>
  );
}

interface Props {
  label: ReactNode;
  /** e.g. "Mod+Shift+Z"; "Mod" shows as ⌘ on Mac and Ctrl elsewhere. */
  shortcut?: string;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactElement;
}

/** Styled tooltip (Radix) for any single focusable/hoverable element. */
export function Tooltip({ label, shortcut, side = "top", children }: Props) {
  if (!label) return children;
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="anim-fade z-[90] flex max-w-[280px] items-center gap-2 rounded-md bg-(--tooltip-bg) px-2 py-1 text-[12px] leading-snug text-(--tooltip-text) select-none"
          style={{ boxShadow: "var(--shadow-float)" }}
        >
          <span>{label}</span>
          {shortcut && (
            <kbd className="font-sans text-[11px] tracking-wide opacity-60">{formatShortcut(shortcut)}</kbd>
          )}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
