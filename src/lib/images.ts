import { readFileAsDataURL } from "./util";

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

/** Natural pixel size of an image source. */
export const imageSize = (src: string) =>
  new Promise<{ w: number; h: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 320, h: img.naturalHeight || 240 });
    img.onerror = () => resolve({ w: 320, h: 240 });
    img.src = src;
  });
