import { useEffect } from "react";
import { useUI, type ThemePref } from "../store/ui";
import { useMediaQuery } from "./useMediaQuery";

export type ResolvedTheme = "light" | "dark";

/** Keep in sync with the inline script in index.html, which runs before first paint. */
export const resolveTheme = (pref: ThemePref, systemDark: boolean): ResolvedTheme =>
  pref === "system" ? (systemDark ? "dark" : "light") : pref;

/** The theme actually showing: "system" resolved against the device setting. */
export function useResolvedTheme() {
  const pref = useUI((s) => s.theme);
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  return resolveTheme(pref, systemDark);
}

/** Applies the theme preference to <html data-theme> and the browser UI color. */
export function useTheme() {
  const theme = useResolvedTheme();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    const bg = getComputedStyle(root).getPropertyValue("--window").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bg);
  }, [theme]);

  return theme;
}
