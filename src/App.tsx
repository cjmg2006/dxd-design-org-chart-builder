import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useOrg } from './data/useOrg'
import { applyEdits } from './data/org'
import { OrgEditsProvider, useOrgEdits } from './data/orgEdits'
import { ProfileViewerProvider } from './data/profileViewer'
import type { Person } from './data/types'
import { isMatch, type DomainFilter as DomainFilterValue, type ViewProps } from './lib/filter'
import { cn } from './lib/cn'
import { Segmented, type SegOption } from './components/Segmented'
import { SearchBox } from './components/SearchBox'
import { DomainFilter } from './components/DomainFilter'
import { Legend } from './components/Legend'
import { PersonDetail } from './components/PersonDetail'
import { ProfileModal } from './components/ProfileModal'
import { AddPersonDialog } from './components/AddPersonDialog'
import { HistoryDialog } from './components/HistoryDialog'
import { DirectoryView } from './views/DirectoryView'
import { TreeView } from './views/TreeView'
import { ExplorerView } from './views/ExplorerView'

// "Org Chart" is the umbrella (the page/app title) — all three tabs below are the
// same org, just organised differently. Each label names *how* it groups people.
// Internal ids are kept stable (they appear in shareable ?view= links and match
// the *View component names), so the id↔label mapping is intentionally crossed:
//   tree      → "Hierarchy"  the reporting tree — who reports to whom
//   directory → "Domains"    people grouped by domain → workstream
//   explorer  → "Directory"  searchable list + focus pane (person lookup)
type ViewId = 'tree' | 'directory' | 'explorer'

const VIEWS: Record<ViewId, (props: ViewProps) => ReactNode> = {
  tree: TreeView,
  directory: DirectoryView,
  explorer: ExplorerView,
}

const VIEW_OPTIONS: SegOption<ViewId>[] = [
  { value: 'tree', label: 'Hierarchy', icon: <TreeIcon />, description: 'who reports to whom' },
  { value: 'directory', label: 'Domains', icon: <GridIcon />, description: 'grouped by domain & workstream' },
  { value: 'explorer', label: 'Directory', icon: <ListIcon />, description: 'searchable list of everyone' },
]

