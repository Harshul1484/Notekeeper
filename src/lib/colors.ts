import type { FolderColor, Pastel } from "../types";

export const PASTELS: Pastel[] = ["sage", "lavender", "butter", "sand", "blush", "sky", "peach"];

export const FOLDER_COLORS: FolderColor[] = [
  "violet",
  "blue",
  "green",
  "pink",
  "orange",
  "amber",
  "teal",
  "brown",
];

export const pastelBg = (p: Pastel) => `var(--pastel-${p})`;

/** The pastel nudged toward contrast (darker in light mode, lighter in dark), for card borders. */
export const pastelEdge = (p: Pastel) =>
  `color-mix(in oklab, var(--pastel-${p}) 84%, var(--edge-mix))`;

/** The pastel, washed out — used for canvas section fills. */
export const pastelWash = (p: Pastel) => `color-mix(in srgb, var(--pastel-${p}) var(--wash), transparent)`;

export const folderDot = (c: FolderColor) => `var(--folder-${c})`;

export const randomPastel = (): Pastel => PASTELS[Math.floor(Math.random() * PASTELS.length)];
