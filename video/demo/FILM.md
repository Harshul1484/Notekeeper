# Notekeeper product film

An 84-second, 1920×1080, 60 fps product film recorded from the **real built app**. Nothing on screen is a mockup. The stage page loads `dist/` in an iframe, and Playwright drives it with a real mouse and keyboard. The app handles every hover, click, drag and keystroke itself.

```
npm run build                        # from the repo root: the film records dist/
cd video && npm install && cd demo   # once: playwright-core (uses Playwright's Chromium; set CHROME to override)
node record.mjs sheet 1 0 84         # review: one still per second, tiled into out/demo/sheet-*.jpg
node record.mjs preview              # out/demo/preview.mp4 (30 fps, 1280 wide)
node record.mjs full                 # out/demo/film-silent.mp4 (60 fps, 2 subframes blended)
py audio.py                          # out/demo/film.wav, from the cues the recorder logged
# mux: ffmpeg -i film-silent.mp4 -i film.wav -c:v copy -c:a aac -b:a 256k -shortest notekeeper-demo.mp4
```

## How it stays deterministic

| Source of nondeterminism | Handled by |
| --- | --- |
| Timers, `Date`, `requestAnimationFrame`, `performance` | Playwright `context.clock`, advanced in fixed 1/120 s steps |
| CSS animations and transitions | Every `document.getAnimations()` in the app is paused and seeked to virtual time (`stage.syncAnimations`) |
| React commits (MessageChannel, not faked) | Four MessageChannel round trips after each input and each step (`settle`) |
| The OS-driven caret blink | The native caret is hidden and redrawn on the page clock (`app-inject.js`) |
| `Math.random` (card colors, sticky tilt) | Seeded in `app-inject.js` |
| Fonts from Google | Bundled in `fonts/`; the server swaps the links |
| Lazy canvas chunk | Imported before recording starts |

The camera is a transform on the window that holds the iframe. The app keeps its own coordinate space, so canvas math, Radix portals and hit-testing all work. Text is re-rasterized at every scale, so it stays sharp. The cursor path is planned in app coordinates using minimum-jerk timing with a slight arc. Each step, it is mapped through the camera to a real `page.mouse.move`.

## Product map (what the film shows)

| Area | Real feature used |
| --- | --- |
| Sidebar | Quick views (Pinned), folder tree, **+ New folder** with inline rename, right-click menu → Color submenu (Radix) |
| Focus | Empty state → **New card**; card modal: title, due date popover (Tomorrow preset), checklist (add, tick), color swatches |
| Notebooks | Empty state → **New notebook**; TipTap editor: H2, checklist, **paste an image**, drag the resize handle, autosave ("Saved") |
| Canvas | Now/Next/Later board: drag a sticky between sections, double-click to add a note, **Connector** tool to draw an arrow |
| Links | Card → **Link** → an existing notebook; the linked chip opens it |
| Search | `/` focuses search; mixed results (folders, cards, notebooks); open a card from the results |
| Theme | Sidebar toggle → dark theme across the whole UI |

## Storyboard and timeline (1 bar = 2 s at 120 BPM)

| Time | Shot | On screen | Caption |
| --- | --- | --- | --- |
| 0–6 | Problem | Three serif lines on the warm backdrop: "Tasks here. / Notes there. / Plans somewhere else." | — |
| 6–10 | Reveal | The app window rises in; slow push | One quiet place for notes and plans. |
| 10–13 | Navigate | Click Pinned, then Work | — |
| 13–20 | Organize | New folder "Launch"; right-click → Color → Teal | — |
| 20–37 | Focus | "No cards yet" → New card "Write the launch post"; due Tomorrow; three checklist items, two ticked; color Peach | Know what needs you. |
| 37–50 | Notebook | New notebook "Launch plan"; H2 "Announcement"; checklist; paste an image; resize it | Think it through. |
| 50–63 | Canvas | Goals → Canvas; drag "Nice to have" into Now; add "Book the venue"; connect "Your top priority" → "Up next" | Plan what's next. |
| 63–70 | Connect | Launch → Focus → open the card → Link → Launch plan → open the linked notebook | Everything connected. |
| 70–74 | Search | `/`, type "launch", open the card from the results | Find anything. |
| 74–78 | Theme | Goals canvas → dark theme; the camera widens | — |
| 78–84 | Hero | Pull back; "Notekeeper — Notes and plans, in one quiet place." above the dark board | — |

Every interaction, with its exact time and target, is listed in `timeline.mjs` (`ACTIONS`). Targets are real selectors (aria-labels, roles, visible text, `data-item-id`) and are resolved when the move starts.

## Camera map

The camera keys are `[time, scale, centerX, centerY]` in app coordinates, listed in `timeline.mjs` (`CAM`). Every change is a critically damped spring, so moves never overshoot. The value at any time is the closed-form sum of the springs, which makes it a pure function of t.

- Wide (0.86–1.0) for reveals and section changes.
- Mid (1.2–1.4) for the canvas, the card and search results.
- Close (1.5–1.7) for the tree, the context menu and the notebook's first lines.
- The ending uses a faster spring to widen as the theme flips, then a slow pull-back to 0.64 for the hero.

## Audio map

The track is original, synthesized in `audio.py` at 120 BPM (Am7 – Fmaj7 – Cmaj7 – G6).

| Time | Music |
| --- | --- |
| 0–6 | Pad and sparse keys; riser into a low boom and a whoosh at the reveal (6.0) |
| 6–12 | Half-time kick, bass, light hats |
| 12–50 | Full groove |
| 50–62 | Breakdown for the canvas: no kick, arpeggiated keys; riser back in |
| 62–76 | Full groove plus a bell line |
| 76–84 | Drums out on the theme change; Cmaj9 hero chord with bells at 79.0; fade out |

The UI sounds come from the interactions that actually happened. The recorder logs them to `out/demo/sfx.json` (clicks, key taps, Enter, grabs and drops, the paste pop, and a two-part toggle for the theme switch). Each sound is placed so that its measured peak lands on its cue.
