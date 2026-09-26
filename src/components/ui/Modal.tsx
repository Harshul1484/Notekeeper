import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/util";

interface Props {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  label: string;
}

export function Modal({ onClose, children, className, style, label }: Props) {
  return createPortal(
    <div
      className="anim-fade fixed inset-0 z-[60] grid place-items-center bg-(--overlay) p-3 backdrop-blur-[2px] sm:p-6"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn("anim-pop relative flex max-h-[88dvh] w-full flex-col", className)}
        style={{ boxShadow: "var(--shadow-modal)", ...style }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
