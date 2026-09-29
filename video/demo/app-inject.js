// Injected into the app by the demo server only. The native caret blinks on the
// OS clock, which would make frames non-deterministic, so it is hidden and redrawn
// here on the (faked) page clock: solid while typing, blinking when idle.
(() => {
  // Seeded randomness: new cards get the same color and stickies the same tilt on every run.
  let seed = 0x2f6b1d;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };

  const style = document.createElement("style");
  style.textContent = "*{caret-color:transparent !important}";
  document.head.appendChild(style);

  let caret = null;
  let lastInput = 0;
  const bump = () => (lastInput = Date.now());
  document.addEventListener("input", bump, true);
  document.addEventListener("keydown", bump, true);
  document.addEventListener("focusin", bump, true);
  document.addEventListener("pointerdown", bump, true);

  const COPY = [
    "boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderStyle",
    "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "lineHeight",
    "textTransform", "textIndent", "wordSpacing", "tabSize", "fontVariantNumeric", "fontFeatureSettings",
  ];

  function fieldCaret(el) {
    const cs = getComputedStyle(el);
    const pos = el.selectionEnd ?? el.value.length;
    const div = document.createElement("div");
    for (const p of COPY) div.style[p] = cs[p];
    const isArea = el.tagName === "TEXTAREA";
    Object.assign(div.style, {
      position: "absolute", visibility: "hidden", top: "0", left: "-9999px",
      whiteSpace: isArea ? "pre-wrap" : "pre", overflowWrap: isArea ? "break-word" : "normal",
      height: "auto", overflow: "hidden",
    });
    div.textContent = el.value.slice(0, pos);
    const span = document.createElement("span");
    span.textContent = el.value.slice(pos) || "​";
    div.appendChild(span);
    document.body.appendChild(div);
    const r = el.getBoundingClientRect();
    const fs = parseFloat(cs.fontSize);
    const lh = cs.lineHeight === "normal" ? fs * 1.2 : parseFloat(cs.lineHeight);
    const h = Math.min(lh, fs * 1.3);
    let x = r.left + span.offsetLeft - el.scrollLeft;
    let y;
    if (isArea) y = r.top + span.offsetTop - el.scrollTop + (lh - h) / 2;
    else y = r.top + r.height / 2 - h / 2;
    div.remove();
    return { x, y, h, color: cs.color };
  }

  function editableCaret() {
    const sel = document.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) return null;
    const range = sel.getRangeAt(0).cloneRange();
    let rect = range.getClientRects()[0];
    const node = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
    const cs = getComputedStyle(node);
    const fs = parseFloat(cs.fontSize);
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      // Empty line (never touch the editor's DOM): start of the block's content box.
      const b = node.getBoundingClientRect();
      const lh = cs.lineHeight === "normal" ? fs * 1.2 : parseFloat(cs.lineHeight);
      const h = Math.min(lh, fs * 1.3);
      return { x: b.left + parseFloat(cs.paddingLeft), y: b.top + parseFloat(cs.paddingTop) + (lh - h) / 2, h, color: cs.color };
    }
    const h = Math.min(rect.height || fs * 1.2, fs * 1.3);
    return { x: rect.left, y: rect.top + (rect.height - h) / 2, h, color: cs.color };
  }

  window.__demoCaret = function () {
    if (!caret) {
      caret = document.createElement("div");
      Object.assign(caret.style, { position: "fixed", width: "1.5px", zIndex: 2147483647, pointerEvents: "none", borderRadius: "1px" });
      document.body.appendChild(caret);
    }
    const el = document.activeElement;
    let c = null;
    try {
      if (el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && /^(text|search|)$/.test(el.type))) && el.selectionStart === el.selectionEnd) c = fieldCaret(el);
      else if (el && el.isContentEditable) c = editableCaret();
    } catch { c = null; }
    const idle = Date.now() - lastInput;
    const on = idle < 500 || Math.floor((idle - 500) / 530) % 2 === 1;
    if (!c || !on) { caret.style.display = "none"; return; }
    Object.assign(caret.style, { display: "block", left: `${c.x}px`, top: `${c.y}px`, height: `${c.h}px`, background: c.color });
  };
})();
