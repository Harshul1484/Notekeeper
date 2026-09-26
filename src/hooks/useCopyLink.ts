import { useEffect, useRef, useState } from "react";

/** Copies a URL to the clipboard; `copied` stays true briefly for feedback. */
export function useCopyLink() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), []);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API unavailable (e.g. insecure context): fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.append(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  return { copied, copy };
}
