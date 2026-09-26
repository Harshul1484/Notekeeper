import type { CanvasItem } from "../../types";
import { center, curvePath, edgePoint, type Pt } from "./geometry";

interface Props {
  arrows: CanvasItem[];
  byId: Map<string, CanvasItem>;
  selected: Set<string>;
  zoom: number;
  preview: { fromId: string; to: Pt } | null;
}

const INK = "var(--arrow)";
const SELECT = "var(--select)";

/** Connectors are derived from the items they join, so they follow when items move. */
export function ArrowLayer({ arrows, byId, selected, zoom, preview }: Props) {
  const stroke = 1.75;
  const previewFrom = preview && byId.get(preview.fromId);

  return (
    <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width={1} height={1} aria-hidden>
      <defs>
        {(["ink", "sel"] as const).map((k) => (
          <marker
            key={k}
            id={`arrowhead-${k}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="11"
            markerHeight="11"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path
              d="M 1.5 1.5 L 8.5 5 L 1.5 8.5"
              fill="none"
              stroke={k === "ink" ? INK : SELECT}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        ))}
      </defs>

      {arrows.map((a) => {
        const from = a.fromId && byId.get(a.fromId);
        const to = a.toId && byId.get(a.toId);
        if (!from || !to) return null;
        const p1 = edgePoint(from, center(to));
        const p2 = edgePoint(to, center(from));
        const d = curvePath(p1, p2);
        const isSel = selected.has(a.id);
        return (
          <g key={a.id} data-item-id={a.id}>
            <path d={d} fill="none" stroke="transparent" strokeWidth={16 / zoom} style={{ pointerEvents: "stroke", cursor: "pointer" }} />
            <path
              d={d}
              fill="none"
              stroke={isSel ? SELECT : INK}
              strokeWidth={isSel ? stroke + 0.75 : stroke}
              strokeLinecap="round"
              markerEnd={`url(#arrowhead-${isSel ? "sel" : "ink"})`}
            />
          </g>
        );
      })}

      {previewFrom && preview && (
        <path
          d={curvePath(edgePoint(previewFrom, preview.to), preview.to)}
          fill="none"
          stroke={SELECT}
          strokeWidth={stroke}
          strokeDasharray="6 5"
          strokeLinecap="round"
          markerEnd="url(#arrowhead-sel)"
        />
      )}
    </svg>
  );
}
