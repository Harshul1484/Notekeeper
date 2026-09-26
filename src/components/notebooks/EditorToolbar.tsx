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
  type RemixiconComponentType,
} from "@remixicon/react";
import { useEditorState, type Editor } from "@tiptap/react";
import { useRef, useState } from "react";
import { cn, readFileAsDataURL } from "../../lib/util";
import { Popover } from "../ui/Popover";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function ToolButton({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: RemixiconComponentType;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
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
      className="w-[280px] p-2"
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
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!src.trim()) return;
            editor.chain().focus().setImage({ src: src.trim() }).run();
            setSrc("");
            close();
          }}
        >
          <input
            autoFocus
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            placeholder="Image URL"
            aria-label="Image URL"
            className="h-8 rounded-lg border border-line bg-window px-2.5 text-[13px] outline-none focus:border-line-strong"
          />
          {error && <p className="text-[12px] text-danger">{error}</p>}
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="h-7 rounded-lg px-2 text-[12.5px] text-ink-2 hover:bg-hover"
            >
              Upload from device
            </button>
            <button type="submit" className="h-7 rounded-lg bg-ink-button px-3 text-[12.5px] font-medium text-window">
              Insert
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size > MAX_IMAGE_BYTES) {
                setError("That image is over 2 MB. Notes are stored in your browser, so keep images small.");
                return;
              }
              editor.chain().focus().setImage({ src: await readFileAsDataURL(file), alt: file.name }).run();
              close();
            }}
          />
        </form>
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
      <ToolButton icon={RiH1} label="Heading 1" active={s.h1} onClick={() => c().toggleHeading({ level: 1 }).run()} />
      <ToolButton icon={RiH2} label="Heading 2" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()} />
      <ToolButton icon={RiH3} label="Heading 3" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()} />
      <Divider />
      <ToolButton icon={RiBold} label="Bold" active={s.bold} onClick={() => c().toggleBold().run()} />
      <ToolButton icon={RiItalic} label="Italic" active={s.italic} onClick={() => c().toggleItalic().run()} />
      <ToolButton icon={RiStrikethrough} label="Strikethrough" active={s.strike} onClick={() => c().toggleStrike().run()} />
      <ToolButton icon={RiCodeLine} label="Inline code" active={s.code} onClick={() => c().toggleCode().run()} />
      <LinkPopover editor={editor} active={s.link} />
      <Divider />
      <ToolButton icon={RiListUnordered} label="Bulleted list" active={s.bullet} onClick={() => c().toggleBulletList().run()} />
      <ToolButton icon={RiListOrdered2} label="Numbered list" active={s.ordered} onClick={() => c().toggleOrderedList().run()} />
      <ToolButton icon={RiListCheck3} label="Checklist" active={s.task} onClick={() => c().toggleTaskList().run()} />
      <ToolButton icon={RiDoubleQuotesL} label="Quote" active={s.quote} onClick={() => c().toggleBlockquote().run()} />
      <ToolButton icon={RiCodeBoxLine} label="Code block" active={s.codeBlock} onClick={() => c().toggleCodeBlock().run()} />
      <ImagePopover editor={editor} />
      <Divider />
      <ToolButton icon={RiArrowGoBackLine} label="Undo" disabled={!s.canUndo} onClick={() => c().undo().run()} />
      <ToolButton icon={RiArrowGoForwardLine} label="Redo" disabled={!s.canRedo} onClick={() => c().redo().run()} />
    </div>
  );
}
