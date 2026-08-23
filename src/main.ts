import "./style.css";
import {
  addBook,
  addListening,
  addReading,
  allTitles,
  getState,
  importCatalog,
  todayIso,
  yesterdayIso,
} from "./store";
import { ParseError, buildSyncFile, parseCatalog, shareOrDownload } from "./sync";

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;
const input = (id: string): HTMLInputElement =>
  document.getElementById(id) as HTMLInputElement;
const select = (id: string): HTMLSelectElement =>
  document.getElementById(id) as HTMLSelectElement;

function setStatus(id: string, msg: string, kind: "ok" | "error" | "plain") {
  const el = $(id);
  el.textContent = msg;
  el.classList.toggle("ok", kind === "ok");
  el.classList.toggle("error", kind === "error");
}

function renderBooks() {
  $("book-options").innerHTML = allTitles()
    .map((t) => `<option value="${t.replace(/"/g, "&quot;")}"></option>`)
    .join("");
}

const MAX_RECENT = 5;

function renderListening() {
  const items = getState().listening.slice(-MAX_RECENT).reverse();
  $("l-list").innerHTML = items
    .map(
      (e) =>
        `<li><span>${e.minutes} min</span><span class="when">${e.date}</span></li>`,
    )
    .join("");
}

function renderReading() {
  const items = getState().reading.slice(-MAX_RECENT).reverse();
  $("r-list").innerHTML = items
    .map(
      (e) =>
        `<li><span>${e.book_title} — ${e.completion_pct}%</span><span class="when">${e.date}</span></li>`,
    )
    .join("");
}

// you log yesterday's sessions — default both date fields to yesterday
input("l-date").value = yesterdayIso();
input("r-date").value = yesterdayIso();

$("listening-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const err = addListening(input("l-date").value, input("l-minutes").value);
  if (err) return setStatus("l-status", err, "error");
  setStatus("l-status", "Added ✓", "ok");
  input("l-minutes").value = "";
  renderListening();
});

$("reading-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const err = addReading(
    input("r-date").value,
    input("r-book").value,
    input("r-pct").value,
  );
  if (err) return setStatus("r-status", err, "error");
  setStatus("r-status", "Added ✓", "ok");
  input("r-pct").value = "";
  renderReading();
});

$("book-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const err = addBook(
    input("b-title").value,
    input("b-pages").value,
    input("b-words").value,
    select("b-difficulty").value,
  );
  if (err) return setStatus("b-status", err, "error");
  setStatus("b-status", `Added ✓ (${getState().booksNew.length} pending sync)`, "ok");
  input("b-title").value = "";
  input("b-pages").value = "";
  input("b-words").value = "";
  renderBooks();
});

$("export-btn").addEventListener("click", async () => {
  const s = getState();
  const result = await shareOrDownload(
    `toro-sync-${todayIso()}.json`,
    buildSyncFile(s),
  );
  if (result === "cancelled") {
    setStatus("sync-status", "", "plain");
    return;
  }
  setStatus(
    "sync-status",
    result === "shared"
      ? "Handed off — pick Save to Drive."
      : `Exported ${s.listening.length} listening, ${s.reading.length} reading, ${s.booksNew.length} new book(s). Save it to Drive.`,
    "ok",
  );
});

$("import-input").addEventListener("change", async (ev) => {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const catalog = parseCatalog(await file.text());
    importCatalog(catalog);
    renderBooks();
    setStatus("sync-status", `Imported ${catalog.length} books.`, "ok");
  } catch (e) {
    const msg = e instanceof ParseError ? e.message : "Could not read file.";
    setStatus("sync-status", msg, "error");
  }
  input.value = "";
});

renderBooks();
renderListening();
renderReading();

if ("serviceWorker" in navigator && !location.hostname.startsWith("localhost")) {
  navigator.serviceWorker.register("./sw.js");
}
