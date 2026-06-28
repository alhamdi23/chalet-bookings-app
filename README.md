# Chalet Booking Admin

A standalone, single-admin web app to manage chalet **bookings**, **operation
costs**, and a **business dashboard**. It runs entirely in the browser — no
server or database to maintain. Data is stored locally (offline-first) and can
optionally sync to **your own Google Sheet** via a free Google Apps Script.
It installs as a PWA on iPhone and desktop.

## Features

- **Calendar** — month view with quick navigation; click any day to add/edit
  bookings. Multiple bookings per day, color-coded by status (Confirmed,
  Pending Payment, Cancelled, Rescheduled, Blocked). Multi-night bookings span
  their full date range. Block days for maintenance/service.
- **Bookings** — customer details, check-in/out, price, insurance/deposit,
  auto-calculated total, notes, and status.
- **Operation Costs** — record costs (water, electricity, housekeeper, …) with a
  configurable list of cost types; filter by date range with running totals.
- **Dashboard** — date-range KPIs (booked nights, occupancy %, revenue, costs,
  net profit, insurance held, busiest weekday) and charts (revenue vs costs,
  booked nights by weekday, status breakdown, costs by type).
- **Currency** — Omani Rial (OMR) with 3 decimal places (baisa).
- **Offline + cloud** — works offline via `localStorage`; optional Google Sheets
  sync with last-write-wins merging.

## Run locally on Windows

Prerequisites: [Node.js 20+](https://nodejs.org).

```powershell
npm install
npm run dev
```

Open the printed URL (typically <http://localhost:5173>) in your browser.

To produce an optimized build and preview it:

```powershell
npm run build
npm run preview
```

## Use on your iPhone

The app needs an https address your phone can reach. The simplest free option
is GitHub Pages:

1. Create a GitHub repository and push this project to the `main` branch.
2. In the repo: **Settings → Pages → Build and deployment → Source → GitHub
   Actions**.
3. The included workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml))
   builds and publishes automatically on every push.
4. Open the published URL in **Safari** on your iPhone, then **Share → Add to
   Home Screen**. It launches full-screen like a native app.

The same URL works on your PC browser too.

## Google Sheets sync (optional)

Follow [apps-script/README.md](apps-script/README.md) to deploy the included
Apps Script as a Web App in your own Google account, then enter its URL and your
chosen token in the app's **Settings** screen. Press **Sync Now** (or enable
auto-sync) to keep your devices and the sheet in step.

> Your data stays in your own Google account. No third-party server is involved.

## Project structure

```
src/
  components/        Reusable UI (Modal)
  data/              localStorage repo, settings, Google Sheets sync
  screens/           Calendar, Costs, Dashboard, Settings
  store/             App-wide state (React context)
  types/             Shared TypeScript types
  utils/             currency, dates, ids, dashboard metrics
apps-script/         Google Apps Script backend + setup guide
public/              icons, manifest, service worker
scripts/             icon generator
```

## Notes

- Single admin user; there is no login (run it on your own device).
- Deleting a record keeps a hidden tombstone so deletions sync across devices.
- All amounts use OMR formatting with three decimals.
