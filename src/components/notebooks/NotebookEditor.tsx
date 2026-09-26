import {
  RiArrowLeftLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiPaletteLine,
  RiPushpinFill,
  RiPushpinLine,
} from "@remixicon/react";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo, useRef, useState } from "react";
import { folderDot, pastelBg, PASTELS } from "../../lib/colors";
import { formatDate, relativeTime } from "../../lib/date";
import { cn, htmlToText } from "../../lib/util";
import { useData } from "../../store/data";
import { useUI } from "../../store/ui";
import { IconButton } from "../ui/Buttons";
import { Tooltip } from "../ui/Tooltip";
import { ColorSwatches } from "../ui/ColorSwatches";
import { Popover } from "../ui/Popover";
import { TagEditor } from "../ui/TagEditor";
import { EditorToolbar } from "./EditorToolbar";
import { imageFiles, insertImages } from "./images";

const SAVE_DELAY = 500;

type SaveState = "saved" | "saving";

function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <span
      aria-live="polite"
      className={cn(
        "flex items-center gap-1 text-[12px] transition-colors duration-200",
        state === "saving" ? "text-subtle" : "text-muted",
      )}
    >
      {state === "saving" ? (
        "Saving…"
      ) : (
        <>
          <RiCheckLine size={14} /> Saved
        </>
      )}
    </span>
  );
}

