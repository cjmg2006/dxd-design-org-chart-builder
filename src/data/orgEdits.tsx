import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AddedPerson, Domain, Org, OrgEdits, ProfileOverride, StatusOverride } from './types'
import { fetchEdits, saveEdits as saveRemote, logHistory } from './sharedStore'

// Custom arrangement, keyed by person name:
//   positions   — cards the user has dragged on the edit canvas ({x,y})
//   managers    — people re-parented via a new "Reports to" target
//   domains     — people moved to a different domain
//   workstreams — people moved to a different product ('' clears it)
//   additions   — people added by hand (full record; not in the sheet)
// Only customised people are stored; everyone else falls back to the sheet's
// values and the tidy computed layout, so the chart survives sheet changes.
//
// Persistence is a SHARED document (api/edits.ts): everyone edits one chart,
// loaded on open and re-fetched by a poll so others' changes appear within a few
// seconds (last-write-wins). localStorage is kept as an offline cache + instant
// first paint, and is the sole store when no backend is reachable.
const STORAGE_KEY = 'dxd-orgchart-layout-v3'
const EMPTY_EDITS: OrgEdits = {
  positions: {},
  managers: {},
  domains: {},
  workstreams: {},
  teams: {},
  statuses: {},
  additions: {},
  removed: {},
  profiles: {},
}
const SAVE_DEBOUNCE_MS = 600 // coalesce rapid edits (e.g. a drag) into one save
const SAVE_RETRY_MS = 3000 // back off this long before retrying a failed save
const POLL_MS = 5000 // how often to pick up other people's edits

/** Fill in any missing keys so a partial doc (old cache / remote) is always whole. */
function normalize(d: Partial<OrgEdits> | undefined | null): OrgEdits {
  return {
    positions: d?.positions ?? {},
    managers: d?.managers ?? {},
    domains: d?.domains ?? {},
    workstreams: d?.workstreams ?? {},
    teams: d?.teams ?? {},
    statuses: d?.statuses ?? {},
    additions: d?.additions ?? {},
    removed: d?.removed ?? {},
    profiles: d?.profiles ?? {},
  }
}

function loadCache(): OrgEdits {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? normalize(JSON.parse(raw) as Partial<OrgEdits>) : EMPTY_EDITS
  } catch {
    return EMPTY_EDITS
  }
}

function writeCache(e: OrgEdits) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(e))
  } catch {
    /* storage unavailable (private mode / quota) — cache just won't persist */
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
  /** Move a person to a squad/team. Passing their original team clears the override. */
  setSquad: (name: string, newTeam: string, originalTeam: string) => void
  /** Set (or clear, with null) a person's status badge (state / timing / destination). */
  setStatus: (name: string, override: StatusOverride | null) => void
  /** Add a hand-entered person (reporting to an existing manager). */
  addPerson: (person: AddedPerson) => void
  /** Remove a person (added → dropped; sheet → hidden). Optionally promote their
   *  reports onto a new manager so the tree stays connected. */
  removePerson: (name: string, promote?: { toManager: string; reportNames: string[] }) => void
  /** Set (or clear, with null) a person's in-app profile edit. */
  setProfile: (name: string, override: ProfileOverride | null) => void
  /** Clear structural overrides (positions, managers, domains, products,
   *  additions, removals). Profile edits are kept — they're data, not layout. */
  reset: () => void
  hasEdits: boolean
}

