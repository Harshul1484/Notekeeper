import {
  RiCloseLine,
  RiComputerLine,
  RiDownloadLine,
  RiMoonLine,
  RiRestartLine,
  RiSunLine,
  RiUploadLine,
} from "@remixicon/react";
import { useRef, useState, type ReactNode } from "react";
import { createSeed, DEFAULT_FOLDER_ID, type SeedData } from "../../data/seed";
import { cn } from "../../lib/util";
import { useData } from "../../store/data";
import { useUI, type ThemePref } from "../../store/ui";
import { IconButton } from "../ui/Buttons";
import { Modal } from "../ui/Modal";

function Row({ title, detail, action }: { title: string; detail: string; action: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-[13.5px] font-medium text-ink">{title}</p>
        <p className="text-[12px] text-muted">{detail}</p>
      </div>
      {action}
    </div>
  );
}

const THEMES: { id: ThemePref; label: string; icon: typeof RiSunLine }[] = [
  { id: "light", label: "Light", icon: RiSunLine },
  { id: "dark", label: "Dark", icon: RiMoonLine },
  { id: "system", label: "System", icon: RiComputerLine },
];

function ThemeSwitch() {
  const theme = useUI((s) => s.theme);
  const set = useUI((s) => s.set);
  return (
    <div role="radiogroup" aria-label="Theme" className="flex shrink-0 rounded-lg border border-line bg-window p-0.5">
      {THEMES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={theme === id}
          onClick={() => set({ theme: id })}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] transition-colors duration-150",
            theme === id ? "bg-panel font-medium text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "text-muted hover:text-ink",
          )}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}

const btn =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-panel px-3 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-line-strong hover:bg-window";

export function SettingsModal() {
  const open = useUI((s) => s.settingsOpen);
  const set = useUI((s) => s.set);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  if (!open) return null;
  const close = () => {
    set({ settingsOpen: false });
    setConfirmReset(false);
    setMessage("");
  };

  const exportData = () => {
    const { folders, cards, notebooks, canvasItems } = useData.getState();
    const blob = new Blob([JSON.stringify({ folders, cards, notebooks, canvasItems }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as SeedData;
      if (!Array.isArray(data.folders) || !Array.isArray(data.cards) || !Array.isArray(data.notebooks)) {
        throw new Error("Missing folders, cards, or notebooks");
      }
      useData.getState().replaceAll({ ...data, canvasItems: data.canvasItems ?? [] });
      const first = data.folders.find((f) => !f.parentId);
      if (first) useUI.getState().openFolder(first.id);
      setMessage(`Imported ${data.folders.length} folders, ${data.cards.length} cards, ${data.notebooks.length} notebooks.`);
    } catch (err) {
      setMessage(`Couldn't import that file: ${(err as Error).message}`);
    }
  };

  return (
    <Modal onClose={close} label="Settings" className="max-w-[540px] rounded-2xl border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="font-serif text-[20px] font-medium">Settings</h2>
        <IconButton aria-label="Close settings" onClick={close}>
          <RiCloseLine size={18} />
        </IconButton>
      </div>
      <div className="divide-y divide-line px-5 pb-2">
        <Row
          title="Appearance"
          detail="System follows your device's light or dark setting."
          action={<ThemeSwitch />}
        />
        <Row
          title="Export"
          detail="Download everything as a JSON backup."
          action={
            <button type="button" className={btn} onClick={exportData}>
              <RiDownloadLine size={15} /> Export
            </button>
          }
        />
        <Row
          title="Import"
          detail="Replace your notes with a backup file."
          action={
            <>
              <button type="button" className={btn} onClick={() => fileRef.current?.click()}>
                <RiUploadLine size={15} /> Import
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importData(f);
                  e.target.value = "";
                }}
              />
            </>
          }
        />
        <Row
          title="Sample data"
          detail="Start over with the sample folders. Your notes will be replaced."
          action={
            confirmReset ? (
              <button
                type="button"
                className="h-8 shrink-0 rounded-lg bg-danger px-3 text-[12.5px] font-medium text-white hover:opacity-90"
                onClick={() => {
                  useData.getState().replaceAll(createSeed());
                  useUI.getState().openFolder(DEFAULT_FOLDER_ID);
                  setConfirmReset(false);
                  setMessage("Sample data restored.");
                }}
              >
                Replace my notes
              </button>
            ) : (
              <button type="button" className={btn} onClick={() => setConfirmReset(true)}>
                <RiRestartLine size={15} /> Reset
              </button>
            )
          }
        />
      </div>
      {message && <p className="border-t border-line px-5 py-3 text-[12.5px] text-ink-2">{message}</p>}
    </Modal>
  );
}
