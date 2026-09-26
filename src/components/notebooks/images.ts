import type { EditorView } from "@tiptap/pm/view";
import { readImage } from "../../lib/images";

export { imageFiles } from "../../lib/images";

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
