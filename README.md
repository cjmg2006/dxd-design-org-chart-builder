# DXD Design Org Chart Builder

An interactive org chart for the DXD Design Team (Ministry of Education, Singapore). Renders the team's reporting structure, domains, and workstreams in the browser, pulling live data from a Google Sheets CSV export. Built as a Vite + React + TypeScript app on the TFX design system.

## Features

- **Three views** — Org Chart (drawn reporting hierarchy), Teams (domain → workstream groups), Directory (searchable list + focus pane)
- **Domain filters** — All / Teachers / Students / Parents / Platforms / HQ
- **Live search** — matches name, specialty, workstream, or remarks
- **Pan/zoom canvas** — drag or scroll to move, pinch / ⌘-scroll to zoom; opens at 80% with the root anchored top, plus a "Zoom to fit" control
- **Edit mode** — drag cards to rearrange (lines re-route live), re-parent via an inline "Reports to" picker, and **add new people** (toolbar button, card hover "+", or the detail dialog)
- **Editable detail dialog** — set Reports to / Domain / Product for anyone
- **Status indicators** — On Leave, Joining, Departing, Transfer In/Out
- **Employment types** — GT, AR, Intern, Apprentice, Consultant
- **Mentorship lines** — dashed lines differentiate mentees from direct reports
- **Shared editing** — one shared chart everyone can edit, with a captured change history (see below)

## Development

```bash
npm install
npm run dev      # http://localhost:8731
npm run build    # tsc -b && vite build → dist/
```

`vite dev` serves the shared-edits API (`/api/edits`, `/api/history`) from a local `.dev-store.json` (gitignored), so collaborative editing is fully exercisable locally — two tabs on localhost share one store.

## Data source

Org data is fetched at page load from a published Google Sheets CSV export (`CSV_URL` in [`src/data/constants.ts`](src/data/constants.ts)). To point it at a different sheet, update that URL and keep the column structure.

## Shared editing

Edits (drags, re-parenting, domain/product changes, added people) are saved to a **single shared document** so everyone editing the deployed chart sees the same thing. The app loads it on open and polls every ~5 s to pick up others' changes (last-write-wins). It's **login-free** — anyone with the URL can edit. Every semantic change is captured to an append-only, anonymous, timestamped **history** (viewable via the "History" button in Edit mode). Until a shared store is provisioned, the deployed site stays publicly viewable and edits remain per-browser (localStorage).

### Backend

Two Vercel Functions back it: [`api/edits.ts`](api/edits.ts) (the shared `OrgEdits` doc, versioned) and [`api/history.ts`](api/history.ts) (the change log), over an **Upstash Redis** key-value store from the Vercel Marketplace.

### Provisioning (one-time)

1. In the Vercel dashboard for this project → **Storage** → **Marketplace** → add **Upstash Redis** (Redis) and connect it to the project. This injects the REST credentials as environment variables (`KV_REST_API_URL` / `KV_REST_API_TOKEN`, or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — the functions read either).
2. Redeploy. Shared editing + history are now live for everyone with the URL.

No env vars are needed for local development (the Vite dev middleware uses the local file store).

## Deployment

Deployed on Vercel. Vercel auto-detects the Vite build (output `dist/`) and serves the `api/` directory as serverless functions — no extra config.
