@AGENTS.md

## Workflow

- **Always commit and push** after making changes. Do not wait for the user to ask.
- When modifying multiple files, batch them into a single commit with a descriptive message.

## Architecture

This is a Next.js 16 App Router project (see `node_modules/next/dist/docs/` for up-to-date API docs).

- **Frontend**: React 19 client components (`'use client'`) in `src/app/*/page.tsx`
- **API**: Route handlers in `src/app/api/*/route.ts`
- **DB**: Neon serverless Postgres via `@neondatabase/serverless`
- **Charts**: Recharts, lazy-loaded via `next/dynamic` with `ssr: false`
- **Types**: `src/lib/types.ts` — single source of truth for all interfaces
- **Adaptation logic**: `src/lib/adapt.ts` — analyzes recent sessions, adjusts future targets
- **Aggregations**: `src/lib/aggregations.ts` — builds weekly summaries

### Sections

- **Running** (`/running`) — full tracking (distance, pace, duration, elevation, leg feel, etc.)
- **Cycling** (`/cycling`) — simplified to duration + notes only
- **Dashboard** (`/`) — weekly summary cards for running and cycling

### Key patterns

- All pages fetch data from their respective `/api/*` route on mount
- POST handlers save data then call `applyAdaptations()` which analyzes recent weeks and adjusts next session targets
- `useMemo` for derived data must be placed **before** any early `return` (React hooks rules)
- SQL queries in adapt/summary routes are scoped to recent weeks (not full table scans)

### What was removed

- **Weights section** — completely removed (page, API route, types, nav tab, dashboard card, adaptation logic). DB tables (`weights_sections`, `weights_sessions`) still exist but are unused.
- **Cycling fields** — only `actualDuration` and `notes` are used. All other columns (rpe, heart rate, speed, resistance, elevation, calories, moving_time) still exist in the DB but are not read or written by the app.
- **Meals & nutrition** — completely removed (page, API routes, types, nav tab, dashboard nutrition card, default foods). DB tables (`meal_entries`, `foods`, `nutrition_goals`) may still exist but are unused.
