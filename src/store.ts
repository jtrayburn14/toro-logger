export interface ListeningEntry {
  uid: string;
  date: string;
  minutes: number;
}

export interface ReadingEntry {
  uid: string;
  date: string;
  book_title: string;
  completion_pct: number;
}

export interface BookDraft {
  title: string;
  total_pages: number;
  total_words: number;
  difficulty: string;
}

export interface State {
  listening: ListeningEntry[];
  reading: ReadingEntry[];
  /** books added on this phone, pending desktop adoption */
  booksNew: BookDraft[];
  /** full catalog seeded from the desktop export */
  books: BookDraft[];
}

const KEY = "toro-logger-v1";

const EMPTY: State = {
  listening: [],
  reading: [],
  booksNew: [],
  books: [],
};

export function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      listening: parsed.listening ?? [],
      reading: parsed.reading ?? [],
      booksNew: parsed.booksNew ?? [],
      books: parsed.books ?? [],
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

let state: State = load();

export function getState(): State {
  return state;
}

export function save(): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function isoOf(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function todayIso(): string {
  return isoOf(new Date());
}

/** you always log yesterday's sessions — this is the sensible default */
export function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoOf(d);
}

function uid(): string {
  return crypto.randomUUID();
}

/** returns an error message, or null on success */
export function addListening(date: string, minutesRaw: string): string | null {
  const minutes = Number(minutesRaw);
  if (!date) return "Pick a date.";
  if (!Number.isFinite(minutes) || minutes <= 0)
    return "Minutes must be a positive number.";
  state.listening.push({ uid: uid(), date, minutes: Math.round(minutes) });
  save();
  return null;
}

export function addReading(
  date: string,
  title: string,
  pctRaw: string,
): string | null {
  const pct = Number(pctRaw);
  if (!date) return "Pick a date.";
  const book_title = title.trim();
  if (!book_title) return "Book title is required.";
  if (!Number.isFinite(pct) || pct < 0 || pct > 100)
    return "Completion must be between 0 and 100.";
  state.reading.push({
    uid: uid(),
    date,
    book_title,
    completion_pct: Math.round(pct * 10) / 10,
  });
  save();
  return null;
}

export function addBook(
  title: string,
  pagesRaw: string,
  wordsRaw: string,
  difficulty: string,
): string | null {
  const clean = title.trim();
  if (!clean) return "Title is required.";
  const total_pages = Number(pagesRaw);
  const total_words = Number(wordsRaw);
  if (!Number.isFinite(total_pages) || total_pages < 1)
    return "Pages must be at least 1.";
  if (!Number.isFinite(total_words) || total_words < 1)
    return "Words must be at least 1.";
  if (bookExists(clean)) return `"${clean}" is already in your list.`;
  state.booksNew.push({
    title: clean,
    total_pages: Math.round(total_pages),
    total_words: Math.round(total_words),
    difficulty,
  });
  save();
  return null;
}

/** all known titles — catalog + phone additions */
export function allTitles(): string[] {
  const seen = new Set<string>();
  for (const b of [...state.books, ...state.booksNew]) seen.add(b.title);
  return [...seen];
}

export function bookExists(title: string): boolean {
  const t = title.trim().toLowerCase();
  return allTitles().some((k) => k.toLowerCase() === t);
}

export function importCatalog(catalog: BookDraft[]): void {
  state.books = catalog;
  // anything previously "new" that made it into the real catalog is settled
  state.booksNew = state.booksNew.filter(
    (b) => !catalog.some((c) => c.title.toLowerCase() === b.title.toLowerCase()),
  );
  save();
}