export function NotebookEditor({ notebookId }: { notebookId: string }) {
  const notebook = useData((s) => s.notebooks.find((n) => n.id === notebookId))!;
  const folder = useData((s) => s.folders.find((f) => f.id === notebook.folderId));
  const allNotebooks = useData((s) => s.notebooks);
  const { updateNotebook, deleteNotebook } = useData.getState();
  const set = useUI((s) => s.set);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<number | null>(null);
  const showNotice = (msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 5000);
  };
  const pending = useRef<number | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      // Uploaded images are stored inline as data URLs; without this they'd be dropped on reload.
      Image.configure({ allowBase64: true }),
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: notebook.content,
    editorProps: {
      attributes: { class: "notes-prose", "aria-label": "Notebook content" },
      // Images pasted or dropped from the device go straight into the note.
      handlePaste: (view, event) => {
        const files = imageFiles(event.clipboardData?.files);
        if (!files.length) return false;
        void insertImages(view, files, undefined, showNotice);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = moved ? [] : imageFiles(event.dataTransfer?.files);
        if (!files.length) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insertImages(view, files, pos, showNotice);
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      setSaveState("saving");
      if (pending.current) window.clearTimeout(pending.current);
      pending.current = window.setTimeout(() => {
        pending.current = null;
        updateNotebook(notebookId, { content: e.getHTML() });
        setSaveState("saved");
      }, SAVE_DELAY);
    },
  });

  // Flush unsaved edits when leaving; discard notebooks that were never touched.
  useEffect(() => {
    return () => {
      if (pending.current && editor) {
        window.clearTimeout(pending.current);
        useData.getState().updateNotebook(notebookId, { content: editor.getHTML() });
      }
      window.setTimeout(() => {
        if (useUI.getState().openNotebookId === notebookId) return; // remounted (StrictMode)
        const nb = useData.getState().notebooks.find((n) => n.id === notebookId);
        if (nb && !nb.title.trim() && !htmlToText(nb.content) && !nb.tags.length) {
          useData.getState().deleteNotebook(notebookId);
        }
      });
    };
  }, [editor, notebookId]);

  useEffect(() => {
    if (!notebook.title) titleRef.current?.focus();
    document.getElementById("main")?.scrollTo({ top: 0 });
  }, []);

  // Grow the title textarea with its content.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [notebook.title]);

  const tagSuggestions = useMemo(() => [...new Set(allNotebooks.flatMap((n) => n.tags))].sort(), [allNotebooks]);
  const back = () => set({ openNotebookId: null });

  const flashSaved = () => {
    setSaveState("saving");
    window.setTimeout(() => setSaveState("saved"), 300);
  };

  return (
    <div className="anim-rise min-h-full px-4 pt-4 pb-16 sm:px-6 md:px-10">
      <div className="mx-auto flex max-w-[780px] items-center gap-2">
        <button
          type="button"
          onClick={back}
          className="-ml-2 flex h-8 min-w-0 items-center gap-1.5 rounded-lg px-2 text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
        >
          <RiArrowLeftLine size={16} className="shrink-0" />
          {folder && <span className="size-2 shrink-0 rounded-full" style={{ background: folderDot(folder.color) }} />}
          <span className="truncate">{folder?.name ?? "Back"}</span>
        </button>
        <div className="ml-auto flex items-center gap-1">
          {notice && (
            <Tooltip label={notice} side="bottom">
              <span role="alert" className="anim-fade mr-2 max-w-[340px] truncate text-[12px] text-danger">
                {notice}
              </span>
            </Tooltip>
          )}
          <SaveIndicator state={saveState} />
          <IconButton
            aria-label={notebook.pinned ? "Unpin notebook" : "Pin notebook"}
            title={notebook.pinned ? "Unpin" : "Pin"}
            onClick={() => updateNotebook(notebookId, { pinned: !notebook.pinned })}
          >
            {notebook.pinned ? <RiPushpinFill size={16} /> : <RiPushpinLine size={16} />}
          </IconButton>
          <Popover
            align="end"
            trigger={({ toggle }) => (
              <IconButton aria-label="Notebook color" title="Color" onClick={toggle}>
                <RiPaletteLine size={16} />
              </IconButton>
            )}
          >
            {() => (
              <div className="p-1.5">
                <ColorSwatches
                  colors={PASTELS}
                  value={notebook.color}
                  toCss={pastelBg}
                  onChange={(color) => updateNotebook(notebookId, { color })}
                />
              </div>
            )}
          </Popover>
          {confirmDelete ? (
            <span className="flex items-center gap-1">
              <button
                type="button"
                autoFocus
                onClick={() => {
                  back();
                  deleteNotebook(notebookId);
                }}
                className="h-8 rounded-lg bg-danger px-3 text-[12.5px] font-medium text-white hover:opacity-90"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-8 rounded-lg px-2 text-[12.5px] text-ink-2 hover:bg-hover"
              >
                Cancel
              </button>
            </span>
          ) : (
            <IconButton aria-label="Delete notebook" title="Delete" onClick={() => setConfirmDelete(true)}>
              <RiDeleteBinLine size={16} />
            </IconButton>
          )}
        </div>
      </div>

      <article className="mx-auto mt-6 max-w-[780px] md:mt-10">
        <div className="mb-3 h-1.5 w-12 rounded-full" style={{ background: pastelBg(notebook.color) }} />
        <textarea
          ref={titleRef}
          rows={1}
          value={notebook.title}
          placeholder="Untitled"
          aria-label="Notebook title"
          onChange={(e) => {
            updateNotebook(notebookId, { title: e.target.value.replace(/\n/g, " ") });
            flashSaved();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              editor?.commands.focus("start");
            }
          }}
          className="block w-full resize-none overflow-hidden bg-transparent font-serif text-[32px] leading-[1.15] font-medium tracking-[-0.01em] text-ink outline-none placeholder:text-subtle md:text-[40px]"
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <TagEditor
            className="min-w-0 flex-1"
            tags={notebook.tags}
            suggestions={tagSuggestions}
            onChange={(tags) => {
              updateNotebook(notebookId, { tags });
              flashSaved();
            }}
          />
          <p className="shrink-0 text-[12px] text-subtle">
            Created {formatDate(notebook.createdAt)} · Edited {relativeTime(notebook.updatedAt)}
          </p>
        </div>

        {editor && (
          <div className="sticky top-0 z-10 -mx-1 mt-5 bg-window/85 px-1 pt-2 pb-2 backdrop-blur-sm">
            <EditorToolbar editor={editor} />
          </div>
        )}
        <div className="mt-4 cursor-text" onClick={(e) => e.target === e.currentTarget && editor?.commands.focus("end")}>
          <EditorContent editor={editor} />
        </div>
      </article>
    </div>
  );
}
