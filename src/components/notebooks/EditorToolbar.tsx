import {
  RiArrowGoBackLine,
  RiArrowGoForwardLine,
  RiBold,
  RiCodeBoxLine,
  RiCodeLine,
  RiDoubleQuotesL,
  RiH1,
  RiH2,
  RiH3,
  RiImageLine,
  RiItalic,
  RiLinkM,
  RiListCheck3,
  RiListOrdered2,
  RiListUnordered,
  RiStrikethrough,
  RiUploadCloud2Line,
  type RemixiconComponentType,
} from "@remixicon/react";
import { useEditorState, type Editor } from "@tiptap/react";
import { useRef, useState } from "react";
import { cn } from "../../lib/util";
import { Popover } from "../ui/Popover";
import { Tooltip } from "../ui/Tooltip";
import { imageFiles, insertImages } from "./images";

function ToolButton({
  icon: Icon,
  label,
  shortcut,
  active,
  disabled,
  onClick,
}: {
  icon: RemixiconComponentType;
  label: string;
  /** TipTap's built-in keybinding, shown in the tooltip. */
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip label={label} shortcut={shortcut}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-150 disabled:opacity-35",
          active ? "bg-active text-ink" : "text-ink-2 hover:bg-hover hover:text-ink",
        )}
      >
        <Icon size={16} />
      </button>
    </Tooltip>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px shrink-0 bg-line" />;

function LinkPopover({ editor, active }: { editor: Editor; active: boolean }) {
  const [href, setHref] = useState("");
  return (
    <Popover
      className="w-[280px] p-2"
      trigger={({ toggle }) => (
        <ToolButton
          icon={RiLinkM}
          label="Link"
          active={active}
          onClick={() => {
            setHref(editor.getAttributes("link").href ?? "");
            toggle();
          }}
        />
      )}
    >
      {(close) => (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const url = href.trim();
            const chain = editor.chain().focus().extendMarkRange("link");
            if (!url) chain.unsetLink().run();
            else chain.setLink({ href: /^(https?:|mailto:|\/)/.test(url) ? url : `https://${url}` }).run();
            close();
          }}
        >
          <input
            autoFocus
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="Paste a link"
            aria-label="Link URL"
            className="h-8 rounded-lg border border-line bg-window px-2.5 text-[13px] outline-none focus:border-line-strong"
          />
          <div className="flex justify-end gap-1.5">
            {active && (
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().extendMarkRange("link").unsetLink().run();
                  close();
                }}
                className="h-7 rounded-lg px-2.5 text-[12.5px] text-danger hover:bg-danger/10"
              >
                Remove
              </button>
            )}
            <button type="submit" className="h-7 rounded-lg bg-ink-button px-3 text-[12.5px] font-medium text-window">
              Apply
            </button>
          </div>
        </form>
      )}
    </Popover>
  );
}

function ImagePopover({ editor }: { editor: Editor }) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <Popover
      className="w-[300px] p-3"
      trigger={({ toggle }) => (
        <ToolButton
          icon={RiImageLine}
          label="Image"
          onClick={() => {
            setError("");
            toggle();
          }}
        />
      )}
    >
      {(close) => (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-[88px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line-strong bg-window text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink"
          >
            <RiUploadCloud2Line size={20} className="text-muted" />
            <span className="text-[13px] font-medium">Upload from device</span>
            <span className="text-[11.5px] text-subtle">PNG, JPG, GIF or WebP, up to 2 MB each</span>
          </button>

          <div className="flex items-center gap-2 text-[11.5px] text-subtle">
            <span className="h-px flex-1 bg-line" />
            or paste a link
            <span className="h-px flex-1 bg-line" />
          </div>

          <form
            className="flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!src.trim()) return;
              editor.chain().focus().setImage({ src: src.trim() }).run();
              setSrc("");
              close();
            }}
          >
            <input
              value={src}
              onChange={(e) => setSrc(e.target.value)}
              placeholder="https://…"
              aria-label="Image URL"
              className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-window px-2.5 text-[13px] outline-none focus:border-line-strong"
            />
            <button
              type="submit"
              disabled={!src.trim()}
              className="h-8 shrink-0 rounded-lg bg-ink-button px-3 text-[12.5px] font-medium text-window disabled:opacity-40"
            >
              Insert
            </button>
          </form>

          {error && <p className="text-[12px] leading-snug text-danger">{error}</p>}
          <p className="text-[11.5px] leading-snug text-subtle">You can also paste or drag images straight into the note.</p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={async (e) => {
              const files = imageFiles(e.target.files);
              e.target.value = "";
              if (!files.length) return;
              let failed = "";
              await insertImages(editor.view, files, undefined, (msg) => (failed = msg));
              if (failed) return setError(failed);
              editor.commands.focus();
              close();
            }}
          />
        </div>
      )}
    </Popover>
  );
}

export function EditorToolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="scroll-soft flex items-center overflow-x-auto rounded-xl border border-line bg-panel/95 p-1 backdrop-blur"
    >
      <ToolButton icon={RiH1} label="Heading 1" shortcut="Mod+Alt+1" active={s.h1} onClick={() => c().toggleHeading({ level: 1 }).run()} />
      <ToolButton icon={RiH2} label="Heading 2" shortcut="Mod+Alt+2" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()} />
      <ToolButton icon={RiH3} label="Heading 3" shortcut="Mod+Alt+3" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()} />
      <Divider />
      <ToolButton icon={RiBold} label="Bold" shortcut="Mod+B" active={s.bold} onClick={() => c().toggleBold().run()} />
      <ToolButton icon={RiItalic} label="Italic" shortcut="Mod+I" active={s.italic} onClick={() => c().toggleItalic().run()} />
      <ToolButton icon={RiStrikethrough} label="Strikethrough" shortcut="Mod+Shift+S" active={s.strike} onClick={() => c().toggleStrike().run()} />
      <ToolButton icon={RiCodeLine} label="Inline code" shortcut="Mod+E" active={s.code} onClick={() => c().toggleCode().run()} />
      <LinkPopover editor={editor} active={s.link} />
      <Divider />
      <ToolButton icon={RiListUnordered} label="Bulleted list" shortcut="Mod+Shift+8" active={s.bullet} onClick={() => c().toggleBulletList().run()} />
      <ToolButton icon={RiListOrdered2} label="Numbered list" shortcut="Mod+Shift+7" active={s.ordered} onClick={() => c().toggleOrderedList().run()} />
      <ToolButton icon={RiListCheck3} label="Checklist" shortcut="Mod+Shift+9" active={s.task} onClick={() => c().toggleTaskList().run()} />
      <ToolButton icon={RiDoubleQuotesL} label="Quote" shortcut="Mod+Shift+B" active={s.quote} onClick={() => c().toggleBlockquote().run()} />
      <ToolButton icon={RiCodeBoxLine} label="Code block" shortcut="Mod+Alt+C" active={s.codeBlock} onClick={() => c().toggleCodeBlock().run()} />
      <ImagePopover editor={editor} />
      <Divider />
      <ToolButton icon={RiArrowGoBackLine} label="Undo" shortcut="Mod+Z" disabled={!s.canUndo} onClick={() => c().undo().run()} />
      <ToolButton icon={RiArrowGoForwardLine} label="Redo" shortcut="Mod+Shift+Z" disabled={!s.canRedo} onClick={() => c().redo().run()} />
    </div>
  );
}
