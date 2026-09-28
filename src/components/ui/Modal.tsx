import * as Dialog from "@radix-ui/react-dialog";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../lib/util";

interface Props {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  label: string;
}

/**
 * A centered window (Radix Dialog): traps focus, returns it on close, and
 * closes on Escape or a click outside. Popovers and tooltips opened from
 * inside stay usable because they belong to the same React tree.
 */
export function Modal({ onClose, children, className, style, label }: Props) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="anim-fade fixed inset-0 z-[60] bg-(--overlay) backdrop-blur-[2px]" />
        <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center p-3 sm:p-6">
          <Dialog.Content
            aria-describedby={undefined}
            // Keep Escape from also reaching the app's own shortcuts (e.g. closing a notebook).
            onEscapeKeyDown={(e) => e.stopPropagation()}
            // Focus a field that asked for it (autoFocus); otherwise the window itself,
            // so no button tooltip pops up on open.
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              const content = e.currentTarget as HTMLElement;
              if (!content.contains(document.activeElement)) content.focus();
            }}
            className={cn(
              "anim-pop pointer-events-auto relative flex max-h-[88dvh] w-full flex-col outline-none",
              className,
            )}
            style={{ boxShadow: "var(--shadow-modal)", ...style }}
          >
            <Dialog.Title className="sr-only">{label}</Dialog.Title>
            {children}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
