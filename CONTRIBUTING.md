# Contributing to Notekeeper

Thanks for helping make Notekeeper better. Bug fixes, small improvements, and documentation are all welcome. This guide covers how to set up the project, what a good change looks like, and how to get it merged.

## Before you start

- **Small fixes** (a typo, a clear bug, a spacing glitch): open a pull request directly.
- **Anything larger** (a new feature, a new dependency, a change to how data is stored): open an issue first, or comment on an existing one, so we can agree on the approach before you write code.
- **Cloud sync** is planned in [issue #2](https://github.com/Harshul1484/Notekeeper/issues/2). Please discuss sync-related work there.

## Set up the project

You'll need [Node.js](https://nodejs.org) 20.19+ or 22.12+, and npm. The project uses `package-lock.json`, so please don't commit lockfiles from yarn, pnpm or bun.

```bash
git clone https://github.com/Harshul1484/Notekeeper.git
cd Notekeeper
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server with hot reload |
| `npm run typecheck` | Runs TypeScript only |
| `npm run build` | Typechecks and builds to `dist/` |
| `npm run preview` | Serves the production build |

Notes are saved in your browser's `localStorage`. To start fresh, use **Settings → Sample data → Reset**, or clear the site data for `localhost:5173`.

## Make your change

1. Create a branch from `main` with a short, descriptive name, such as `fix-folder-menu-position` or `canvas-image-paste`.
2. Keep each pull request to one topic. Two unrelated fixes are easier to review as two pull requests.
3. Follow the [code conventions](#code-conventions) below.
4. Run the checks in [Before you open a pull request](#before-you-open-a-pull-request).

## Code conventions

These describe how the existing code is written; new code should read the same way.

### TypeScript

- The project runs in `strict` mode, with `noUnusedLocals` and `noUnusedParameters`. Don't use `any`, `@ts-ignore` or non-null assertions to silence an error; fix the type instead.
- Shared types live in `src/types.ts`.

### Where code goes

```text
src/
  components/
    layout/      app shell: sidebar, folder tree, settings, search
    folder/      folder header, tabs, quick views
    focus/       cards and the card window
    notebooks/   notebook list and editor (TipTap)
    canvas/      the canvas board
    ui/          shared primitives: Modal, Popover, Tooltip, buttons, date picker
  store/         data.ts (notes), ui.ts (view state), actions.ts, selectors.ts
  hooks/         shared React hooks
  lib/           pure helpers: dates, colors, routes, images
  data/seed.ts   the starter content for first launch
  index.css      design tokens for the light and dark themes
```

### State and data

- Notes live in the `useData` store (`src/store/data.ts`); view state lives in `useUI` (`src/store/ui.ts`). Change notes only through store actions, never by writing `localStorage` directly.
- Store updates must stay immutable (return new arrays and objects). Other code relies on object identity to tell what changed.
- **Changing the saved data shape** (renaming a field, adding a required one) needs a migration: bump `version` in the `persist` options of `data.ts` and handle the old shape in `migrate`. People's existing notes must keep loading.
- Starter content ids in `src/data/seed.ts` (such as `f-start` and `c-welcome`) must not change, because saved data and the planned sync depend on them.

### Styling and UI

- Style with Tailwind utility classes and the design tokens in `src/index.css`. Don't hard-code hex colors in components; add or reuse a token.
- Every new token needs a value in both themes: `:root` for light and `:root[data-theme="dark"]` for dark.
- Build dialogs, menus, popovers and tooltips with the existing Radix-based wrappers (`Modal`, `Popover`, `Tooltip`, `FolderMenu`) instead of hand-made overlays.
- Use icons from `@remixicon/react` only.
- Write interface text in sentence case and plain words ("New notebook", not "Create New Notebook").

### Accessibility

- Every icon-only button needs an `aria-label` and a `Tooltip`.
- Everything must work with the keyboard, with a visible focus ring.
- Check contrast in both themes.

### Performance and dependencies

- Ask in an issue before adding a dependency, and say why an existing one or a few lines of code won't do.
- Keep the first load small. Large or rarely used features load on demand (see how `CanvasTab` is lazy-loaded and how `vite.config.ts` splits vendor chunks).

### Comments

Explain *why*, not *what*. A comment is worth adding when the code does something a reader wouldn't expect, such as a workaround or a browser quirk.

## Before you open a pull request

There are no automated tests yet, so please run these checks yourself:

- [ ] `npm run build` passes with no TypeScript errors.
- [ ] The change works in the **light and dark** themes.
- [ ] It works at **desktop and phone widths**. The layout switches at 768 px; use your browser's device toolbar.
- [ ] Keyboard use still works: `Tab` through the change, and `Esc` closes what it opened.
- [ ] Existing notes still load after your change: reload with data from `main` still in `localStorage`.
- [ ] The README is updated if you changed a feature, a shortcut or a command.

## Commit messages

Match the existing history:

- The subject is imperative and in sentence case, with no trailing period, and about 72 characters at most: "Fix folder menu jumping to the corner when the pointer leaves the row".
- If the change needs explaining, add a body after a blank line, wrapped at 72 characters, that says what was wrong and why this fixes it.
- Don't use prefixes like `feat:` or `fix:`.

```text
Fix folder menu jumping to the corner when the pointer leaves the row

The ⋯ button stayed visible only via data-state=open, but its tooltip
writes data-state=closed to the same element once the pointer leaves the
row. Key visibility to aria-expanded instead.
```

## Pull requests

- Give the pull request a title in the same style as a commit subject.
- In the description, say **what** changed and **why**, and link the issue ("Closes #12").
- For visual changes, add before and after screenshots in the light and dark themes.
- Keep the branch up to date with `main`. A maintainer will review, may ask for changes, and merges once it's ready.

## Reporting bugs

Open an issue with:

- the steps to reproduce it,
- what you expected and what happened instead,
- your browser and version, the theme, and whether you're on desktop or phone,
- a screenshot or short recording if it's visual.

Please don't paste your personal notes into issues. If a bug needs data to reproduce, make a small example with **Settings → Export** from a fresh set of notes.

## Security issues

Please don't report security problems in a public issue. Use **Report a vulnerability** under the repository's **Security** tab, so it can be fixed before it's public.

## Be kind

Be respectful and assume good intent in issues, reviews and discussions. Harassment or personal attacks aren't accepted.
