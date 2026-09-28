import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { RiArtboardLine, RiImageLine, RiStickyNoteLine } from "@remixicon/react";
import { NEW_STICKY_EVENT } from "../../hooks/useGlobalHotkeys";
import { imageFiles, imageSize, readImage } from "../../lib/images";
import { clamp, isTypingTarget, uid } from "../../lib/util";
import { useData } from "../../store/data";
import { useUI, type Viewport } from "../../store/ui";
import type { CanvasItem, Folder, Pastel } from "../../types";
import { GhostButton, PrimaryButton } from "../ui/Buttons";
import { EmptyState } from "../ui/EmptyState";
import { ArrowLayer } from "./ArrowLayer";
import { CanvasItemView } from "./CanvasItemView";
import { CanvasToolbar, SelectionBar, ZoomControls, type Tool } from "./CanvasControls";
import {
  boundingBox,
  center,
  contains,
  containsPoint,
  intersects,
  MAX_ZOOM,
  MIN_SIZE,
  MIN_ZOOM,
  normRect,
  type Pt,
  type Rect,
} from "./geometry";
import { canRedo, canUndo, commit, redo, subscribeHistory, undo } from "./history";

type Interaction =
  | { kind: "pan"; startX: number; startY: number; orig: Viewport }
  | { kind: "pinch"; dist: number; mid: Pt; orig: Viewport }
  | { kind: "move"; ids: string[]; startX: number; startY: number; moved: boolean }
  | { kind: "resize"; id: string; startX: number; startY: number; w: number; h: number }
  | { kind: "marquee"; start: Pt; base: string[] }
  | { kind: "arrow"; fromId: string };

const TOOL_KEYS: Record<string, Tool> = { v: "select", s: "sticky", t: "text", f: "section", a: "arrow" };
const randomTilt = () => Math.round((Math.random() * 4 - 2) * 10) / 10;