/** The shared-edits state machine. One instance lives at the app root. */
export function useOrgEdits(): OrgEditsApi {
  const [edits, setEdits] = useState<OrgEdits>(loadCache) // cached copy → instant first paint
  const remoteEnabled = useRef(false) // a backend answered → save/poll/log are live
  const version = useRef(0) // last shared-doc version we've seen
  const loaded = useRef(false) // initial shared load has settled
  const localChange = useRef(false) // the pending edit came from THIS client (→ push it)
  const pendingSave = useRef(false) // a debounced save is scheduled or in flight
  const saving = useRef(false) // a save request is in flight
  const saveTimer = useRef<number | undefined>(undefined)

  // Log a history entry only when a real backend is present (best-effort).
  const note = useCallback((action: string, summary: string) => {
    if (remoteEnabled.current) logHistory(action, summary)
  }, [])

  // ── Initial load: adopt the shared doc, or seed it from our cache ───────────
  useEffect(() => {
    const ctrl = new AbortController()
    fetchEdits(ctrl.signal)
      .then((doc) => {
        remoteEnabled.current = true
        version.current = doc.version
        if (doc.version > 0 && !localChange.current) {
          setEdits(normalize(doc.data)) // someone has already shared a chart
        } else {
          // Empty shared doc, OR the user started editing before the load
          // resolved — keep local and push it up (don't clobber their edit).
          localChange.current = true
          setEdits((e) => ({ ...e }))
        }
        loaded.current = true
      })
      .catch(() => {
        // No backend / offline → local-only, exactly as before.
        remoteEnabled.current = false
        loaded.current = true
      })
    return () => ctrl.abort()
  }, [])

  // ── Offline cache: mirror every state into localStorage ─────────────────────
  useEffect(() => {
    writeCache(edits)
  }, [edits])

  // ── Debounced shared save, only for changes that originated locally ─────────
  useEffect(() => {
    if (!loaded.current || !remoteEnabled.current || !localChange.current) return
    localChange.current = false
    pendingSave.current = true
    const snapshot = edits
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      saving.current = true
      saveRemote(snapshot)
        .then((r) => {
          version.current = r.version
        })
        .catch(() => {
          // Save failed (offline/timeout/5xx). Re-arm localChange so the poll
          // can't overwrite this still-unsaved edit, and schedule a retry that
          // re-runs this effect with the latest state.
          localChange.current = true
          window.clearTimeout(saveTimer.current)
          saveTimer.current = window.setTimeout(() => setEdits((e) => ({ ...e })), SAVE_RETRY_MS)
        })
        .finally(() => {
          saving.current = false
          pendingSave.current = false
        })
    }, SAVE_DEBOUNCE_MS)
  }, [edits])

  // ── Poll for others' edits; adopt when the doc moved and we're settled ──────
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!remoteEnabled.current || saving.current || pendingSave.current || localChange.current) return
      fetchEdits()
        .then((doc) => {
          if (doc.version !== version.current) {
            version.current = doc.version
            setEdits(normalize(doc.data))
          }
        })
        .catch(() => {})
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [])

  const commitNode = useCallback((name: string, x: number, y: number) => {
    localChange.current = true // positions are shared, but too noisy for history
    setEdits((e) => ({ ...e, positions: { ...e.positions, [name]: { x, y } } }))
  }, [])
  const reparent = useCallback(
    (name: string, newManager: string, originalManager: string | null) => {
      localChange.current = true
      const cleared = newManager === (originalManager ?? '')
      setEdits((e) => ({
        ...e,
        managers: cleared ? without(e.managers, name) : { ...e.managers, [name]: newManager },
      }))
      note('reparent', cleared ? `reset ${name}'s manager` : `reparented ${name} → ${newManager}`)
    },
    [note],
  )
  const setDomain = useCallback(
    (name: string, newDomain: Domain, originalDomain: Domain) => {
      localChange.current = true
      const cleared = newDomain === originalDomain
      setEdits((e) => ({
        ...e,
        domains: cleared ? without(e.domains, name) : { ...e.domains, [name]: newDomain },
      }))
      note('domain', cleared ? `reset ${name}'s domain` : `set ${name}'s domain → ${newDomain}`)
    },
    [note],
  )
  const setWorkstream = useCallback(
    (name: string, newWorkstream: string, originalWorkstream: string) => {
      localChange.current = true
      const cleared = newWorkstream === originalWorkstream
      setEdits((e) => ({
        ...e,
        workstreams: cleared ? without(e.workstreams, name) : { ...e.workstreams, [name]: newWorkstream },
      }))
      note('product', cleared ? `reset ${name}'s product` : `set ${name}'s product → ${newWorkstream || 'none'}`)
    },
    [note],
  )
  const setSquad = useCallback(
    (name: string, newTeam: string, originalTeam: string) => {
      localChange.current = true
      const cleared = newTeam.trim() === originalTeam.trim()
      setEdits((e) => ({
        ...e,
        teams: cleared ? without(e.teams, name) : { ...e.teams, [name]: newTeam },
      }))
      note('squad', cleared ? `reset ${name}'s squad` : `set ${name}'s squad → ${newTeam || 'none'}`)
    },
    [note],
  )
  const setStatus = useCallback(
    (name: string, override: StatusOverride | null) => {
      localChange.current = true
      setEdits((e) => ({
        ...e,
        statuses: override === null ? without(e.statuses, name) : { ...e.statuses, [name]: override },
      }))
      note('status', override === null ? `cleared ${name}'s status` : `set ${name}'s status`)
    },
    [note],
  )
  const addPerson = useCallback(
    (person: AddedPerson) => {
      localChange.current = true
      // Clear any prior removal of this name so re-adding a removed person works.
      setEdits((e) => ({
        ...e,
        additions: { ...e.additions, [person.name]: person },
        removed: without(e.removed, person.name),
      }))
      note('add', `added “${person.name}” → ${person.managerName}`)
    },
    [note],
  )
  const removePerson = useCallback(
    (name: string, promote?: { toManager: string; reportNames: string[] }) => {
      localChange.current = true
      setEdits((e) => {
        // Promote the removed person's reports onto the new manager (a hard
        // override, so they land there regardless of their sheet manager).
        const managers = { ...e.managers }
        if (promote) for (const r of promote.reportNames) managers[r] = promote.toManager
        delete managers[name]
        // An added person is dropped outright; a sheet person is hidden via the
        // `removed` set (so a sheet re-fetch can't resurrect them).
        const wasAdded = name in e.additions
        return {
          ...e,
          managers,
          additions: without(e.additions, name),
          positions: without(e.positions, name),
          domains: without(e.domains, name),
          workstreams: without(e.workstreams, name),
          removed: wasAdded ? e.removed : { ...e.removed, [name]: true },
        }
      })
      // One history line for the whole operation (no per-report reparent spam).
      const n = promote?.reportNames.length ?? 0
      note(
        'remove',
        n > 0 ? `removed “${name}” (${n} report${n > 1 ? 's' : ''} moved to ${promote!.toManager})` : `removed “${name}”`,
      )
    },
    [note],
  )
  const setProfile = useCallback(
    (name: string, override: ProfileOverride | null) => {
      localChange.current = true
      setEdits((e) => ({
        ...e,
        profiles: override === null ? without(e.profiles, name) : { ...e.profiles, [name]: override },
      }))
      note('profile', override === null ? `reset ${name}'s profile` : `updated ${name}'s profile`)
    },
    [note],
  )
  const reset = useCallback(() => {
    localChange.current = true
    // Keep profile edits (uploaded photos + written bios) — only clear structure.
    setEdits((e) => ({ ...EMPTY_EDITS, profiles: e.profiles }))
    note('reset', 'reset all edits')
  }, [note])

  const hasEdits =
    Object.keys(edits.positions).length > 0 ||
    Object.keys(edits.managers).length > 0 ||
    Object.keys(edits.domains).length > 0 ||
    Object.keys(edits.workstreams).length > 0 ||
    Object.keys(edits.teams).length > 0 ||
    Object.keys(edits.statuses).length > 0 ||
    Object.keys(edits.additions).length > 0 ||
    Object.keys(edits.removed).length > 0

  // Stable reference between edits — the callbacks never change, so consumers
  // (the edit canvas, the detail dialog) only re-render when the edits change.
  return useMemo(
    () => ({ edits, commitNode, reparent, setDomain, setWorkstream, setSquad, setStatus, addPerson, removePerson, setProfile, reset, hasEdits }),
    [edits, commitNode, reparent, setDomain, setWorkstream, setSquad, setStatus, addPerson, removePerson, setProfile, reset, hasEdits],
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
