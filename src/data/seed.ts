import { addDaysISO, DAY_MS, HOUR_MS } from "../lib/date";
import type { CanvasItem, FocusCard, Folder, Notebook } from "../types";

/**
 * Sample content shown on first launch. Ids are fixed so the UI state that
 * references them (selected folder, expanded tree nodes) survives a reload
 * even before anything has been written to localStorage.
 */
export interface SeedData {
  folders: Folder[];
  cards: FocusCard[];
  notebooks: Notebook[];
  canvasItems: CanvasItem[];
}

export const DEFAULT_FOLDER_ID = "f-studio";

export function createSeed(): SeedData {
  const now = Date.now();
  const ago = (ms: number) => now - ms;

  const folders: Folder[] = [
    {
      id: "f-studio",
      name: "Studio Work",
      color: "blue",
      description:
        "Client projects, the Q4 launch, and the small operational things that keep the studio running. Notes here lean practical: what's due, who's waiting, and what comes next.",
      parentId: null,
      order: 0,
    },
    {
      id: "f-launch",
      name: "Q4 Launch",
      color: "orange",
      description: "Everything for the October launch — assets, pricing, and the run-of-show.",
      parentId: "f-studio",
      order: 0,
    },
    {
      id: "f-hiring",
      name: "Hiring",
      color: "teal",
      description: "Open roles, interview loops, and candidate notes.",
      parentId: "f-studio",
      order: 1,
    },
    {
      id: "f-personal",
      name: "Personal",
      color: "violet",
      description:
        "Life admin, small rituals, and the people worth calling back. A quiet place for everything that isn't work.",
      parentId: null,
      order: 1,
    },
    {
      id: "f-reading",
      name: "Reading list",
      color: "pink",
      description: "Books in progress, passages worth keeping, and what to read next.",
      parentId: "f-personal",
      order: 0,
    },
    {
      id: "f-home",
      name: "Home",
      color: "amber",
      description: "Repairs, errands, and the slow project of making the apartment feel finished.",
      parentId: "f-personal",
      order: 1,
    },
    {
      id: "f-goals",
      name: "Goals 2026",
      color: "green",
      description:
        "Long-range planning for the year ahead — what matters, what to let go of, and how each week ladders up to the months and the year. Open the Canvas tab to see the map.",
      parentId: null,
      order: 2,
    },
  ];

  const card = (c: Partial<FocusCard> & Pick<FocusCard, "id" | "folderId" | "title">): FocusCard => ({
    detail: "",
    color: "sand",
    tags: [],
    progress: 0,
    checklist: [],
    done: false,
    priority: "medium",
    linkedNotebookIds: [],
    createdAt: ago(5 * DAY_MS),
    updatedAt: ago(2 * DAY_MS),
    ...c,
  });

  const cards: FocusCard[] = [
    card({
      id: "c-runofshow",
      folderId: "f-studio",
      title: "Finalize the launch run-of-show with Priya",
      detail:
        "Confirm an owner for every launch-day task and share the final run-of-show with the team before Thursday standup.",
      color: "butter",
      dueDate: addDaysISO(0),
      tags: ["urgent", "review"],
      priority: "high",
      checklist: [
        { id: "k1", text: "Draft timeline by hour", done: true },
        { id: "k2", text: "Assign owners", done: true },
        { id: "k3", text: "Review with Priya", done: false },
        { id: "k4", text: "Share in #launch", done: false },
      ],
      progress: 50,
      linkedNotebookIds: ["n-runofshow"],
      updatedAt: ago(1 * HOUR_MS),
      pinned: true,
    }),
    card({
      id: "c-copy",
      folderId: "f-studio",
      title: "Review homepage copy v3",
      detail: "Tighten the hero line and check the pricing section against the new tiers.",
      color: "lavender",
      dueDate: addDaysISO(1),
      tags: ["review"],
      progress: 40,
      updatedAt: ago(3 * HOUR_MS),
    }),
    card({
      id: "c-invoice",
      folderId: "f-studio",
      title: "Send September invoice to Harbor & Co.",
      detail: "Include the extra discovery workshop hours. Net-15.",
      color: "peach",
      dueDate: addDaysISO(-1),
      tags: ["urgent", "errand"],
      priority: "high",
      linkedNotebookIds: ["n-harbor"],
      updatedAt: ago(26 * HOUR_MS),
    }),
    card({
      id: "c-onboarding",
      folderId: "f-studio",
      title: "Sketch onboarding flow ideas",
      detail:
        "Three rough directions: a guided checklist, a sample workspace, and an empty state that teaches by example.",
      color: "sky",
      tags: ["idea"],
      priority: "low",
      progress: 15,
      updatedAt: ago(2 * DAY_MS),
    }),
    card({
      id: "c-retainer",
      folderId: "f-studio",
      title: "Reply to Dana about the retainer",
      detail: "She asked whether we can move to a quarterly scope review instead of monthly.",
      color: "sand",
      dueDate: addDaysISO(3),
      tags: ["waiting"],
      linkedNotebookIds: ["n-harbor"],
      updatedAt: ago(4 * DAY_MS),
    }),
    card({
      id: "c-offsite",
      folderId: "f-studio",
      title: "Plan the team offsite agenda",
      detail: "Half a day on the roadmap, half a day outside. Find somewhere with a long table and good light.",
      color: "blush",
      dueDate: addDaysISO(12),
      tags: ["idea", "review"],
      priority: "low",
      progress: 25,
      linkedNotebookIds: ["n-rituals"],
      updatedAt: ago(6 * DAY_MS),
    }),
    card({
      id: "c-figma",
      folderId: "f-studio",
      title: "Clean up the Figma library",
      detail: "Archive the old icon set and rename components to match the code.",
      color: "sage",
      tags: ["deep-work"],
      progress: 100,
      done: true,
      doneAt: ago(1 * DAY_MS),
      updatedAt: ago(1 * DAY_MS),
    }),
    card({
      id: "c-presskit",
      folderId: "f-launch",
      title: "Assemble the press kit",
      detail: "Logos, product shots, a one-page fact sheet, and two founder quotes.",
      color: "peach",
      dueDate: addDaysISO(4),
      tags: ["urgent"],
      priority: "high",
      checklist: [
        { id: "p1", text: "Logo pack", done: true },
        { id: "p2", text: "Product screenshots", done: false },
        { id: "p3", text: "Fact sheet", done: false },
      ],
      progress: 33,
      updatedAt: ago(5 * HOUR_MS),
    }),
    card({
      id: "c-pricingqa",
      folderId: "f-launch",
      title: "QA the new pricing page",
      detail: "Check every currency, the annual toggle, and the mobile layout.",
      color: "sky",
      dueDate: addDaysISO(2),
      tags: ["review"],
      updatedAt: ago(9 * HOUR_MS),
    }),
    card({
      id: "c-loop",
      folderId: "f-hiring",
      title: "Write the interview loop for the design role",
      detail: "Portfolio review, a paired critique, and a values conversation.",
      color: "sage",
      dueDate: addDaysISO(6),
      tags: ["deep-work"],
      updatedAt: ago(3 * DAY_MS),
    }),
    card({
      id: "c-passport",
      folderId: "f-personal",
      title: "Renew passport",
      detail: "Photos are in the desk drawer. The form needs the old passport number.",
      color: "sage",
      dueDate: addDaysISO(5),
      tags: ["urgent", "errand"],
      priority: "high",
      updatedAt: ago(20 * HOUR_MS),
    }),
    card({
      id: "c-grandma",
      folderId: "f-personal",
      title: "Call grandma on Sunday",
      detail: "Ask about the recipe for the plum cake and the photos from the lake house.",
      color: "blush",
      dueDate: addDaysISO(2),
      tags: ["people"],
      updatedAt: ago(2 * DAY_MS),
      pinned: true,
    }),
    card({
      id: "c-dentist",
      folderId: "f-personal",
      title: "Book a dentist appointment",
      detail: "Morning slots only.",
      color: "butter",
      dueDate: addDaysISO(0),
      tags: ["errand"],
      priority: "low",
      updatedAt: ago(30 * HOUR_MS),
    }),
    card({
      id: "c-overstory",
      folderId: "f-reading",
      title: "Finish The Overstory",
      detail: "Two sections left. Pull out the passages about time and patience for the reading notes.",
      color: "sage",
      tags: ["review"],
      progress: 70,
      linkedNotebookIds: ["n-overstory"],
      updatedAt: ago(3 * DAY_MS),
    }),
    card({
      id: "c-shelves",
      folderId: "f-home",
      title: "Fix the wobbly bookshelf",
      detail: "Needs two wall anchors and a shim under the left foot.",
      color: "sand",
      dueDate: addDaysISO(8),
      tags: ["errand"],
      updatedAt: ago(8 * DAY_MS),
    }),
    card({
      id: "c-themes",
      folderId: "f-goals",
      title: "Draft three themes for 2026",
      detail: "Keep each to one sentence. They should make saying no easier.",
      color: "lavender",
      dueDate: addDaysISO(7),
      tags: ["deep-work", "review"],
      progress: 30,
      linkedNotebookIds: ["n-themes"],
      updatedAt: ago(10 * HOUR_MS),
    }),
  ];

  const nb = (n: Partial<Notebook> & Pick<Notebook, "id" | "folderId" | "title" | "content">): Notebook => ({
    tags: [],
    color: "sand",
    createdAt: ago(9 * DAY_MS),
    updatedAt: ago(1 * DAY_MS),
    ...n,
  });

  const notebooks: Notebook[] = [
    nb({
      id: "n-runofshow",
      folderId: "f-studio",
      title: "Launch run-of-show",
      color: "butter",
      tags: ["launch", "planning"],
      updatedAt: ago(2 * HOUR_MS),
      pinned: true,
      content: `<h2>Launch day, hour by hour</h2><p>The goal is a calm launch: nobody should be discovering their task on the day.</p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>08:00 — final smoke test of checkout</p></li><li data-type="taskItem" data-checked="true"><p>09:00 — flip the pricing flag</p></li><li data-type="taskItem" data-checked="false"><p>10:00 — publish the announcement post</p></li><li data-type="taskItem" data-checked="false"><p>11:00 — newsletter goes out</p></li></ul><h3>Owners</h3><ul><li><p><strong>Priya</strong> — comms and press</p></li><li><p><strong>Sam</strong> — release and rollback</p></li><li><p><strong>Me</strong> — support inbox and social</p></li></ul><blockquote><p>If something breaks, we pause the newsletter first and fix second.</p></blockquote>`,
    }),
    nb({
      id: "n-harbor",
      folderId: "f-studio",
      title: "Meeting notes: Harbor & Co.",
      color: "peach",
      tags: ["client", "meetings"],
      updatedAt: ago(26 * HOUR_MS),
      content: `<h2>Sep 22 check-in</h2><p>Dana and Luis joined. Mostly about scope for Q4 and how often we review it.</p><ul><li><p>They'd like a quarterly scope review instead of monthly.</p></li><li><p>The discovery workshop ran long — bill the extra 3 hours.</p></li><li><p>Next deliverable: the onboarding prototype.</p></li></ul><h3>Follow-ups</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Send the September invoice</p></li><li data-type="taskItem" data-checked="false"><p>Reply about the retainer structure</p></li></ul>`,
    }),
    nb({
      id: "n-rituals",
      folderId: "f-studio",
      title: "Studio rituals",
      color: "sage",
      tags: ["team"],
      createdAt: ago(40 * DAY_MS),
      updatedAt: ago(6 * DAY_MS),
      content: `<p>Small habits that keep a four-person studio from feeling like a factory.</p><h3>Weekly</h3><ul><li><p>Monday: 20-minute plan, cameras on, coffee required.</p></li><li><p>Friday: show-and-tell — anything made this week, however rough.</p></li></ul><h3>Monthly</h3><ul><li><p>One long lunch, no laptops.</p></li><li><p>Retro on what we said no to.</p></li></ul>`,
    }),
    nb({
      id: "n-pricing",
      folderId: "f-launch",
      title: "Pricing decisions",
      color: "sky",
      tags: ["launch", "pricing"],
      updatedAt: ago(9 * HOUR_MS),
      content: `<h2>Three tiers, one question</h2><p>Every tier should answer "who is this for?" in a sentence.</p><ol><li><p><strong>Solo</strong> — for one person with one project.</p></li><li><p><strong>Studio</strong> — for small teams sharing a workspace.</p></li><li><p><strong>Company</strong> — SSO, admin controls, invoicing.</p></li></ol><pre><code>annual_discount = 0.2  # two months free</code></pre>`,
    }),
    nb({
      id: "n-overstory",
      folderId: "f-reading",
      title: "Reading notes: The Overstory",
      color: "sage",
      tags: ["books"],
      createdAt: ago(20 * DAY_MS),
      updatedAt: ago(3 * DAY_MS),
      content: `<blockquote><p>The best time to plant a tree was twenty years ago. The second-best time is now.</p></blockquote><p>Not a quote from the book, but it keeps coming to mind while reading it. The whole novel is an argument for thinking on longer timescales.</p><h3>Passages to revisit</h3><ul><li><p>The chestnut chapter — generations of photographs of one tree.</p></li><li><p>Patricia's field notes on how trees signal to each other.</p></li></ul>`,
    }),
    nb({
      id: "n-weekly",
      folderId: "f-personal",
      title: "Weekly review",
      color: "lavender",
      tags: ["review", "ritual"],
      updatedAt: ago(2 * DAY_MS),
      content: `<h2>What went well</h2><ul><li><p>Walked every morning.</p></li><li><p>Finished the hard part of the launch plan early.</p></li></ul><h2>What to change</h2><ul><li><p>Too many small meetings on Wednesday. Batch them.</p></li></ul><h2>Next week</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Renew passport</p></li><li data-type="taskItem" data-checked="false"><p>Call grandma</p></li></ul>`,
    }),
    nb({
      id: "n-themes",
      folderId: "f-goals",
      title: "2026 themes",
      color: "lavender",
      tags: ["planning"],
      updatedAt: ago(10 * HOUR_MS),
      content: `<h2>Three themes</h2><ol><li><p><strong>Fewer, better projects.</strong> Say no to anything that doesn't teach us something.</p></li><li><p><strong>Make things by hand.</strong> More sketching, less scrolling.</p></li><li><p><strong>Protect the mornings.</strong> Nothing scheduled before 10.</p></li></ol><p>Revisit at the start of each month on the canvas.</p>`,
    }),
  ];

  const g = "f-goals";
  const item = (i: Omit<CanvasItem, "folderId" | "rotation" | "content" | "color"> & Partial<CanvasItem>): CanvasItem => ({
    folderId: g,
    rotation: 0,
    content: "",
    color: "butter",
    ...i,
  });

  const canvasItems: CanvasItem[] = [
    item({ id: "cv-title", type: "text", x: 0, y: -96, w: 520, h: 48, content: "Plan the year backwards" }),
    item({ id: "cv-week", type: "section", x: 0, y: 0, w: 360, h: 430, color: "sky", content: "This week" }),
    item({ id: "cv-month", type: "section", x: 420, y: 0, w: 360, h: 430, color: "sage", content: "This month" }),
    item({ id: "cv-year", type: "section", x: 840, y: 0, w: 360, h: 430, color: "lavender", content: "This year" }),
    item({ id: "cv-s1", type: "sticky", x: 36, y: 64, w: 150, h: 150, rotation: -1.6, color: "butter", content: "Finish launch run-of-show" }),
    item({ id: "cv-s2", type: "sticky", x: 190, y: 220, w: 140, h: 140, rotation: 1.2, color: "blush", content: "Morning walks, 5 of 7 days" }),
    item({ id: "cv-s3", type: "sticky", x: 460, y: 70, w: 150, h: 150, rotation: 1.4, color: "peach", content: "Ship Q4 launch calmly" }),
    item({ id: "cv-s4", type: "sticky", x: 600, y: 240, w: 150, h: 150, rotation: -0.8, color: "butter", content: "Read two books" }),
    item({ id: "cv-s5", type: "sticky", x: 880, y: 64, w: 160, h: 160, rotation: -1.1, color: "sage", content: "Fewer, better projects" }),
    item({ id: "cv-s6", type: "sticky", x: 1010, y: 236, w: 160, h: 150, rotation: 1.8, color: "sky", content: "Protect the mornings" }),
    item({ id: "cv-a1", type: "arrow", x: 0, y: 0, w: 0, h: 0, fromId: "cv-s1", toId: "cv-s3" }),
    item({ id: "cv-a2", type: "arrow", x: 0, y: 0, w: 0, h: 0, fromId: "cv-s3", toId: "cv-s5" }),
    item({ id: "cv-a3", type: "arrow", x: 0, y: 0, w: 0, h: 0, fromId: "cv-s2", toId: "cv-s4" }),
  ];

  return { folders, cards, notebooks, canvasItems };
}
