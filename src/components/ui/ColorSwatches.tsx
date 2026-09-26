import { RiCheckLine } from "@remixicon/react";

interface Props<T extends string> {
  colors: readonly T[];
  value?: T;
  onChange: (c: T) => void;
  toCss: (c: T) => string;
  size?: number;
}

export function ColorSwatches<T extends string>({ colors, value, onChange, toCss, size = 22 }: Props<T>) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          title={c}
          aria-label={c}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className="grid place-items-center rounded-full transition-transform duration-150 hover:scale-110"
          style={{ width: size, height: size, background: toCss(c) }}
        >
          {value === c && <RiCheckLine size={Math.round(size * 0.6)} className="text-ink/70" />}
        </button>
      ))}
    </div>
  );
}
