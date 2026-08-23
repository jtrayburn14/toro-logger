import type { BookDraft, State } from "./store";

const VERSION = 1;

interface SyncFile {
  version: number;
  books: BookDraft[];
  listening: unknown[];
  reading: unknown[];
  books_new: BookDraft[];
}

/**
 * The file we hand to Drive. Phone-owned sections carry everything this
 * device has ever created — the desktop dedupes by uid, so resending
 * history is safe and keeps this side dead simple.
 */
export function buildSyncFile(state: State): string {
  const file: SyncFile = {
    version: VERSION,
    books: state.books,
    listening: state.listening,
    reading: state.reading,
    books_new: state.booksNew,
  };
  return JSON.stringify(file, null, 2);
}

export function download(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type ShareResult = "shared" | "downloaded" | "cancelled";

/**
 * iOS: hands the file to the share sheet ("Save to Drive" is one tap).
 * Falls back to a plain download where the Share API can't take files.
 */
export async function shareOrDownload(
  filename: string,
  contents: string,
): Promise<ShareResult> {
  const file = new File([contents], filename, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Toro sync" });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError")
        return "cancelled"; // user dismissed the sheet
      // share failed oddly — fall through to download
    }
  }
  download(filename, contents);
  return "downloaded";
}

export class ParseError extends Error {}

function isBookDraft(b: unknown): b is BookDraft {
  if (!b || typeof b !== "object") return false;
  const o = b as Record<string, unknown>;
  return (
    typeof o.title === "string" &&
    Number.isFinite(o.total_pages) &&
    Number.isFinite(o.total_words) &&
    typeof o.difficulty === "string"
  );
}

/** reads only the desktop-owned `books` catalog; ignores everything else */
export function parseCatalog(text: string): BookDraft[] {
  // Google Drive / iOS exports sometimes prepend a BOM — strip it
  let file: SyncFile;
  try {
    file = JSON.parse(text.replace(/^\uFEFF/, "").trim()) as SyncFile;
  } catch {
    throw new ParseError("Not valid JSON — is this toro-sync.json?");
  }
  if (!file || typeof file !== "object")
    throw new ParseError("Unexpected file contents.");
  if (Array.isArray(file.books)) return file.books.filter(isBookDraft);
  // a sync file from our own exporter always carries books; tolerate an
  // empty catalog rather than hard-failing on a family-resembling file
  if (Array.isArray(file.listening) && Array.isArray(file.reading)) return [];
  throw new ParseError(
    `No "books" array found (file keys: ${Object.keys(file).join(", ") || "none"}).`,
  );
}
