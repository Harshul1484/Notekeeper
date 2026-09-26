import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/util";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string };

/**
 * A borderless textarea that grows with its content. Callers show focus with a
 * background tint (not an outline, which scroll containers would clip).
 */
export function AutoTextarea({ className, value, ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      className={cn(
        "block w-full resize-none overflow-hidden bg-transparent outline-none focus-visible:outline-none",
        className,
      )}
      {...rest}
    />
  );
}
