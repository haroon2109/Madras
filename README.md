# Madras — Zone-Wise Urban Rainfall Forecasting & Decision-Support Platform

Madras is a decision-support platform for the **Greater Chennai Corporation**: it
fetches real rainfall forecasts from [Open-Meteo](https://open-meteo.com) for each
of Chennai's **15 zones**, scores flood risk against configurable thresholds, raises
alerts with recommended actions, and tracks forecast history for analytics.

Built with **Next.js 16** (App Router, Turbopack), **Prisma 7 + SQLite**, **NextAuth
v5** (credentials + roles), **Tailwind CSS 4**, **Leaflet** (map), and **Recharts**.

## Features

| Page | What it does |
| --- | --- |
| `/` Dashboard | City-wide outlook, Leaflet map with risk-colored zone markers, waterlogging + vulnerability overlays, reservoir/tide strip, per-zone 24h forecast + 7-day outlook cards |
| `/decisions` Decision Support | Zone risk table sorted by operational priority (risk × vulnerability), drainage-backflow flags at high tide, recommended actions, automatic alert log with resolve/reopen |
| `/incidents` Incidents | Waterlogging/flood reporting (field + citizen), verify/resolve workflow, feeds the dashboard map layer |
| `/accuracy` Model Accuracy | ECMWF-vs-GFS scorecard (MAE, bias, rain hit-rate) per zone vs stored observations; per-zone slice also on `/analytics` |
| `/season` Season & Climate | Monsoon progress vs IMD normals, rainfall-anomaly feed, reservoir storage + manual readings, harbour tide + backflow explainer |
| `/analytics` Analytics | Per-zone 30-day rainfall history chart, hourly ECMWF-vs-GFS model comparison (48h, from `HourlyRainfall`), per-zone accuracy slice, wettest day, rainy-day counts |
| `/admin` Admin (role-gated) | Zone CRUD (coordinates, thresholds, active toggle), user management with roles, ingestion & pipeline health panel |

### Live data extras

- **Radar overlay** — RainViewer's public radar (past 2h, animated, toggleable) under the dashboard map markers.
- **River discharge advisories** — Open-Meteo Flood API (GloFAS) for the Adyar & Cooum basins; a "river rising" flag appears on `/decisions` when mean discharge crosses the configured advisory level.
- **Air quality per zone** — Open-Meteo Air Quality API (PM2.5, PM10, US AQI) chips on the public `/weather` page.
- **Sea state** — Open-Meteo Marine API (wave height, swell) with an IMD-style fishing advisory for the coastal strip on `/weather`.
- **2-hour nowcast** — "rain next 2h" per zone computed from the stored `HourlyRainfall` table (no extra API calls), shown on `/weather` and `/decisions`.
- **CSV exports** — `/api/export?type=forecast|hourly|incidents|alerts` (session-gated) plus buttons on `/analytics`.
- **Public alerts feed** — `/api/alerts/feed`, a machine-readable JSON feed of active alerts from the `Alert` table.

All of these call free, keyless public APIs (or read the project's own stored data); failures degrade to hidden sections, never placeholder numbers.

Forecasts refresh automatically when a page is more than 3h stale, or manually via the
"Refresh forecast data" button (also available as a cron endpoint, see below).

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL (Postgres — see below)
npx prisma migrate dev # create Postgres schema (first run)
npm run db:seed        # 15 Chennai zones, 29 days of real Open-Meteo history, admin user
npm run dev            # http://localhost:3000
```


### Database — PostgreSQL (Neon free tier)

Vercel's serverless functions have an ephemeral filesystem, so the old local
SQLite file can't be used in production. The app now uses **PostgreSQL**:

1. Create a free database at https://neon.tech (or Supabase).
2. Copy its connection string into `DATABASE_URL` (local `.env` + Vercel env vars).
3. Run migrations + seed once against it:
   ```bash
   npx prisma migrate deploy   # apply schema (CI / production)
   npm run db:seed             # zones + history + admin (first time only)
   ```

## Weather ingestion layer (`src/lib/ingest/`)

Hourly precipitation ingestion from **ECMWF** and **GFS** via Open-Meteo, as two
independent services:

- `src/lib/ingest/ecmwf.ts` — ECMWF IFS 0.25° (`ecmwf_ifs04`), the higher-res European model
- `src/lib/ingest/gfs.ts` — NOAA GFS (`gfs_seamless`), an independent second opinion

Both fetch **7 days of hourly precipitation** (plus probability, temperature, wind)
for every active Chennai zone in `Asia/Kolkata`. Every raw Open-Meteo response is
archived under `data/raw/`:

```
data/raw/{ecmwf|gfs}/{YYYY-MM-DD}/zone-XX-{name}_{timestamp}.json
```

Each file wraps the untouched API response in a small `_meta` envelope (model, zone,
fetchedAt). All rainfall values come from the API responses — nothing is hardcoded.

Request handling: 20s timeout, up to 3 attempts with exponential backoff + jitter
on network errors / timeouts / HTTP 429 / 5xx, and **graceful failure** — a bad zone
or model is logged and reported in the run summary without aborting the rest.
Structured JSON logging goes to stdout/stderr and daily files under `data/logs/`.
`data/` is gitignored.

Run it:

```bash
npm run ingest                                  # all zones, ECMWF + GFS
npm run ingest -- --model gfs                   # GFS only
npm run ingest -- --zone 1 --zone 7             # specific zones
npm run ingest -- --strict                      # exit 1 if anything failed
```

Or via API (mirrors the refresh endpoint's auth):

```bash
curl -X POST https://your-host/api/ingest                       # authenticated (session cookie)
curl "https://your-host/api/ingest?key=$CRON_SECRET"            # for cron systems
```

Env knobs: `OPEN_METEO_BASE_URL`, `INGEST_LOG_LEVEL`, `INGEST_LOG_DIR`, `INGEST_RAW_DIR`.

## Meteorological preprocessing pipeline (`src/lib/processing/`)

Normalizes the raw ECMWF + GFS archives (`data/raw/**`) into one common,
model-agnostic schema and writes processed CSV output:

```
timestamp,zone_id,model,rainfall_mm_hr
2026-09-08T18:30:00.000Z,zone-01,gfs,0.3
```

- `timestamp` — ISO-8601 **UTC** (converted from the archive's IST wall clock)
- `zone_id` — the **stable** zone id from `chennai-zones.json` (`zone-01`…`zone-15`);
  raw archives carry the DB cuid, which the pipeline resolves via the config
- `model` — `ecmwf` | `gfs`
- `rainfall_mm_hr` — hourly precipitation (mm/h); **empty = missing/invalid at
  source** (rows are kept, never silently dropped)

Robustness (all covered by automated tests):

- **Missing values** → row kept with null rainfall, counted in the report
- **Duplicate timestamps** → deduped per (timestamp, zone_id, model), first file wins
- **Invalid values** (`NaN`, strings, out of physical range) → nulled or dropped
- **API failures** → error envelopes and unreadable files are reported per file;
  one bad file never aborts the run (use `--strict` to fail CI on any failure)

Output is deterministic (sorted timestamp → zone → model), RFC 4180 CSV with a
comment header documenting the schema. Every run ends with a validation gate
(schema checks + zone-coverage cross-check against `chennai-zones.json`); output
is only written if validation passes.

Run it:

```bash
npm run process                          # data/raw → data/processed/rainfall.csv
npm run load                             # processed CSV → Prisma HourlyRainfall (idempotent)
npm run load -- --upsert                 # overwrite existing rows (backfill mode)
npm run process -- --model gfs           # one model
npm run process -- --zone zone-01        # repeatable zone filter (config ids)
npm run process -- --since 2026-09-09    # only files under that date dir
npm run process -- --strict              # exit 1 if any file failed
npm test                                 # 43 automated validation tests
```

> CSV was chosen over Parquet because the project has no Parquet dependency;
> the four-column contract (`RECORD_COLUMNS`) keeps a future Parquet writer
> drop-in compatible. Output lives under gitignored `data/processed/`.

## Scheduled forecast refresh (cron)

Hit the refresh endpoint on a schedule to keep daily snapshots fresh:

```bash
curl -X POST https://your-host/api/refresh   # authenticated (session cookie)
curl "https://your-host/api/refresh?key=$CRON_SECRET"  # for cron systems
```

Set `CRON_SECRET` in production. Every refresh also runs the alert assessment
(raises alerts for zones crossing their watch threshold).

## Data model & risk scoring

- **Zone** — number, name, coordinates, and three daily-rainfall thresholds
  (watch/warning/alert, default 15/30/60 mm per 24h). All editable in Admin.
- **Zone configuration** — the 15 Chennai zones (IDs, names, centroids, optional
  GeoJSON boundaries) live only in `src/config/chennai-zones.json`, validated by
  `src/lib/zones.ts` (valid coordinates, unique IDs/numbers/names). The seed and
  `npm run zones:sync` hydrate the DB from it; `npm run zones:validate` checks
  config + DB without changing anything. UI components never hardcode zones.
- **ForecastSnapshot** — one row per zone per forecast date per capture, storing
  precip sum, precip probability, temps, wind, and the computed risk level.
- **Alert** — raised when a zone's 24h forecast crosses the watch threshold;
  includes the recommended actions for the risk level.

- **HourlyRainfall** — normalized hourly rainfall loaded from the processed
  CSV (one row per zone × model × hour, nulls preserved). Load it with
  `npm run load` after processing: diff mode is idempotent (re-runs skip
  existing rows); `npm run load -- --upsert` overwrites existing rows to
  backfill nulls. Loader auto-syncs zone config → Zone rows first, and maps
  stable config zone ids to Zone records internally.

Risk levels: `LOW → WATCH → WARNING → ALERT`, each with a fixed set of recommended
actions (pump deployment, drain clearing, road closures, evacuation prep, etc.).

## Data sources

- **Forecasts & history (daily)**: [Open-Meteo](https://open-meteo.com) daily API
  (free, no key), 7 days ahead + 14 days of past observations per refresh,
  timezone `Asia/Kolkata`. The seed stores 29 days of real per-zone history so
  analytics are populated on first run. Base URL is overridable via
  `OPEN_METEO_BASE_URL`.
- **Forecasts (hourly, ingestion)**: ECMWF IFS 0.25° and NOAA GFS via Open-Meteo,
  archived raw under `data/raw/` (see above).
- **History**: all rainfall values are real API data — the platform never
  fabricates observations. The seed pulls 29 past days + the 7-day outlook per
  zone from Open-Meteo (falling back to auto-refresh on first page load for any
  zone that failed), and every refresh re-captures the window so past days track
  the model's final analysis.

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm start            # run production build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run db:push      # sync schema to SQLite
npm run db:seed      # reset & seed database
npm run db:studio    # Prisma Studio
npm run ingest       # hourly ECMWF + GFS ingestion to data/raw
```
