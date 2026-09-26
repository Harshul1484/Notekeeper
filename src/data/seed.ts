import type { CanvasItem, FocusCard, Folder, Notebook } from "../types";

/**
 * Starter content for a first launch: a short tour plus a few empty, reusable
 * templates. Deliberately generic and light, so it reads as a place to start
 * rather than someone else's work. No due dates, so nothing turns "overdue".
 *
 * Ids are fixed so UI state that references them (selected folder, expanded
 * tree nodes) survives a reload.
 */
export interface SeedData {
  folders: Folder[];
  cards: FocusCard[];
  notebooks: Notebook[];
  canvasItems: CanvasItem[];
}

export const DEFAULT_FOLDER_ID = "f-start";

export function createSeed(): SeedData {
  const now = Date.now();
  // Stagger timestamps by a few minutes so "Recent" has a natural order.
  const minsAgo = (m: number) => now - m * 60_000;

  const folders: Folder[] = [
    {
      id: "f-start",
      name: "Getting started",
      color: "blue",
      description: "A quick tour of how Notekeeper works. Try each tab, then delete this folder whenever you like.",
      parentId: null,
      order: 0,
    },
    { id: "f-work", name: "Work", color: "violet", description: "", parentId: null, order: 1 },
    { id: "f-projects", name: "Projects", color: "orange", description: "", parentId: "f-work", order: 0 },
    { id: "f-personal", name: "Personal", color: "green", description: "", parentId: null, order: 2 },
    { id: "f-goals", name: "Goals", color: "amber", description: "", parentId: null, order: 3 },
  ];

  const card = (c: Partial<FocusCard> & Pick<FocusCard, "id" | "title" | "updatedAt">): FocusCard => ({
    folderId: "f-start",
    detail: "",
    color: "sand",
    tags: [],
    progress: 0,
    checklist: [],
    done: false,
    priority: "medium",
    linkedNotebookIds: [],
    createdAt: c.updatedAt,
    ...c,
  });

  const cards: FocusCard[] = [
    card({
      id: "c-welcome",
      title: "Welcome to Notekeeper",
      detail: "Cards hold the small things that need your attention. Open this one to see what a card can do.",
      color: "butter",
      pinned: true,
      checklist: [
        { id: "w1", text: "Open a card", done: true },
        { id: "w2", text: "Check off an item", done: false },
        { id: "w3", text: "Give the card a color", done: false },
        { id: "w4", text: "Mark it as done", done: false },
      ],
      progress: 25,
      linkedNotebookIds: ["n-guide"],
      updatedAt: minsAgo(1),
    }),
    card({
      id: "c-tags",
      title: "Tag cards to filter them",
      detail: "Tags show up as chips above your cards. Click one to see only the cards that match.",
      color: "sky",
      tags: ["tip"],
      updatedAt: minsAgo(2),
    }),
    card({
      id: "c-new",
      title: "Press N to add something new",
      detail: "It adds a card in Focus, a notebook in Notebooks, or a sticky note on the Canvas.",
      color: "lavender",
      tags: ["tip"],
      updatedAt: minsAgo(3),
    }),
    card({
      id: "c-search",
      title: "Press / to search",
      detail: "Search looks through every folder, card, and notebook.",
      color: "sage",
      tags: ["tip"],
      updatedAt: minsAgo(4),
    }),
  ];

  const nb = (n: Notebook): Notebook => n;

  const notebooks: Notebook[] = [
    nb({
      id: "n-guide",
      folderId: "f-start",
      title: "How Notekeeper works",
      color: "sand",
      tags: ["guide"],
      pinned: true,
      createdAt: minsAgo(5),
      updatedAt: minsAgo(5),
      content:
        `<p>Everything lives in folders, and each folder has three tabs:</p>` +
        `<ul><li><p><strong>Focus</strong> for small things that need attention soon</p></li>` +
        `<li><p><strong>Notebooks</strong> for longer notes, like this one</p></li>` +
        `<li><p><strong>Canvas</strong> for mapping out plans visually</p></li></ul>` +
        `<h3>Writing</h3>` +
        `<p>Use the toolbar above for headings, lists, quotes, code, links, and images. Paste or drag images straight into a note.</p>` +
        `<ul data-type="taskList">` +
        `<li data-type="taskItem" data-checked="true"><p>Checklists work too</p></li>` +
        `<li data-type="taskItem" data-checked="false"><p>Try checking this one</p></li></ul>` +
        `<h3>Your data</h3>` +
        `<p>Notes are saved in this browser as you type. Use <strong>Settings → Export</strong> to keep a backup.</p>`,
    }),
    nb({
      id: "n-meeting",
      folderId: "f-work",
      title: "Meeting notes",
      color: "sky",
      tags: ["template"],
      createdAt: minsAgo(6),
      updatedAt: minsAgo(6),
      content:
        `<h3>Agenda</h3><ul><li><p>Topic</p></li></ul>` +
        `<h3>Notes</h3><p></p>` +
        `<h3>Action items</h3>` +
        `<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Task and owner</p></li></ul>`,
    }),
    nb({
      id: "n-weekly",
      folderId: "f-personal",
      title: "Weekly review",
      color: "lavender",
      tags: ["template"],
      createdAt: minsAgo(7),
      updatedAt: minsAgo(7),
      content:
        `<h3>What went well</h3><ul><li><p></p></li></ul>` +
        `<h3>What could be better</h3><ul><li><p></p></li></ul>` +
        `<h3>Next week</h3>` +
        `<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>`,
    }),
  ];

  const canvasItems = goalsCanvas();

  return { folders, cards, notebooks, canvasItems };
}

