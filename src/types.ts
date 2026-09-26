export type Pastel = "sage" | "lavender" | "butter" | "sand" | "blush" | "sky" | "peach";

export type FolderColor =
  | "violet"
  | "blue"
  | "green"
  | "pink"
  | "orange"
  | "amber"
  | "teal"
  | "brown";

export interface Folder {
  id: string;
  name: string;
  color: FolderColor;
  description: string;
  parentId: string | null;
  order: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export type Priority = "low" | "medium" | "high";

export interface FocusCard {
  id: string;
  folderId: string;
  title: string;
  detail: string;
  color: Pastel;
  /** Local calendar date, YYYY-MM-DD */
  dueDate?: string;
  tags: string[];
  /** 0–100. Derived from the checklist when it has items. */
  progress: number;
  checklist: ChecklistItem[];
  done: boolean;
  doneAt?: number;
  priority: Priority;
  pinned?: boolean;
  linkedNotebookIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Notebook {
  id: string;
  folderId: string;
  title: string;
  /** TipTap HTML */
  content: string;
  tags: string[];
  color: Pastel;
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type CanvasItemType = "sticky" | "text" | "section" | "arrow" | "image";

export interface CanvasItem {
  id: string;
  folderId: string;
  type: CanvasItemType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  color: Pastel;
  content: string;
  fromId?: string;
  toId?: string;
}

export type Tab = "focus" | "notebooks" | "canvas";

export type QuickView = "today" | "recent" | "pinned";

export type View = { kind: "folder"; folderId: string } | { kind: QuickView };

export type CardSort = "updated" | "due" | "priority";
