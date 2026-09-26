import { memo, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { pastelBg, pastelEdge, pastelWash } from "../../lib/colors";
import { cn } from "../../lib/util";
import type { CanvasItem } from "../../types";

interface Props {
  item: CanvasItem;
  selected: boolean;
  showHandle: boolean;
  editing: boolean;
  zoom: number;
  onCommitEdit: (id: string, content: string) => void;
}

/** Textarea used for in-place editing; commits on blur, Escape leaves. */
function InlineEditor({
  initial,
  className,
  placeholder,
  onDone,
  singleLine,
}: {
  initial: string;
  className: string;
  placeholder: string;
  onDone: (value: string) => void;
  singleLine?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" || (singleLine && e.key === "Enter")) {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.blur();
    }
  };
  return (
    <textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      aria-label="Edit text"
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onDone(value)}
      onKeyDown={onKeyDown}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn("block h-full w-full resize-none bg-transparent outline-none placeholder:text-ink/35", className)}
    />
  );
}

function CanvasItemViewImpl({ item, selected, showHandle, editing, zoom, onCommitEdit }: Props) {
  const done = (value: string) => onCommitEdit(item.id, value);
  const outline = 2 / zoom;

  let body;
  switch (item.type) {
    case "sticky":
      body = (
        <div
          className="h-full w-full overflow-hidden rounded-[6px] border p-3.5"
          style={{
            background: pastelBg(item.color),
            borderColor: pastelEdge(item.color),
            boxShadow: "var(--shadow-sticky)",
          }}
        >
          {editing ? (
            <InlineEditor
              initial={item.content}
              onDone={done}
              placeholder="Write something…"
              className="font-serif text-[16px] leading-[1.35] font-medium text-ink"
            />
          ) : (
            <p
              className={cn(
                "font-serif text-[16px] leading-[1.35] font-medium break-words whitespace-pre-wrap text-ink",
                !item.content && "text-ink/35",
              )}
            >
              {item.content || "Double-click to write"}
            </p>
          )}
        </div>
      );
      break;
    case "text":
      body = editing ? (
        <InlineEditor
          initial={item.content}
          onDone={done}
          placeholder="Type something…"
          className="font-serif text-[26px] leading-[1.2] font-medium tracking-[-0.01em] text-ink"
        />
      ) : (
        <p
          className={cn(
            "font-serif text-[26px] leading-[1.2] font-medium tracking-[-0.01em] break-words whitespace-pre-wrap text-ink",
            !item.content && "text-ink/35",
          )}
        >
          {item.content || "Text"}
        </p>
      );
      break;
    case "section":
      body = (
        <div
          className="h-full w-full rounded-[18px] border-[1.5px]"
          style={{ background: pastelWash(item.color), borderColor: pastelEdge(item.color) }}
        >
          <div className="px-4 pt-3" style={{ height: 44 }}>
            {editing ? (
              <InlineEditor
                singleLine
                initial={item.content}
                onDone={done}
                placeholder="Section name"
                className="font-serif text-[17px] leading-[1.4] font-semibold text-ink"
              />
            ) : (
              <p className={cn("truncate font-serif text-[17px] font-semibold text-ink", !item.content && "text-ink/40")}>
                {item.content || "Untitled section"}
              </p>
            )}
          </div>
        </div>
      );
      break;
    case "image":
      body = (
        <img
          src={item.content}
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full rounded-[10px] border border-line object-cover select-none"
          style={{ boxShadow: "var(--shadow-sticky)" }}
        />
      );
      break;
    default:
      return null;
  }

  return (
    <div
      data-item-id={item.id}
      className={cn("absolute", !editing && "cursor-default select-none")}
      style={{
        left: item.x,
        top: item.y,
        width: item.w,
        height: item.h,
        transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
      }}
    >
      {body}
      {selected && (
        <div
          className="pointer-events-none absolute border-select"
          style={{
            inset: -4 / zoom,
            borderWidth: outline,
            borderRadius: item.type === "section" ? 20 : item.type === "sticky" ? 8 : 6,
          }}
        />
      )}
      {showHandle && (
        <div
          data-handle="resize"
          aria-hidden
          className="absolute cursor-nwse-resize rounded-[3px] border-select bg-panel"
          style={{
            width: 10 / zoom,
            height: 10 / zoom,
            right: -9 / zoom,
            bottom: -9 / zoom,
            borderWidth: 1.5 / zoom,
          }}
        />
      )}
    </div>
  );
}

export const CanvasItemView = memo(CanvasItemViewImpl);
