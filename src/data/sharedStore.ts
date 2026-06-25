import type { OrgEdits } from './types'

// Thin client for the shared edits + history API (api/edits.ts, api/history.ts;
// mirrored locally by the Vite dev middleware). Every call can reject — the
// store may not be provisioned (503) or reachable — and callers are expected to
// fall back to local-only behaviour, so failures here are normal, not fatal.

export interface EditsDoc {
  /** Monotonic version; 0 means nothing has been saved yet. */
  version: number
  data: OrgEdits
  updatedAt: string | null
}

export interface HistoryEntry {
  ts: string
  action: string
  summary: string
}

const EDITS = '/api/edits'
const HISTORY = '/api/history'
const TIMEOUT_MS = 8000 // a hung request must reject, or it would wedge save/poll

/** A request timeout, optionally combined with a caller-supplied abort signal. */
function withTimeout(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  // AbortSignal.any keeps the caller's cancellation (e.g. unmount) working too.
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

/** Read the shared edits document. */
export async function fetchEdits(signal?: AbortSignal): Promise<EditsDoc> {
  const res = await fetch(EDITS, { signal: withTimeout(signal), headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`edits GET ${res.status}`)
  return (await res.json()) as EditsDoc
}

/** Overwrite the shared edits document (last-write-wins); returns the new version. */
export async function saveEdits(data: OrgEdits): Promise<{ version: number; updatedAt: string }> {
  const res = await fetch(EDITS, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
    signal: withTimeout(),
  })
  if (!res.ok) throw new Error(`edits PUT ${res.status}`)
  return (await res.json()) as { version: number; updatedAt: string }
}

/** Read recent history entries, most-recent first. */
export async function fetchHistory(limit = 100, signal?: AbortSignal): Promise<HistoryEntry[]> {
  const res = await fetch(`${HISTORY}?limit=${limit}`, {
    signal: withTimeout(signal),
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`history GET ${res.status}`)
  const json = (await res.json()) as { entries: HistoryEntry[] }
  return json.entries ?? []
}

/** Append one history entry. Fire-and-forget — never throws to the caller. */
export function logHistory(action: string, summary: string): void {
  void fetch(HISTORY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, summary }),
  }).catch(() => {
    /* history is best-effort */
  })
}