export function CanvasTab({ folder }: { folder: Folder }) {
  const folderId = folder.id;
  const allItems = useData((s) => s.canvasItems);
  const items = useMemo(() => allItems.filter((i) => i.folderId === folderId), [allItems, folderId]);
  const storedViewport = useUI.getState().viewports[folderId];
  const setViewportStore = useUI((s) => s.setViewport);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [vp, setVp] = useState<Viewport>(storedViewport ?? { x: 80, y: 120, zoom: 1 });
  const vpRef = useRef(vp);
  vpRef.current = vp;

  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stickyColor, setStickyColor] = useState<Pastel>("butter");
  const [spaceDown, setSpaceDown] = useState(false);
  const [panning, setPanning] = useState(false);
  const [fileDragOver, setFileDragOver] = useState(false);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<number | null>(null);
  const showNotice = (msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 4500);
  };

  // Transient state while a gesture is in progress (committed on pointer up).
  const [drag, setDrag] = useState<{ ids: Set<string>; dx: number; dy: number } | null>(null);
  const [resize, setResize] = useState<{ id: string; w: number; h: number } | null>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [arrowPreview, setArrowPreview] = useState<{ fromId: string; to: Pt } | null>(null);
  const interaction = useRef<Interaction | null>(null);
  const touches = useRef(new Map<number, Pt>());

  const history = useSyncExternalStore(subscribeHistory, () => `${canUndo(folderId)}:${canRedo(folderId)}`);
  const [undoable, redoable] = history.split(":").map((v) => v === "true");

  // Items with any in-progress drag/resize applied — what we actually render.
  const view = useMemo(() => {
    if (!drag && !resize) return items;
    return items.map((i) => {
      if (drag?.ids.has(i.id)) return { ...i, x: i.x + drag.dx, y: i.y + drag.dy };
      if (resize?.id === i.id) return { ...i, w: resize.w, h: resize.h };
      return i;
    });
  }, [items, drag, resize]);

  const byId = useMemo(() => new Map(view.map((i) => [i.id, i])), [view]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const sections = view.filter((i) => i.type === "section");
  const arrows = view.filter((i) => i.type === "arrow");
  const others = view.filter((i) => i.type !== "section" && i.type !== "arrow");

  // ---------- viewport ----------
  const containerRect = () => containerRef.current!.getBoundingClientRect();

  const toWorld = useCallback((clientX: number, clientY: number): Pt => {
    const r = containerRef.current!.getBoundingClientRect();
    const v = vpRef.current;
    return { x: (clientX - r.left - v.x) / v.zoom, y: (clientY - r.top - v.y) / v.zoom };
  }, []);

  /** Zoom keeping the screen point (sx, sy — container-relative) fixed. */
  const zoomAt = useCallback((sx: number, sy: number, nextZoom: number) => {
    setVp((v) => {
      const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      const wx = (sx - v.x) / v.zoom;
      const wy = (sy - v.y) / v.zoom;
      return { zoom, x: sx - wx * zoom, y: sy - wy * zoom };
    });
  }, []);

  const zoomCentered = (factor: number) => {
    const r = containerRect();
    zoomAt(r.width / 2, r.height / 2, vpRef.current.zoom * factor);
  };

  const fit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const box = boundingBox(useData.getState().canvasItems.filter((i) => i.folderId === folderId));
    if (!box) return setVp({ x: width / 2 - 200, y: height / 2 - 150, zoom: 1 });
    const pad = 96;
    const zoom = clamp(Math.min((width - pad * 2) / box.w, (height - pad * 2) / box.h), MIN_ZOOM, 1.4);
    setVp({ zoom, x: width / 2 - (box.x + box.w / 2) * zoom, y: height / 2 - (box.y + box.h / 2) * zoom + 16 });
  }, [folderId]);

  useLayoutEffect(() => {
    if (!storedViewport) fit();
    // Only on first mount for this folder.
  }, []);

  // Persist the viewport, lightly debounced.
  useEffect(() => {
    const t = window.setTimeout(() => setViewportStore(folderId, vp), 250);
    return () => window.clearTimeout(t);
  }, [vp, folderId, setViewportStore]);

  // Wheel: ctrl/cmd (and trackpad pinch) zooms, otherwise pans.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest("textarea")) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect();
        const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0022));
        zoomAt(e.clientX - r.left, e.clientY - r.top, vpRef.current.zoom * factor);
      } else {
        setVp((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // ---------- mutations ----------
  const addItem = useCallback(
    (partial: Omit<CanvasItem, "id" | "folderId" | "rotation" | "content" | "color"> & Partial<CanvasItem>, edit = false) => {
      const item: CanvasItem = { id: uid(), folderId, rotation: 0, content: "", color: stickyColor, ...partial };
      commit(folderId, [...useData.getState().canvasItems.filter((i) => i.folderId === folderId), item]);
      setSelected([item.id]);
      if (edit) setEditingId(item.id);
      return item;
    },
    [folderId, stickyColor],
  );

  const viewportCenter = (): Pt => {
    const r = containerRect();
    return toWorld(r.left + r.width / 2, r.top + r.height / 2);
  };

  const createSticky = useCallback(
    (at: Pt) => addItem({ type: "sticky", x: at.x - 90, y: at.y - 90, w: 180, h: 180, rotation: randomTilt() }, true),
    [addItem],
  );

  const deleteSelected = () => {
    if (!selected.length) return;
    const del = new Set(selected);
    commit(
      folderId,
      items.filter((i) => !del.has(i.id) && !(i.type === "arrow" && (del.has(i.fromId!) || del.has(i.toId!)))),
    );
    setSelected([]);
  };

  const duplicateSelected = () => {
    const src = items.filter((i) => selectedSet.has(i.id) && i.type !== "arrow");
    if (!src.length) return;
    const copies = src.map((i) => ({ ...i, id: uid(), x: i.x + 28, y: i.y + 28 }));
    commit(folderId, [...items, ...copies]);
    setSelected(copies.map((c) => c.id));
  };

  const recolorSelected = (color: Pastel) => {
    setStickyColor(color);
    commit(
      folderId,
      items.map((i) => (selectedSet.has(i.id) && i.type !== "arrow" ? { ...i, color } : i)),
    );
  };

  const commitEdit = useCallback(
    (id: string, content: string) => {
      setEditingId(null);
      const cur = useData.getState().canvasItems.filter((i) => i.folderId === folderId);
      const item = cur.find((i) => i.id === id);
      if (!item || item.content === content) return;
      commit(folderId, cur.map((i) => (i.id === id ? { ...i, content } : i)));
    },
    [folderId],
  );

  /** Adds image files centered on `at` (default: middle of the view), fanned out slightly. */
  const insertImages = async (files: File[], at?: Pt) => {
    const center = at ?? viewportCenter();
    const added: CanvasItem[] = [];
    for (const file of files) {
      try {
        const src = await readImage(file);
        const size = await imageSize(src);
        const w = Math.min(320, size.w);
        const h = Math.round(w * (size.h / size.w));
        const offset = added.length * 28;
        added.push({
          id: uid(),
          folderId,
          type: "image",
          x: center.x - w / 2 + offset,
          y: center.y - h / 2 + offset,
          w,
          h,
          rotation: 0,
          color: stickyColor,
          content: src,
        });
      } catch (err) {
        showNotice((err as Error).message);
      }
    }
    if (!added.length) return;
    commit(folderId, [...useData.getState().canvasItems.filter((i) => i.folderId === folderId), ...added]);
    setSelected(added.map((i) => i.id));
    setTool("select");
  };
  const insertImagesRef = useRef(insertImages);
  insertImagesRef.current = insertImages;

  const onDragOver = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!fileDragOver) setFileDragOver(true);
  };

  const onDrop = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setFileDragOver(false);
    const files = imageFiles(e.dataTransfer.files);
    if (!files.length) return showNotice("Only images can be dropped on the canvas.");
    void insertImages(files, toWorld(e.clientX, e.clientY));
  };

  /** Non-section items whose center sits inside a section travel with it. */
  const withSectionChildren = (ids: string[]) => {
    const out = new Set(ids);
    for (const id of ids) {
      const s = byId.get(id);
      if (s?.type !== "section") continue;
      for (const i of items) {
        if (i.type !== "section" && i.type !== "arrow" && containsPoint(s, center(i))) out.add(i.id);
      }
    }
    return [...out];
  };

  // ---------- pointer handling ----------
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = containerRef.current!;
    if (e.pointerType === "touch") {
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.current.size === 2) {
        const [a, b] = [...touches.current.values()];
        const r = el.getBoundingClientRect();
        interaction.current = {
          kind: "pinch",
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          mid: { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top },
          orig: vpRef.current,
        };
        setDrag(null);
        setMarquee(null);
        return;
      }
    }

    const target = e.target as Element;
    const itemEl = target.closest("[data-item-id]");
    const id = itemEl?.getAttribute("data-item-id") ?? null;
    const item = id ? byId.get(id) : undefined;
    if (editingId && id === editingId) return;
    if (editingId) (document.activeElement as HTMLElement | null)?.blur();

    const startPan = () => {
      interaction.current = { kind: "pan", startX: e.clientX, startY: e.clientY, orig: vpRef.current };
      setPanning(true);
      el.setPointerCapture(e.pointerId);
    };

    if (e.button === 1 || (e.button === 0 && spaceDown) || (e.pointerType === "touch" && !item && tool === "select")) {
      e.preventDefault();
      return startPan();
    }
    if (e.button !== 0) return;
    const pt = toWorld(e.clientX, e.clientY);

    if (tool === "sticky") {
      createSticky(pt);
      return setTool("select");
    }
    if (tool === "text") {
      addItem({ type: "text", x: pt.x, y: pt.y - 18, w: 280, h: 44, color: "sand" }, true);
      return setTool("select");
    }
    if (tool === "section") {
      addItem({ type: "section", x: pt.x, y: pt.y, w: 420, h: 320, color: stickyColor, content: "New section" }, true);
      return setTool("select");
    }
    if (tool === "arrow") {
      if (item && item.type !== "arrow") {
        interaction.current = { kind: "arrow", fromId: item.id };
        setArrowPreview({ fromId: item.id, to: pt });
        el.setPointerCapture(e.pointerId);
      }
      return;
    }

    // Select tool
    if (item && target.closest("[data-handle]")) {
      interaction.current = { kind: "resize", id: item.id, startX: e.clientX, startY: e.clientY, w: item.w, h: item.h };
      el.setPointerCapture(e.pointerId);
      return;
    }
    if (item) {
      if (e.shiftKey) {
        setSelected((s) => (s.includes(item.id) ? s.filter((x) => x !== item.id) : [...s, item.id]));
        return;
      }
      const ids = selectedSet.has(item.id) ? selected : [item.id];
      if (!selectedSet.has(item.id)) setSelected([item.id]);
      if (item.type === "arrow") return;
      interaction.current = {
        kind: "move",
        ids: withSectionChildren(ids.filter((i) => byId.get(i)?.type !== "arrow")),
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      };
      el.setPointerCapture(e.pointerId);
      return;
    }

    interaction.current = { kind: "marquee", start: pt, base: e.shiftKey ? selected : [] };
    if (!e.shiftKey) setSelected([]);
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" && touches.current.has(e.pointerId)) {
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    const it = interaction.current;
    if (!it) return;
    const zoom = vpRef.current.zoom;

    switch (it.kind) {
      case "pan":
        setVp({ ...it.orig, x: it.orig.x + e.clientX - it.startX, y: it.orig.y + e.clientY - it.startY });
        break;
      case "pinch": {
        if (touches.current.size < 2) break;
        const [a, b] = [...touches.current.values()];
        const r = containerRect();
        const mid = { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top };
        const nextZoom = clamp(it.orig.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / it.dist), MIN_ZOOM, MAX_ZOOM);
        const wx = (it.mid.x - it.orig.x) / it.orig.zoom;
        const wy = (it.mid.y - it.orig.y) / it.orig.zoom;
        setVp({ zoom: nextZoom, x: mid.x - wx * nextZoom, y: mid.y - wy * nextZoom });
        break;
      }
      case "move": {
        const sx = e.clientX - it.startX;
        const sy = e.clientY - it.startY;
        if (!it.moved && Math.hypot(sx, sy) < 3) return;
        it.moved = true;
        setDrag({ ids: new Set(it.ids), dx: sx / zoom, dy: sy / zoom });
        break;
      }
      case "resize": {
        const item = byId.get(it.id);
        if (!item) return;
        const min = MIN_SIZE[item.type];
        setResize({
          id: it.id,
          w: Math.max(min.w, it.w + (e.clientX - it.startX) / zoom),
          h: Math.max(min.h, it.h + (e.clientY - it.startY) / zoom),
        });
        break;
      }
      case "marquee": {
        const rect = normRect(it.start, toWorld(e.clientX, e.clientY));
        setMarquee(rect);
        const hit = items
          .filter((i) => i.type !== "arrow" && (i.type === "section" ? contains(rect, i) : intersects(rect, i)))
          .map((i) => i.id);
        const hitSet = new Set([...it.base, ...hit]);
        const joined = items
          .filter((i) => i.type === "arrow" && hitSet.has(i.fromId!) && hitSet.has(i.toId!))
          .map((i) => i.id);
        setSelected([...hitSet, ...joined]);
        break;
      }
      case "arrow":
        setArrowPreview({ fromId: it.fromId, to: toWorld(e.clientX, e.clientY) });
        break;
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    touches.current.delete(e.pointerId);
    const it = interaction.current;
    if (!it) return;
    if (it.kind === "pinch" && touches.current.size > 0) return;
    interaction.current = null;
    const el = containerRef.current!;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);

    switch (it.kind) {
      case "pan":
        setPanning(false);
        break;
      case "move":
        if (it.moved && drag) {
          commit(
            folderId,
            items.map((i) => (drag.ids.has(i.id) ? { ...i, x: i.x + drag.dx, y: i.y + drag.dy } : i)),
          );
        }
        setDrag(null);
        break;
      case "resize":
        if (resize) commit(folderId, items.map((i) => (i.id === resize.id ? { ...i, w: resize.w, h: resize.h } : i)));
        setResize(null);
        break;
      case "marquee":
        setMarquee(null);
        break;
      case "arrow": {
        setArrowPreview(null);
        setTool("select");
        const toId = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-item-id]")?.getAttribute("data-item-id");
        const to = toId ? byId.get(toId) : undefined;
        const exists = items.some((i) => i.type === "arrow" && i.fromId === it.fromId && i.toId === toId);
        if (to && to.id !== it.fromId && to.type !== "arrow" && !exists) {
          addItem({ type: "arrow", x: 0, y: 0, w: 0, h: 0, fromId: it.fromId, toId: to.id });
        }
        break;
      }
    }
  };

  const onDoubleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (tool !== "select") return;
    const target = e.target as Element;
    const id = target.closest("[data-item-id]")?.getAttribute("data-item-id");
    const item = id ? byId.get(id) : undefined;
    if (item && item.type !== "arrow" && item.type !== "image") {
      setSelected([item.id]);
      setEditingId(item.id);
    } else if (!item) {
      createSticky(toWorld(e.clientX, e.clientY));
    }
  };

  // ---------- keyboard ----------
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e: KeyboardEvent) => {
    const ui = useUI.getState();
    if (ui.openCardId || ui.settingsOpen || isTypingTarget(e.target)) return;
    if ((e.target as Element | null)?.closest?.("[role=menu]")) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();

    if (e.key === " " && !e.repeat) {
      e.preventDefault();
      setSpaceDown(true);
    } else if (mod && k === "z") {
      e.preventDefault();
      if (e.shiftKey) redo(folderId);
      else undo(folderId);
      setSelected([]);
    } else if (mod && k === "y") {
      e.preventDefault();
      redo(folderId);
    } else if (mod && k === "a") {
      e.preventDefault();
      setSelected(items.map((i) => i.id));
    } else if (mod && k === "d") {
      e.preventDefault();
      duplicateSelected();
    } else if (e.key === "Backspace" || e.key === "Delete") {
      if (selected.length) {
        e.preventDefault();
        deleteSelected();
      }
    } else if (e.key === "Escape") {
      setSelected([]);
      setTool("select");
    } else if (e.key === "Enter" && selected.length === 1) {
      const item = byId.get(selected[0]);
      if (item && item.type !== "arrow" && item.type !== "image") {
        e.preventDefault();
        setEditingId(item.id);
      }
    } else if (e.shiftKey && e.key === "!") {
      fit();
    } else if (!mod && !e.altKey && TOOL_KEYS[k]) {
      setTool(TOOL_KEYS[k]);
    }
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => keyHandler.current(e);
    const up = (e: KeyboardEvent) => e.key === " " && setSpaceDown(false);
    const blur = () => setSpaceDown(false);
    const newSticky = () => createStickyRef.current();
    // Paste images from the clipboard onto the canvas.
    const paste = (e: ClipboardEvent) => {
      if (isTypingTarget(e.target) || useUI.getState().openCardId) return;
      const files = imageFiles(e.clipboardData?.files);
      if (!files.length) return;
      e.preventDefault();
      void insertImagesRef.current(files);
    };
    window.addEventListener("paste", paste);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    window.addEventListener(NEW_STICKY_EVENT, newSticky);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      window.removeEventListener(NEW_STICKY_EVENT, newSticky);
      window.removeEventListener("paste", paste);
    };
  }, []);

  const createStickyRef = useRef(() => {});
  createStickyRef.current = () => createSticky(viewportCenter());

  // ---------- render ----------
  const selectedBoxes = items.filter((i) => selectedSet.has(i.id) && i.type !== "arrow");
  const selectionColor = selectedBoxes.length && selectedBoxes.every((i) => i.color === selectedBoxes[0].color)
    ? selectedBoxes[0].color
    : undefined;
  const single = selected.length === 1 ? byId.get(selected[0]) : undefined;
  const gridSize = 24 * vp.zoom * (vp.zoom < 0.5 ? 2 : 1);
  const cursor = panning ? "grabbing" : spaceDown ? "grab" : tool === "select" ? "default" : "crosshair";

  const renderItem = (i: CanvasItem) => (
    <CanvasItemView
      key={i.id}
      item={i}
      zoom={vp.zoom}
      selected={selectedSet.has(i.id)}
      showHandle={single?.id === i.id && i.type !== "arrow" && !editingId && tool === "select"}
      editing={editingId === i.id}
      onCommitEdit={commitEdit}
    />
  );

  return (
    <div
      ref={containerRef}
      className="canvas-dots absolute inset-0 touch-none overflow-hidden rounded-tr-[14px] rounded-b-[14px] select-none"
      style={{
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${vp.x}px ${vp.y}px`,
        cursor,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFileDragOver(false);
      }}
      onDrop={onDrop}
      role="application"
      aria-label={`${folder.name} canvas`}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` }}
      >
        {sections.map(renderItem)}
        <ArrowLayer arrows={arrows} byId={byId} selected={selectedSet} zoom={vp.zoom} preview={arrowPreview} />
        {others.map(renderItem)}
        {marquee && (
          <div
            className="pointer-events-none absolute rounded-sm border-select bg-select/10"
            style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h, borderWidth: 1 / vp.zoom }}
          />
        )}
      </div>

      {items.length === 0 && !fileDragOver && (
        <div className="pointer-events-none absolute inset-0 flex">
          <EmptyState
            icon={RiArtboardLine}
            title="A blank canvas"
            description="Map out plans with sticky notes, sections, and arrows. Double-click anywhere to add a note."
            actions={
              <div
                className="pointer-events-auto flex flex-wrap justify-center gap-2"
                onPointerDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
              >
                <PrimaryButton onClick={() => createSticky(viewportCenter())}>
                  <RiStickyNoteLine size={16} /> Add a sticky note
                </PrimaryButton>
                <GhostButton onClick={() => fileRef.current?.click()} className="border border-line bg-panel">
                  <RiImageLine size={16} /> Add an image
                </GhostButton>
              </div>
            }
          />
        </div>
      )}

      <CanvasToolbar
        tool={tool}
        onTool={setTool}
        onImage={() => fileRef.current?.click()}
        onUndo={() => undo(folderId)}
        onRedo={() => redo(folderId)}
        canUndo={undoable}
        canRedo={redoable}
      />
      {selectedBoxes.length > 0 && !editingId && (
        <SelectionBar
          count={selectedBoxes.length}
          color={selectionColor}
          onColor={selectedBoxes.some((i) => i.type !== "image" && i.type !== "text") ? recolorSelected : undefined}
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
        />
      )}
      <ZoomControls
        zoom={vp.zoom}
        onZoomIn={() => zoomCentered(1.2)}
        onZoomOut={() => zoomCentered(1 / 1.2)}
        onReset={() => {
          const r = containerRect();
          zoomAt(r.width / 2, r.height / 2, 1);
        }}
        onFit={fit}
      />
      <p className="pointer-events-none absolute bottom-4 left-4 hidden text-[11.5px] text-subtle lg:block">
        Space + drag to pan · Ctrl + scroll to zoom · Double-click to add a note · Drop or paste images
      </p>

      {fileDragOver && (
        <div className="anim-fade pointer-events-none absolute inset-3 z-30 grid place-items-center rounded-xl border-2 border-dashed border-select bg-select/10">
          <p className="rounded-lg bg-panel px-3 py-1.5 text-[13px] font-medium text-ink shadow-(--shadow-float)">
            Drop images to add them here
          </p>
        </div>
      )}

      {notice && (
        <p
          role="alert"
          className="anim-rise absolute bottom-16 left-1/2 z-30 max-w-[90%] -translate-x-1/2 rounded-lg bg-(--tooltip-bg) px-3 py-1.5 text-[12.5px] text-(--tooltip-text) shadow-(--shadow-float)"
        >
          {notice}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = imageFiles(e.target.files);
          e.target.value = "";
          if (files.length) void insertImages(files);
        }}
      />
    </div>
  );
}
