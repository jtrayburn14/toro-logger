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

export class ParseError extends Error {}

/** reads only the desktop-owned `books` catalog; ignores everything else */
export function parseCatalog(text: string): BookDraft[] {
  let file: SyncFile;
  try {
    file = JSON.parse(text) as SyncFile;
  } catch {
    throw new ParseError("Not valid JSON — is this toro-sync.json?");
  }
  if (!file || typeof file !== "object" || !Array.isArray(file.books))
    throw new ParseError('No "books" array found.');
  return file.books.filter((b) => {
    return (
      typeof b?.title === "string" &&
      Number.isFinite(b?.total_pages) &&
      Number.isFinite(b?.total_words) &&
      typeof b?.difficulty === "string"
    );
  });
}