export default function App() {
  const { status, org, error, reload } = useOrg()
  // User overrides (re-parent / re-domain / re-product, drag positions), shared
  // between the edit canvas and the detail dialog and baked into one effective
  // org so every view reflects them.
  const editsApi = useOrgEdits()
  const effectiveOrg = useMemo(
    () => (org ? applyEdits(org, editsApi.edits) : null),
    [org, editsApi.edits],
  )
  const editsValue = useMemo(() => ({ ...editsApi, baseOrg: org }), [editsApi, org])
  // Capture deep-link params once on mount, before any URL sync runs.
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), [])
  const [view, setView] = useState<ViewId>(() => {
    const v = initialParams.get('view')
    return v && v in VIEWS ? (v as ViewId) : 'tree'
  })
  const [query, setQuery] = useState('')
  const [domain, setDomain] = useState<DomainFilterValue>('All')
  const [selected, setSelected] = useState<Person | null>(null)
  // The full "human" profile modal — opened from a card photo or the detail
  // dialog. Opening it hands off from the edit dialog (one overlay at a time).
  const [profilePerson, setProfilePerson] = useState<Person | null>(null)
  const pendingPerson = useRef<string | null>(initialParams.get('person'))
  // The "add a person" form: open state + the manager to pre-fill (null = none).
  const [addOpen, setAddOpen] = useState(false)
  const [addManager, setAddManager] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const openAdd = useCallback((managerName?: string) => {
    setAddManager(managerName ?? null)
    setAddOpen(true)
  }, [])

  const openProfile = useCallback((person: Person) => {
    setSelected(null) // hand off from the edit dialog to a single profile overlay
    setProfilePerson(person)
  }, [])
  const profileViewerValue = useMemo(() => ({ openProfile }), [openProfile])

  // Deep-link: resolve ?person once the org has loaded (using the slug captured
  // on mount, so the URL-sync effect below can't wipe it first).
  useEffect(() => {
    if (effectiveOrg && pendingPerson.current) {
      const p = effectiveOrg.bySlug.get(pendingPerson.current)
      if (p) setSelected(p)
      pendingPerson.current = null
    }
  }, [effectiveOrg])

  // Sync view + selected person to the URL (shareable links). Gated on the org
  // being loaded so it never clears the initial ?person before it's resolved.
  useEffect(() => {
    if (!org) return
    const params = new URLSearchParams(window.location.search)
    params.set('view', view)
    if (selected) params.set('person', selected.slug)
    else params.delete('person')
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
    // Distinct, descriptive document title per view / open person (A11Y-9).
    const viewLabel = VIEW_OPTIONS.find((o) => o.value === view)?.label ?? 'Org Chart'
    document.title = selected
      ? `${selected.name} · DXD Design Team Org Chart`
      : `${viewLabel} · DXD Design Team Org Chart`
  }, [view, selected, org])

  const resultCount = useMemo(
    () => (effectiveOrg ? effectiveOrg.people.filter((p) => isMatch(p, query, domain)).length : 0),
    [effectiveOrg, query, domain],
  )

  const ViewComponent = VIEWS[view]
  const activeView = VIEW_OPTIONS.find((o) => o.value === view) ?? VIEW_OPTIONS[0]
  // The Hierarchy is a wide canvas — let it use the full page width. The other
  // views read best in a column, so they (and the shared legend) keep the 88rem cap.
  const wide = view === 'tree'

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only z-50 rounded-chip bg-primary px-4 py-2 text-sm text-primary-fg focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to team
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className={cn('px-4 py-3 sm:px-6', !wide && 'mx-auto max-w-[88rem]')}>
          {/* Brand + filters (left) share a bottom baseline with the search /
              view controls (right) via lg:items-end, so FIND PEOPLE and VIEW
              line up with the domain filter pills. */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <LogoMark />
                <div>
                  <h1 className="font-display text-base font-semibold leading-tight text-ink">
                    DXD Design Team
                  </h1>
                  <p className="text-2xs text-ink-muted">Ministry of Education Singapore</p>
                </div>
              </div>
              <DomainFilter value={domain} onChange={setDomain} />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
              <SearchBox value={query} onChange={setQuery} resultCount={resultCount} total={org?.people.length ?? 0} />
              <div className="shrink-0">
                <span className="block text-2xs font-semibold text-ink-muted">View</span>
                <div className="mt-1">
                  <Segmented value={view} onChange={setView} options={VIEW_OPTIONS} ariaLabel="Choose a layout" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main id="main" className="px-4 py-6 sm:px-6">
        {status === 'loading' && <LoadingState />}
        {status === 'error' && <ErrorState message={error} onRetry={reload} />}
        {status === 'success' && effectiveOrg && (
          <OrgEditsProvider value={editsValue}>
            <ProfileViewerProvider value={profileViewerValue}>
            <div className={cn('mb-5', !wide && 'mx-auto max-w-[88rem]')}>
              <Legend
                leading={
                  <p className="text-xs text-ink-secondary" aria-live="polite">
                    <span className="font-medium text-ink">{activeView.label}</span>
                    {activeView.description && (
                      <span className="text-ink-muted"> — {activeView.description}</span>
                    )}
                  </p>
                }
              />
            </div>
            <div className={cn(!wide && 'mx-auto max-w-[88rem]')}>
              <ViewComponent
                org={effectiveOrg}
                query={query}
                domain={domain}
                onSelect={setSelected}
                onAddPerson={openAdd}
                onOpenHistory={() => setHistoryOpen(true)}
              />
            </div>
            <PersonDetail
              org={effectiveOrg}
              person={selected}
              onClose={() => setSelected(null)}
              onNavigate={(p) => setSelected(p)}
            />
            <AddPersonDialog
              org={effectiveOrg}
              open={addOpen}
              defaultManager={addManager}
              onClose={() => setAddOpen(false)}
            />
            <HistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />
            <ProfileModal
              person={profilePerson}
              org={effectiveOrg}
              onClose={() => setProfilePerson(null)}
              onAddReport={(managerName) => {
                setProfilePerson(null) // hand off to the add form rather than stacking dialogs
                openAdd(managerName)
              }}
            />
            </ProfileViewerProvider>
          </OrgEditsProvider>
        )}
      </main>

      <footer className="mx-auto max-w-[88rem] px-4 py-8 text-center text-2xs text-ink-muted sm:px-6">
        {org?.syncedAt && <>Synced {org.syncedAt.toLocaleString('en-SG')} · </>}
        Living chart from the team Google Sheet · DXD Design, MOE Singapore
      </footer>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-3 py-32 text-sm text-ink-secondary" role="status" aria-live="polite">
      <span className="size-5 animate-spin rounded-pill border-2 border-border border-t-primary" aria-hidden />
      Loading the team…
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-28 text-center" role="alert">
      <svg viewBox="0 0 24 24" className="size-8 text-leave-text" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
        <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
      </svg>
      <p className="mt-3 text-sm font-semibold text-ink">Couldn’t load the team</p>
      <p className="mt-1 text-xs text-ink-secondary">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-chip bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Try again
      </button>
    </div>
  )
}

function LogoMark() {
  return (
    <span aria-hidden className="grid size-8 place-items-center rounded-chip bg-primary text-primary-fg">
      <svg viewBox="0 0 16 16" className="size-4" fill="currentColor">
        <rect x="6" y="2" width="4" height="3.4" rx="1" />
        <rect x="2" y="10.6" width="4" height="3.4" rx="1" />
        <rect x="10" y="10.6" width="4" height="3.4" rx="1" />
        <path d="M8 5.4v2.3M8 7.7H4v2.9M8 7.7h4v2.9" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>
    </span>
  )
}

function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  )
}
function TreeIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <rect x="5.5" y="1.5" width="5" height="3.5" rx="1" />
      <rect x="1.5" y="11" width="4.5" height="3.5" rx="1" />
      <rect x="10" y="11" width="4.5" height="3.5" rx="1" />
      <path d="M8 5v3M3.75 11V8h8.5v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <line x1="2" y1="4" x2="14" y2="4" strokeLinecap="round" />
      <line x1="2" y1="8" x2="14" y2="8" strokeLinecap="round" />
      <line x1="2" y1="12" x2="9" y2="12" strokeLinecap="round" />
    </svg>
  )
}
