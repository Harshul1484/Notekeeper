import {
  RiArrowGoBackLine,
  RiArrowGoForwardLine,
  RiArrowRightUpLine,
  RiCursorLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiFullscreenLine,
  RiImageLine,
  RiLayoutMasonryLine,
  RiStickyNoteLine,
  RiSubtractLine,
  RiAddLine,
  RiText,
  type RemixiconComponentType,
} from "@remixicon/react";
import type { PointerEvent, ReactNode } from "react";
import { pastelBg, PASTELS } from "../../lib/colors";
import { cn } from "../../lib/util";
import type { Pastel } from "../../types";
import { ColorSwatches } from "../ui/ColorSwatches";

export type Tool = "select" | "sticky" | "text" | "section" | "arrow";

/** Keep pointer events on overlays from reaching the canvas. */
const stop = (e: PointerEvent) => e.stopPropagation();

function Floating({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      onPointerDown={stop}
      onDoubleClick={(e) => e.stopPropagation()}
      className={cn("absolute z-20 flex items-center rounded-xl border border-line bg-panel/95 p-1 backdrop-blur", className)}
      style={{ boxShadow: "var(--shadow-float)" }}
    >
      {children}
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  shortcut,
  active,
  disabled,
  onClick,
}: {
  icon: RemixiconComponentType;
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-lg transition-colors duration-150 disabled:opacity-35 disabled:hover:bg-transparent",
        active ? "bg-ink-button text-window" : "text-ink-2 hover:bg-hover hover:text-ink",
      )}
    >
      <Icon size={17} />
    </button>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px bg-line" />;

const TOOLS: { id: Tool; label: string; key: string; icon: RemixiconComponentType }[] = [
  { id: "select", label: "Select", key: "V", icon: RiCursorLine },
  { id: "sticky", label: "Sticky note", key: "S", icon: RiStickyNoteLine },
  { id: "text", label: "Text", key: "T", icon: RiText },
  { id: "section", label: "Section", key: "F", icon: RiLayoutMasonryLine },
  { id: "arrow", label: "Connector", key: "A", icon: RiArrowRightUpLine },
];

export function CanvasToolbar({
  tool,
  onTool,
  onImage,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  tool: Tool;
  onTool: (t: Tool) => void;
  onImage: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  return (
    <Floating className="top-3 left-1/2 -translate-x-1/2">
      {TOOLS.map((t) => (
        <ToolButton
          key={t.id}
          icon={t.icon}
          label={t.label}
          shortcut={t.key}
          active={tool === t.id}
          onClick={() => onTool(t.id)}
        />
      ))}
      <ToolButton icon={RiImageLine} label="Image" onClick={onImage} />
      <Divider />
      <ToolButton icon={RiArrowGoBackLine} label="Undo" shortcut="Ctrl+Z" disabled={!canUndo} onClick={onUndo} />
      <ToolButton icon={RiArrowGoForwardLine} label="Redo" shortcut="Ctrl+Shift+Z" disabled={!canRedo} onClick={onRedo} />
    </Floating>
  );
}

export function SelectionBar({
  count,
  color,
  onColor,
  onDuplicate,
  onDelete,
}: {
  count: number;
  color?: Pastel;
  onColor?: (c: Pastel) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <Floating className="anim-rise top-[60px] left-1/2 -translate-x-1/2 gap-1 pl-3">
      <span className="mr-1 text-[12px] text-muted tabular-nums">{count} selected</span>
      {onColor && (
        <>
          <Divider />
          <div className="px-1">
            <ColorSwatches colors={PASTELS} value={color} toCss={pastelBg} onChange={onColor} size={18} />
          </div>
        </>
      )}
      <Divider />
      <ToolButton icon={RiFileCopyLine} label="Duplicate" shortcut="Ctrl+D" onClick={onDuplicate} />
      <ToolButton icon={RiDeleteBinLine} label="Delete" shortcut="Backspace" onClick={onDelete} />
    </Floating>
  );
}

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFit: () => void;
}) {
  return (
    <Floating className="right-3 bottom-3">
      <ToolButton icon={RiSubtractLine} label="Zoom out" onClick={onZoomOut} />
      <button
        type="button"
        onClick={onReset}
        title="Reset to 100%"
        className="h-8 w-12 rounded-lg text-[12px] text-ink-2 tabular-nums hover:bg-hover hover:text-ink"
      >
        {Math.round(zoom * 100)}%
      </button>
      <ToolButton icon={RiAddLine} label="Zoom in" onClick={onZoomIn} />
      <Divider />
      <ToolButton icon={RiFullscreenLine} label="Fit to screen" shortcut="Shift+1" onClick={onFit} />
    </Floating>
  );
}
