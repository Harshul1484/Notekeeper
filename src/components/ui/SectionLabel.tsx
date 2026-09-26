import type { ReactNode } from "react";

/** A small label followed by a hairline that runs to the edge. */
export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-2 text-[13px] font-medium text-ink-2">{children}</div>
      <div className="h-px min-w-4 flex-1 bg-line" />
      {right}
    </div>
  );
}
