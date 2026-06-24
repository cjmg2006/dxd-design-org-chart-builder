import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Domain, Org, OrgEdits } from './types'

// Persisted custom arrangement, keyed by person name:
//   positions   — cards the user has dragged on the edit canvas ({x,y})
//   managers    — people re-parented via a new "Reports to" target
//   domains     — people moved to a different domain
//   workstreams — people moved to a different product ('' clears it)
// Only customised people are stored; everyone else falls back to the sheet's
// values and the tidy computed layout, so the chart survives sheet changes.
const STORAGE_KEY = 'dxd-orgchart-layout-v3'
const EMPTY_EDITS: OrgEdits = { positions: {}, managers: {}, domains: {}, workstreams: {} }

function loadEdits(): OrgEdits {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_EDITS
    const parsed = JSON.parse(raw) as Partial<OrgEdits>
    return {
      positions: parsed.positions ?? {},
      managers: parsed.managers ?? {},
      domains: parsed.domains ?? {},
      workstreams: parsed.workstreams ?? {},
    }
  } catch {
    return EMPTY_EDITS
  }
}

function saveEdits(e: OrgEdits) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(e))
  } catch {
    /* storage unavailable (private mode / quota) — edits just won't persist */
  }
}

/** Drop a key from a record, returning a new record (never mutates). */
function without<V>(rec: Record<string, V>, key: string): Record<string, V> {
  if (!(key in rec)) return rec
  const next = { ...rec }
  delete next[key]
  return next
}

export interface OrgEditsApi {
  edits: OrgEdits
  /** A dragged card commits its new position. */
  commitNode: (name: string, x: number, y: number) => void
  /** Re-parent a person. Passing their original (sheet) manager clears the override. */
  reparent: (name: string, newManager: string, originalManager: string | null) => void
  /** Move a person to a domain. Passing their original domain clears the override. */
  setDomain: (name: string, newDomain: Domain, originalDomain: Domain) => void
  /** Move a person to a product. Passing their original workstream clears the override. */
  setWorkstream: (name: string, newWorkstream: string, originalWorkstream: string) => void
  /** Clear every override (positions, managers, domains, products). */
  reset: () => void
  hasEdits: boolean
}

/** The persisted-edits state machine. One instance lives at the app root. */
export function useOrgEdits(): OrgEditsApi {
  const [edits, setEdits] = useState<OrgEdits>(loadEdits)
  useEffect(() => saveEdits(edits), [edits])

  const commitNode = useCallback(
    (name: string, x: number, y: number) =>
      setEdits((e) => ({ ...e, positions: { ...e.positions, [name]: { x, y } } })),
    [],
  )
  const reparent = useCallback(
    (name: string, newManager: string, originalManager: string | null) =>
      setEdits((e) => ({
        ...e,
        managers:
          newManager === (originalManager ?? '')
            ? without(e.managers, name)
            : { ...e.managers, [name]: newManager },
      })),
    [],
  )
  const setDomain = useCallback(
    (name: string, newDomain: Domain, originalDomain: Domain) =>
      setEdits((e) => ({
        ...e,
        domains:
          newDomain === originalDomain
            ? without(e.domains, name)
            : { ...e.domains, [name]: newDomain },
      })),
    [],
  )
  const setWorkstream = useCallback(
    (name: string, newWorkstream: string, originalWorkstream: string) =>
      setEdits((e) => ({
        ...e,
        workstreams:
          newWorkstream === originalWorkstream
            ? without(e.workstreams, name)
            : { ...e.workstreams, [name]: newWorkstream },
      })),
    [],
  )
  const reset = useCallback(() => setEdits(EMPTY_EDITS), [])

  const hasEdits =
    Object.keys(edits.positions).length > 0 ||
    Object.keys(edits.managers).length > 0 ||
    Object.keys(edits.domains).length > 0 ||
    Object.keys(edits.workstreams).length > 0

  // Stable reference between edits — the callbacks never change, so consumers
  // (the edit canvas, the detail dialog) only re-render when the edits change.
  return useMemo(
    () => ({ edits, commitNode, reparent, setDomain, setWorkstream, reset, hasEdits }),
    [edits, commitNode, reparent, setDomain, setWorkstream, reset, hasEdits],
  )
}

// ── Context: the edits API + the base (sheet) org, so consumers can read the
//    original values needed to detect/clear an override. ──────────────────────
export interface OrgEditsContextValue extends OrgEditsApi {
  /** The unedited, sheet-derived org — the source of "original" values. */
  baseOrg: Org | null
}

const OrgEditsContext = createContext<OrgEditsContextValue | null>(null)

export function OrgEditsProvider({
  value,
  children,
}: {
  value: OrgEditsContextValue
  children: ReactNode
}) {
  return <OrgEditsContext.Provider value={value}>{children}</OrgEditsContext.Provider>
}

export function useOrgEditsContext(): OrgEditsContextValue {
  const ctx = useContext(OrgEditsContext)
  if (!ctx) throw new Error('useOrgEditsContext must be used within OrgEditsProvider')
  return ctx
}