/**
 * Goals canvas: a Now / Next / Later board. Three tinted columns with a time
 * hint in each label, a few card-shaped placeholder notes per column (tonal:
 * each column's notes share its color), and a "How to use" note beside it.
 */
export function goalsCanvas(folderId = "f-goals"): CanvasItem[] {
  const item = (i: Omit<CanvasItem, "folderId" | "rotation" | "content" | "color"> & Partial<CanvasItem>): CanvasItem => ({
    folderId,
    rotation: 0,
    content: "",
    color: "butter",
    ...i,
  });

  const COL_W = 300;
  const GAP = 36;
  const COL_H = 468;
  const NOTE = { w: 260, h: 92, first: 64, step: 110 };
  const tilt = [-0.6, 0.5, -0.3];

  const columns: { key: string; label: string; color: CanvasItem["color"]; notes: string[] }[] = [
    { key: "now", label: "Now · this week", color: "peach", notes: ["Your top priority", "Something in progress"] },
    { key: "next", label: "Next · this month", color: "butter", notes: ["Up next", "Ready to start"] },
    { key: "later", label: "Later · someday", color: "sky", notes: ["An idea worth keeping", "Someday, maybe", "Nice to have"] },
  ];

  const board = columns.flatMap((col, c) => {
    const x = c * (COL_W + GAP);
    return [
      item({ id: `cv-b-${col.key}`, type: "section", x, y: 0, w: COL_W, h: COL_H, color: col.color, content: col.label }),
      ...col.notes.map((text, n) =>
        item({
          id: `cv-b-${col.key}-${n + 1}`,
          type: "sticky",
          x: x + (COL_W - NOTE.w) / 2,
          y: NOTE.first + n * NOTE.step,
          w: NOTE.w,
          h: NOTE.h,
          rotation: tilt[n],
          color: col.color,
          content: text,
        }),
      ),
    ];
  });

  const boardW = columns.length * COL_W + (columns.length - 1) * GAP;
  return [
    item({ id: "cv-b-title", type: "text", x: 0, y: -92, w: 600, h: 44, content: "Now, next, later" }),
    ...board,
    item({
      id: "cv-b-guide",
      type: "sticky",
      x: boardW + 56,
      y: 8,
      w: 240,
      h: 214,
      rotation: 1.2,
      color: "sand",
      content: [
        "How to use",
        "",
        "• Keep Now to three notes or fewer",
        "• Pull from Next when Now is clear",
        "• Park ideas in Later so they're not lost",
      ].join("\n"),
    }),
  ];
}

/**
 * Earlier Goals templates, by id and text. A saved canvas that still matches
 * one exactly (i.e. was never edited) is upgraded to the current template.
 */
export const PREVIOUS_GOALS_TEMPLATES: Record<string, string>[] = [
  // v2: "Plan backwards"
  {
    "cv-title": "Plan backwards",
    "cv-week": "This week",
    "cv-month": "This month",
    "cv-year": "This year",
    "cv-step": "A first small step",
    "cv-milestone": "A milestone",
    "cv-goal": "A goal for the year",
    "cv-a1": "",
    "cv-a2": "",
  },
  // v3: first "Now, next, later"
  {
    "cv-nnl-title": "Now, next, later",
    "cv-now": "Now",
    "cv-next": "Next",
    "cv-later": "Later",
    "cv-now-1": "What you're focused on",
    "cv-next-1": "What comes after",
    "cv-later-1": "Ideas for someday",
  },
];
