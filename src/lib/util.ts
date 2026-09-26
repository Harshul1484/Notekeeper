export const uid = () =>
  (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36))
    .replace(/-/g, "")
    .slice(0, 12);

export const cn = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Plain text from TipTap HTML, for snippets and search. */
export const htmlToText = (html: string) => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("p, li, h1, h2, h3, blockquote, pre, br").forEach((el) => {
    el.append(" ");
  });
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
};

export const isTypingTarget = (el: EventTarget | null) => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
};

export const readFileAsDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
