import * as Popover from "@radix-ui/react-popover";
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowUpSLine,
  RiCalendarLine,
} from "@remixicon/react";
import { useState } from "react";
import { DayPicker, type ChevronProps } from "react-day-picker";
import { addDaysISO, dueLabel, fromISODate, toISODate } from "../../lib/date";
import { cn } from "../../lib/util";

interface Props {
  /** YYYY-MM-DD */
  value?: string;
  onChange: (iso: string | undefined) => void;
  placeholder?: string;
}

const PRESETS: [string, number][] = [
  ["Today", 0],
  ["Tomorrow", 1],
  ["Next week", 7],
];

const CHEVRONS = {
  left: RiArrowLeftSLine,
  right: RiArrowRightSLine,
  up: RiArrowUpSLine,
  down: RiArrowDownSLine,
};

function Chevron({ orientation = "left", className }: ChevronProps) {
  const Icon = CHEVRONS[orientation];
  return <Icon size={18} className={className} />;
}

const shortDate = (iso: string) =>
  fromISODate(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Calendar in a popover, styled to match the app (react-day-picker + Radix Popover). */
export function DatePicker({ value, onChange, placeholder = "Add a date" }: Props) {
  const [open, setOpen] = useState(false);
  const selected = value ? fromISODate(value) : undefined;
  const pick = (iso: string | undefined) => {
    onChange(iso);
    setOpen(false);
  };

  const label = value ? dueLabel(value) : null;
  const full = value ? shortDate(value) : null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={value ? `Due ${label}, change date` : placeholder}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-shade/10 bg-raise/70 px-2.5 text-[12.5px] text-ink transition-colors duration-150 hover:bg-raise data-[state=open]:border-shade/20 data-[state=open]:bg-raise"
        >
          <RiCalendarLine size={14} className="text-ink-2/70" />
          {value ? (
            <>
              {label}
              {label !== full && <span className="text-ink-2/60">· {full}</span>}
            </>
          ) : (
            <span className="text-ink-2/60">{placeholder}</span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          // Keep Escape from also closing the card behind the picker.
          onEscapeKeyDown={(e) => e.stopPropagation()}
          className="anim-rise z-[80] w-[284px] rounded-xl border border-line bg-panel p-3"
          style={{ boxShadow: "var(--shadow-float)" }}
        >
          <div className="mb-2 flex flex-wrap gap-1">
            {PRESETS.map(([name, days]) => {
              const iso = addDaysISO(days);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => pick(iso)}
                  className={cn(
                    "h-7 rounded-full px-2.5 text-[12px] transition-colors duration-150",
                    value === iso ? "bg-ink-button text-window" : "bg-chip text-chip-ink hover:bg-active",
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>

          <DayPicker
            mode="single"
            required
            selected={selected}
            defaultMonth={selected}
            onSelect={(d) => pick(toISODate(d))}
            showOutsideDays
            components={{ Chevron }}
            classNames={{
              root: "relative",
              months: "relative",
              month_caption: "flex h-8 items-center px-1 font-serif text-[15px] font-semibold text-ink",
              nav: "absolute top-0 right-0 z-10 flex items-center gap-0.5",
              button_previous:
                "grid size-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-hover hover:text-ink disabled:opacity-30",
              button_next:
                "grid size-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-hover hover:text-ink disabled:opacity-30",
              month_grid: "mt-1.5 w-full border-collapse",
              weekday: "h-8 text-[11.5px] font-medium text-subtle",
              day: "p-[1px] text-center",
              day_button:
                "mx-auto grid size-[34px] place-items-center rounded-lg text-[13px] text-ink tabular-nums transition-colors duration-150 hover:bg-hover",
              today: "[&>button]:font-semibold [&>button]:text-[var(--select)]",
              selected:
                "[&>button]:!bg-ink-button [&>button]:!text-window [&>button]:font-semibold",
              outside: "[&>button]:text-subtle/70",
              disabled: "[&>button]:opacity-30",
            }}
          />

          {value && (
            <div className="mt-2 flex justify-end border-t border-line pt-2">
              <button
                type="button"
                onClick={() => pick(undefined)}
                className="h-7 rounded-lg px-2.5 text-[12.5px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
              >
                Clear date
              </button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
