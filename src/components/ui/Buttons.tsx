import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/util";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

/** Small bordered button used in toolbars ("+ Add", sort, layout toggles). */
export function PillButton({ className, ...rest }: Props) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 text-[12.5px] font-medium text-ink-2 transition-colors duration-150 hover:border-line-strong hover:bg-window",
        className,
      )}
      {...rest}
    />
  );
}

export function IconButton({ className, ...rest }: Props) {
  return (
    <button
      type="button"
      className={cn(
        "grid size-8 place-items-center rounded-lg text-muted transition-colors duration-150 hover:bg-hover hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent",
        className,
      )}
      {...rest}
    />
  );
}

/** Dark primary action (e.g. "Done"). */
export function PrimaryButton({ className, ...rest }: Props) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink-button px-3 text-[13px] font-medium text-window transition-opacity duration-150 hover:opacity-90",
        className,
      )}
      {...rest}
    />
  );
}

/** Quiet secondary action on a tinted surface. */
export function GhostButton({ className, ...rest }: Props) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 transition-colors duration-150 hover:bg-shade/5",
        className,
      )}
      {...rest}
    />
  );
}
