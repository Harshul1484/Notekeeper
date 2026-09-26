import type { EditorView } from "@tiptap/pm/view";
import { readFileAsDataURL } from "../../lib/util";

/** Images are stored inline in localStorage, so keep each one small. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export const imageFiles = (files: FileList | null | undefined) =>
  Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));

/** Reads an image file as a data URL, or throws a message fit to show the user. */
export async function readImage(file: File) {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`"${file.name}" is over 2 MB. Notes are stored in your browser, so keep images small.`);
  }
  return readFileAsDataURL(file);
}

/** Inserts image files at a document position (or the selection), one after another. */
export async function insertImages(view: EditorView, files: File[], pos?: number, onError?: (msg: string) => void) {
  const { image } = view.state.schema.nodes;
  let at = pos ?? view.state.selection.from;
  for (const file of files) {
    try {
      const src = await readImage(file);
      const node = image.create({ src, alt: file.name });
      view.dispatch(view.state.tr.insert(at, node));
      at += node.nodeSize;
    } catch (err) {
      onError?.((err as Error).message);
    }
  }
}
