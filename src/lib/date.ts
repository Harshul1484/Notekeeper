const DAY = 86_400_000;

const pad = (n: number) => String(n).padStart(2, "0");

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => toISODate(new Date());

export const addDaysISO = (days: number, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

/** YYYY-MM-DD → local Date at midnight. */
export const fromISODate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const parseISO = fromISODate;

/** Whole days from today until `iso` (negative when in the past). */
export const daysUntil = (iso: string) => {
  const today = parseISO(todayISO()).getTime();
  return Math.round((parseISO(iso).getTime() - today) / DAY);
};

export const isDueOrOverdue = (iso?: string) => !!iso && daysUntil(iso) <= 0;

export const dueLabel = (iso: string) => {
  const diff = daysUntil(iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  const d = parseISO(iso);
  if (diff > 1 && diff < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export const relativeTime = (ts: number) => {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 2 * DAY) return "Yesterday";
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const WEEK_MS = 7 * DAY;
export const HOUR_MS = 3_600_000;
export const DAY_MS = DAY;
