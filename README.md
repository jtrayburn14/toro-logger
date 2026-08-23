# toro-logger

Minimal PWA for logging Spanish listening/reading from a phone, feeding the
[Toro](https://github.com/jtrayburn14/toro) desktop app via a JSON file passed
through Google Drive. No accounts, no backend, no network calls.

## Flow

1. Log entries on the phone (stored in localStorage)
2. **Export sync file** → save `toro-sync.json` to Google Drive
3. Desktop Toro ▸ Manage ▸ Mobile Sync → import that file (deduped by uid)

Book catalog flows the other way: desktop **Export catalog** writes
`toro-sync.json`, phone's *Import book catalog* reads just the `books` section.

## Dev

```bash
npm install
npm run dev      # local dev (no service worker on localhost)
npm run build    # dist/
```

Deploy: push to `main` → GitHub Actions publishes to Pages
(enable Pages → Source: GitHub Actions once).

**Important:** add to Home Screen after first visit — iOS wipes storage of
non-installed web apps after 7 days idle.
