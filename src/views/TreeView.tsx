import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { Collapsible } from '@base-ui-components/react/collapsible'
import { useMediaQuery } from '@base-ui-components/react/unstable-use-media-query'
import type { Org, Person } from '@/data/types'
import { reportsOf, menteesOf, descendantCount } from '@/data/org'
import { useOrgEditsContext } from '@/data/orgEdits'
import { isMatch, type DomainFilter, type ViewProps } from '@/lib/filter'
import { statusShort } from '@/lib/styles'
import { PersonCard } from '@/components/PersonCard'
import { Avatar, DomainDot, EmploymentBadge, StatusPill } from '@/components/primitives'
import { useProfile } from '@/data/profileViewer'
import { useManagerAuth } from '@/data/managerAuth'
import { SpecialtyIcon } from '@/components/SpecialtyIcon'
import { cn } from '@/lib/cn'
import {
  computeLayout,
  edgeKey,
  edgePath,
  NODE_H,
  NODE_W,
  type Child,
  type Edge,
  type LaidOutNode,
} from '@/lib/treeLayout'

type PosMap = Record<string, { x: number; y: number }>

const SCALE_MIN = 0.1 // zoomed all the way out
const SCALE_MAX = 2 // zoomed all the way in
const DEFAULT_SCALE = 0.8 // opening zoom: read cards at a glance, root anchored at top
const ZOOM_BTN_STEP = 1.5 // +/- button zoom factor (snappier steps)
const ZOOM_WHEEL_RATE = 0.003 // pinch / ⌘-scroll zoom sensitivity per wheel delta
const FIT_PAD = 56 // breathing room around the chart when zooming to fit
const MIN_BOARD_HEIGHT = 360 // floor for the canvas board height on short viewports
const DRAG_THRESHOLD_PX = 4 // pointer travel before a press becomes a pan rather than a click

export function TreeView({ org, query, domain, onSelect, onAddPerson, onOpenHistory }: ViewProps) {
  // Render the lightweight outline on narrow screens — never the wide canvas
  // (it would force two-dimensional page scrolling). Default to the outline
  // before the media query resolves so the first mount is the safe layout.
  const isWide = useMediaQuery('(min-width: 768px)', { defaultMatches: false })

  const filtering = query.trim().length > 0 || domain !== 'All'

  return (
    <div className="space-y-4">
      <Header org={org} />
      {isWide ? (
        <TreeCanvas
          org={org}
          query={query}
          domain={domain}
          filtering={filtering}
          onSelect={onSelect}
          onAddPerson={onAddPerson}
          onOpenHistory={onOpenHistory}
        />
      ) : (
        <Outline org={org} query={query} domain={domain} filtering={filtering} onSelect={onSelect} />
      )}
    </div>
  )
}

function Header({ org }: { org: Org }) {
  return (
    <header>
      <h2 className="text-sm font-semibold text-ink">Reporting hierarchy</h2>
      <p className="mt-1 text-xs text-ink-muted">
        Who reports to whom, top-down from {org.root.name}. Dashed links are mentorships.
      </p>
    </header>
  )
}

// ── Shared dimming ──────────────────────────────────────────────────────────
function dimmed(p: Person, query: string, domain: DomainFilter, filtering: boolean): boolean {
  // The root has no domain; never dim it on a domain filter alone.
  if (!filtering) return false
  return !isMatch(p, query, domain)
}

// ── Desktop: pan/zoom canvas board (Miro/FigJam-style) holding the top-down tree ──
function TreeCanvas({
  org,
  query,
  domain,
  filtering,
  onSelect,
  onAddPerson,
  onOpenHistory,
}: {
  org: Org
  query: string
  domain: DomainFilter
  filtering: boolean
  onSelect: (p: Person) => void
  onAddPerson?: (managerName?: string) => void
  onOpenHistory?: () => void
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  // Current transform, kept in a ref and written to the DOM imperatively so panning
  // and zooming never re-render the (large) tree — only the transform changes.
  const view = useRef({ x: 0, y: 0, scale: 1 })
  const userMoved = useRef(false) // once true, stop auto-refitting on a content reflow
  const [zoomPct, setZoomPct] = useState(100)
  const [panning, setPanning] = useState(false)
  // Maximise: expand the board to fill the whole window (over the page chrome) so
  // a wide org has room to breathe. Esc or the minimise button returns it.
  const [maximized, setMaximized] = useState(false)
  const toggleMax = useCallback(() => {
    userMoved.current = false // re-centre the chart in the new canvas size
    setMaximized((m) => !m)
  }, [])

  // Edit mode: switch the static tree for a positioned, draggable graph whose
  // reporting lines re-route live as cards move — and where a card's manager can
  // be changed via its "Reports to" control. Edits are persisted per browser and
  // shared with the detail dialog via the app-wide edits store.
  const [editing, setEditing] = useState(false)
  const { edits, baseOrg, commitNode, reparent, reset, hasEdits } = useOrgEditsContext()
  const { isManager } = useManagerAuth()
  // Layout edits are a manager-only capability — drop out of edit mode if the
  // manager session locks (or never existed) while it was open.
  useEffect(() => {
    if (!isManager) setEditing(false)
  }, [isManager])
  // Drag math converts pointer pixels → content units, so it needs the live scale.
  const getScale = useCallback(() => view.current.scale, [])

  const clampScale = (s: number) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, s))

  // Keep at least a margin of the chart on-screen so it can't be lost off the board.
  const clampXY = (x: number, y: number, scale: number) => {
    const vp = viewportRef.current
    const cv = contentRef.current
    if (!vp || !cv) return { x, y }
    const m = 80
    return {
      x: Math.min(vp.clientWidth - m, Math.max(m - cv.offsetWidth * scale, x)),
      y: Math.min(vp.clientHeight - m, Math.max(m - cv.offsetHeight * scale, y)),
    }
  }

  const apply = () => {
    const cv = contentRef.current
    if (!cv) return
    const { x, y, scale } = view.current
    cv.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
  }

  // Commit a (clamped) transform and paint it imperatively — no React re-render.
  const setView = (x: number, y: number, scale: number) => {
    const s = clampScale(scale)
    const p = clampXY(x, y, s)
    view.current = { x: p.x, y: p.y, scale: s }
    apply()
  }

  // Zoom while keeping the viewport point (px, py) fixed under the cursor.
  const zoomAt = (px: number, py: number, nextScale: number) => {
    const s = clampScale(nextScale)
    const k = s / view.current.scale
    setView(px - (px - view.current.x) * k, py - (py - view.current.y) * k, s)
    setZoomPct(Math.round(s * 100))
  }

  // Fill the board: the whole window when maximised, otherwise the viewport below
  // its top (imperative height → no flash).
  const sizeBoard = useCallback(() => {
    const vp = viewportRef.current
    if (!vp) return
    vp.style.height = maximized
      ? `${window.innerHeight}px`
      : `${Math.max(MIN_BOARD_HEIGHT, window.innerHeight - vp.getBoundingClientRect().top - 16)}px`
  }, [maximized])

  // Zoom-to-fit the whole chart, centred — the explicit "Zoom to fit" action.
  const fit = useCallback(() => {
    const vp = viewportRef.current
    const cv = contentRef.current
    if (!vp || !cv || !cv.offsetWidth) return
    const s = clampScale(
      Math.min((vp.clientWidth - FIT_PAD) / cv.offsetWidth, (vp.clientHeight - FIT_PAD) / cv.offsetHeight),
    )
    view.current = {
      x: (vp.clientWidth - cv.offsetWidth * s) / 2,
      y: (vp.clientHeight - cv.offsetHeight * s) / 2,
      scale: s,
    }
    apply()
    setZoomPct(Math.round(s * 100))
  }, [])

  // The opening view: a fixed 80% zoom, root centred near the top — so people
  // start reading actual cards rather than a fit-to-screen bird's-eye. "Zoom to
  // fit" remains a click away for the whole-org overview.
  const openAtDefault = useCallback(() => {
    const vp = viewportRef.current
    const cv = contentRef.current
    if (!vp || !cv || !cv.offsetWidth) return
    setView((vp.clientWidth - cv.offsetWidth * DEFAULT_SCALE) / 2, FIT_PAD, DEFAULT_SCALE)
    setZoomPct(Math.round(DEFAULT_SCALE * 100))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setView reads live refs; stable
  }, [])

  // Size the board, then open at the default zoom — before paint, so nothing
  // unpositioned flashes.
  useLayoutEffect(() => {
    sizeBoard()
    openAtDefault()
  }, [sizeBoard, openAtDefault])

  // Entering/leaving edit mode deliberately keeps the current zoom & pan — the
  // user stays focused where they were rather than snapping back to fit-all.

  // Keep the board sized on resize and on layout shifts above it (e.g. the Legend
  // disclosure). Re-apply the default view only while the user hasn't moved the
  // canvas, so a late content reflow (fonts/data) lands placed without overriding
  // their view.
  useEffect(() => {
    const cv = contentRef.current
    let raf = 0
    const roContent = new ResizeObserver(() => {
      if (userMoved.current) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(openAtDefault)
    })
    if (cv) roContent.observe(cv)
    const roBody = new ResizeObserver(() => {
      sizeBoard()
      if (!userMoved.current) openAtDefault()
    })
    roBody.observe(document.body)
    const onResize = () => {
      sizeBoard()
      if (userMoved.current) setView(view.current.x, view.current.y, view.current.scale)
      else openAtDefault()
    }
    window.addEventListener('resize', onResize)
    return () => {
      roContent.disconnect()
      roBody.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [sizeBoard, openAtDefault])

  // While maximised: lock page scroll behind the overlay and let Esc minimise
  // (but not when a dialog is open — Esc should close that first).
  useEffect(() => {
    if (!maximized) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) setMaximized(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [maximized])

  // Wheel: two-finger swipe / wheel pans; pinch or ⌘/Ctrl-scroll zooms to the cursor.
  // Native non-passive listener so preventDefault stops the page itself from scrolling.
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      userMoved.current = true
      if (e.ctrlKey || e.metaKey) {
        const r = vp.getBoundingClientRect()
        zoomAt(e.clientX - r.left, e.clientY - r.top, view.current.scale * Math.exp(-e.deltaY * ZOOM_WHEEL_RATE))
      } else {
        setView(view.current.x - e.deltaX, view.current.y - e.deltaY, view.current.scale)
      }
    }
    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => vp.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- zoomAt/setView read live refs; set up once
  }, [])

  // Drag to pan (mouse, touch, or pen). A threshold separates a pan from a click,
  // and a real drag's trailing click is suppressed so panning never opens a card.
  const drag = useRef({ active: false, moved: false, x: 0, y: 0, vx: 0, vy: 0 })
  const suppressClick = useRef(false)

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    suppressClick.current = false
    drag.current = { active: true, moved: false, x: e.clientX, y: e.clientY, vx: view.current.x, vy: view.current.y }
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d.active) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return // below threshold → still a click
    if (!d.moved) {
      d.moved = true
      userMoved.current = true
      setPanning(true)
      viewportRef.current?.setPointerCapture(e.pointerId)
    }
    setView(d.vx + dx, d.vy + dy, view.current.scale)
  }
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d.active) return
    if (d.moved) {
      // Only arm the click-suppressor when a click will follow (pointerup); a
      // pointercancel produces no click, so arming it there would eat the next one.
      suppressClick.current = e.type !== 'pointercancel'
      setPanning(false)
      viewportRef.current?.releasePointerCapture(e.pointerId)
    }
    d.active = false
  }
  const onClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      e.preventDefault()
      e.stopPropagation()
      suppressClick.current = false
    }
  }

  const zoomByButton = (factor: number) => {
    const vp = viewportRef.current
    if (!vp) return
    userMoved.current = true
    zoomAt(vp.clientWidth / 2, vp.clientHeight / 2, view.current.scale * factor)
  }

  return (
    <div
      ref={viewportRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
      style={{
        touchAction: 'none',
        // A faint dot grid signals the editable canvas (FigJam-style).
        ...(editing
          ? {
              backgroundImage: 'radial-gradient(var(--color-border) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }
          : {}),
      }}
      className={cn(
        'select-none overflow-hidden border bg-surface',
        maximized ? 'fixed inset-0 z-40' : 'relative rounded-card',
        editing ? 'border-primary/40' : 'border-border',
        panning ? 'cursor-grabbing' : 'cursor-grab',
      )}
    >
      {/* Board content: anchored at the viewport's top-left and moved + scaled by a
          transform written imperatively, so pan/zoom never reconciles the tree. */}
      <div ref={contentRef} className="absolute left-0 top-0 w-max origin-top-left will-change-transform">
        {editing ? (
          <PositionedTree
            org={org}
            baseOrg={baseOrg}
            query={query}
            domain={domain}
            filtering={filtering}
            onSelect={onSelect}
            onAddPerson={onAddPerson}
            positions={edits.positions}
            getScale={getScale}
            onCommitNode={commitNode}
            onReparent={reparent}
          />
        ) : (
          <TreeContent org={org} query={query} domain={domain} filtering={filtering} onSelect={onSelect} />
        )}
      </div>

      <CanvasControls
        zoomPct={zoomPct}
        onOut={() => zoomByButton(1 / ZOOM_BTN_STEP)}
        onIn={() => zoomByButton(ZOOM_BTN_STEP)}
        onReset={fit}
        maximized={maximized}
        onToggleMax={toggleMax}
      />

      {isManager && (
        <EditToolbar
          editing={editing}
          canReset={hasEdits}
          onToggle={() => setEditing((v) => !v)}
          onReset={reset}
          onAdd={onAddPerson ? () => onAddPerson() : undefined}
          onHistory={onOpenHistory}
        />
      )}
      <p className="pointer-events-none absolute right-3 top-12 text-2xs text-ink-muted">
        {editing
          ? 'Drag to rearrange · hover a card for + to add a report'
          : 'Drag or scroll to move · pinch / ⌘-scroll to zoom'}
      </p>
    </div>
  )
}

// Top-right edit control: the edit toggle, plus (while editing) an "Add person"
// button and a reset once anything has changed. Stops pointer events from
// bubbling so clicking it never pans.
function EditToolbar({
  editing,
  canReset,
  onToggle,
  onReset,
  onAdd,
  onHistory,
}: {
  editing: boolean
  canReset: boolean
  onToggle: () => void
  onReset: () => void
  onAdd?: () => void
  onHistory?: () => void
}) {
  return (
    <div onPointerDown={(e) => e.stopPropagation()} className="absolute right-3 top-3 flex items-center gap-1.5">
      {editing && onHistory && (
        <button
          type="button"
          onClick={onHistory}
          className="inline-flex h-8 items-center gap-1.5 rounded-chip border border-border bg-surface px-2.5 text-xs font-medium text-ink-secondary shadow-sm transition-colors duration-150 hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3l2 1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          History
        </button>
      )}
      {editing && onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-8 items-center gap-1.5 rounded-chip border border-border bg-surface px-2.5 text-xs font-medium text-ink-secondary shadow-sm transition-colors duration-150 hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          Add person
        </button>
      )}
      {editing && canReset && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-8 items-center rounded-chip border border-border bg-surface px-2.5 text-xs font-medium text-ink-secondary shadow-sm transition-colors duration-150 hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Reset edits
        </button>
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={editing}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-chip px-3 text-xs font-semibold shadow-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          editing
            ? 'bg-primary text-primary-fg hover:bg-primary-hover'
            : 'border border-border bg-surface text-ink-secondary hover:border-border-strong hover:text-ink',
        )}
      >
        {editing ? (
          <>
            <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Done
          </>
        ) : (
          <>
            <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <path d="M11 2.5l2.5 2.5L6 12.5l-3 .5.5-3L11 2.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Edit layout
          </>
        )}
      </button>
    </div>
  )
}

// The drawn tree, isolated in a memo so panning/zooming (which only touch the
// imperative transform + local zoom state) never reconcile this large subtree.
const TreeContent = memo(function TreeContent({
  org,
  query,
  domain,
  filtering,
  onSelect,
}: {
  org: Org
  query: string
  domain: DomainFilter
  filtering: boolean
  onSelect: (p: Person) => void
}) {
  return (
    <TreeNode person={org.root} org={org} query={query} domain={domain} filtering={filtering} onSelect={onSelect} isRoot />
  )
})

function CanvasControls({
  zoomPct,
  onOut,
  onIn,
  onReset,
  maximized,
  onToggleMax,
}: {
  zoomPct: number
  onOut: () => void
  onIn: () => void
  onReset: () => void
  maximized: boolean
  onToggleMax: () => void
}) {
  const btn =
    'inline-flex size-8 items-center justify-center rounded-chip border border-border bg-surface text-ink-secondary shadow-sm transition-colors duration-150 hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute bottom-3 left-3 flex items-center gap-1.5"
    >
      <button type="button" onClick={onOut} disabled={zoomPct <= SCALE_MIN * 100} aria-label="Zoom out" className={btn}>
        <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path d="M4 8h8" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onReset}
        aria-label="Zoom to fit"
        className="inline-flex h-8 min-w-12 items-center justify-center rounded-chip border border-border bg-surface px-2 text-xs font-medium text-ink-secondary tabular shadow-sm transition-colors duration-150 hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {zoomPct}%
      </button>
      <button type="button" onClick={onIn} disabled={zoomPct >= SCALE_MAX * 100} aria-label="Zoom in" className={btn}>
        <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path d="M8 4v8M4 8h8" strokeLinecap="round" />
        </svg>
      </button>
      {/* Maximise / minimise the canvas to fill the window. */}
      <button
        type="button"
        onClick={onToggleMax}
        aria-pressed={maximized}
        aria-label={maximized ? 'Minimise canvas' : 'Maximise canvas'}
        title={maximized ? 'Minimise (Esc)' : 'Maximise canvas'}
        className={cn(btn, 'ml-0.5')}
      >
        <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
          {maximized ? (
            <path d="M6 3v3H3M10 3v3h3M6 13v-3H3M10 13v-3h3" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </button>
    </div>
  )
}

// ── Edit mode: positioned, draggable graph with live-routing reporting lines ──
function PositionedTree({
  org,
  baseOrg,
  query,
  domain,
  filtering,
  onSelect,
  onAddPerson,
  positions,
  getScale,
  onCommitNode,
  onReparent,
}: {
  org: Org
  baseOrg: Org | null
  query: string
  domain: DomainFilter
  filtering: boolean
  onSelect: (p: Person) => void
  onAddPerson?: (managerName?: string) => void
  positions: PosMap
  getScale: () => number
  onCommitNode: (name: string, x: number, y: number) => void
  onReparent: (name: string, newManager: string, originalManager: string | null) => void
}) {
  // The effective org already has manager overrides baked in, so the child lists
  // and child→manager lookup read straight off it (no re-merging here).
  const { getChildren, managerOf } = useMemo(() => {
    const children = new Map<string, Child[]>()
    const mgrOf = new Map<string, string | null>()
    for (const p of [...org.people, ...org.openRoles]) {
      mgrOf.set(p.name, p.managerName)
      if (!p.managerName) continue
      const entry = { person: p, mentee: p.isMentored }
      const arr = children.get(p.managerName)
      if (arr) arr.push(entry)
      else children.set(p.managerName, [entry])
    }
    for (const arr of children.values()) arr.sort((a, b) => Number(a.mentee) - Number(b.mentee))
    return {
      getChildren: (name: string): Child[] => children.get(name) ?? [],
      managerOf: (name: string): string | null => mgrOf.get(name) ?? null,
    }
  }, [org])

  // The original (sheet) manager per person — selecting it in the picker clears
  // the override. Sourced from the unedited base org.
  const baseManagerOf = useMemo(() => {
    const m = new Map<string, string | null>()
    if (baseOrg) for (const p of [...baseOrg.people, ...baseOrg.openRoles]) m.set(p.name, p.managerName)
    return (name: string): string | null => m.get(name) ?? null
  }, [baseOrg])

  const layout = useMemo(() => computeLayout(org.root, getChildren), [org.root, getChildren])
  const nodeById = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout])

  // Candidate managers for the "Reports to" control: the root plus anyone with
  // reports, sorted. Per-card we drop the person and their own descendants, so a
  // change can never form a cycle.
  const { managerNames, isDescendantOf } = useMemo(() => {
    const names = new Set<string>([org.root.name])
    for (const n of layout.nodes) {
      const m = managerOf(n.person.name)
      if (m) names.add(m)
    }
    const ancestorCache = new Map<string, Set<string>>()
    const ancestorsOf = (name: string): Set<string> => {
      const cached = ancestorCache.get(name)
      if (cached) return cached
      const set = new Set<string>()
      let cur = managerOf(name)
      let guard = 0
      while (cur && !set.has(cur) && guard++ < 500) {
        set.add(cur)
        cur = managerOf(cur)
      }
      ancestorCache.set(name, set)
      return set
    }
    return {
      managerNames: [...names].sort((a, b) => a.localeCompare(b)),
      // candidate is below person ⇢ person is one of candidate's ancestors
      isDescendantOf: (candidate: string, person: string) => ancestorsOf(candidate).has(person),
    }
  }, [layout, managerOf, org.root.name])

  const computed = useMemo(
    () => new Map(layout.nodes.map((n) => [n.id, { x: n.x, y: n.y }])),
    [layout],
  )
  // A node's committed position: the user's dragged spot (by name) if any, else
  // the tidy seed (by unique node id).
  const posById = useCallback(
    (id: string) => {
      const node = nodeById.get(id)
      const dragged = node ? positions[node.person.name] : undefined
      return dragged ?? computed.get(id) ?? { x: 0, y: 0 }
    },
    [nodeById, positions, computed],
  )

  // Edges touching each node id — the only ones that need redrawing as it drags.
  const edgesByNode = useMemo(() => {
    const m = new Map<string, Edge[]>()
    const push = (k: string, e: Edge) => {
      const arr = m.get(k)
      if (arr) arr.push(e)
      else m.set(k, [e])
    }
    for (const e of layout.edges) {
      push(e.fromId, e)
      push(e.toId, e)
    }
    return m
  }, [layout])

  const pathRefs = useRef(new Map<string, SVGPathElement>())
  // The dragging node's live position, so edge math sees it without a React
  // render (cleared on commit, where state takes over).
  const dragLive = useRef<{ id: string; x: number; y: number } | null>(null)
  const livePos = useCallback(
    (id: string) => {
      const d = dragLive.current
      return d && d.id === id ? { x: d.x, y: d.y } : posById(id)
    },
    [posById],
  )

  const onMove = useCallback(
    (id: string, x: number, y: number) => {
      dragLive.current = { id, x, y }
      const es = edgesByNode.get(id)
      if (!es) return
      for (const e of es) {
        const el = pathRefs.current.get(edgeKey(e))
        if (el) el.setAttribute('d', edgePath(livePos(e.fromId), livePos(e.toId)))
      }
    },
    [edgesByNode, livePos],
  )
  const onCommit = useCallback(
    (name: string, x: number, y: number) => {
      dragLive.current = null
      onCommitNode(name, x, y)
    },
    [onCommitNode],
  )

  // Board large enough for every node, including any dragged past the seed bounds.
  const width = useMemo(() => {
    let w = layout.width
    for (const n of layout.nodes) w = Math.max(w, posById(n.id).x + NODE_W)
    return w
  }, [layout, posById])
  const height = useMemo(() => {
    let h = layout.height
    for (const n of layout.nodes) h = Math.max(h, posById(n.id).y + NODE_H)
    return h
  }, [layout, posById])

  return (
    <div className="relative" style={{ width, height }}>
      <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={width} height={height} aria-hidden>
        {layout.edges.map((e) => (
          <path
            key={edgeKey(e)}
            ref={(el) => {
              if (el) pathRefs.current.set(edgeKey(e), el)
              else pathRefs.current.delete(edgeKey(e))
            }}
            d={edgePath(posById(e.fromId), posById(e.toId))}
            fill="none"
            stroke="var(--color-border-strong)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={e.mentee ? '5 4' : undefined}
          />
        ))}
      </svg>

      {layout.nodes.map((n) => {
        const p = posById(n.id)
        const original = baseManagerOf(n.person.name)
        const current = managerOf(n.person.name)
        return (
          <DraggableNode
            key={n.id}
            node={n}
            x={p.x}
            y={p.y}
            dim={dimmed(n.person, query, domain, filtering)}
            getScale={getScale}
            onSelect={onSelect}
            onMove={onMove}
            onCommit={onCommit}
            currentManager={current}
            originalManager={original}
            managerOptions={managerNames.filter(
              (m) => m !== n.person.name && !isDescendantOf(m, n.person.name),
            )}
            onReparent={onReparent}
            onAddReport={onAddPerson ? () => onAddPerson(n.person.name) : undefined}
          />
        )
      })}
    </div>
  )
}

// A single card the user can grab and drag. It moves itself imperatively (no
// per-frame React render); the parent redraws the lines it touches. A press
// that doesn't travel far stays a click and opens the person's detail. In edit
// mode the footer carries a "Reports to" control for re-parenting.
function DraggableNode({
  node,
  x,
  y,
  dim,
  getScale,
  onSelect,
  onMove,
  onCommit,
  currentManager,
  originalManager,
  managerOptions,
  onReparent,
  onAddReport,
}: {
  node: LaidOutNode
  x: number
  y: number
  dim: boolean
  getScale: () => number
  onSelect: (p: Person) => void
  onMove: (id: string, x: number, y: number) => void
  onCommit: (name: string, x: number, y: number) => void
  currentManager: string | null
  originalManager: string | null
  managerOptions: string[]
  onReparent: (name: string, newManager: string, originalManager: string | null) => void
  onAddReport?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{
    cx: number
    cy: number
    ox: number
    oy: number
    nx: number
    ny: number
    moved: boolean
  } | null>(null)
  const suppressClick = useRef(false)

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.stopPropagation() // keep the canvas from starting a pan
    drag.current = { cx: e.clientX, cy: e.clientY, ox: x, oy: y, nx: x, ny: y, moved: false }
    // NB: pointer capture is deferred until the press actually becomes a drag
    // (below). Capturing here would swallow the trailing click, so a tap could
    // never open the detail dialog or fire on keyboard activation.
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const s = getScale() || 1
    const nx = d.ox + (e.clientX - d.cx) / s
    const ny = d.oy + (e.clientY - d.cy) / s
    if (!d.moved && Math.hypot(nx - d.ox, ny - d.oy) < DRAG_THRESHOLD_PX / s) return // still a click
    if (!d.moved && ref.current) {
      d.moved = true
      ref.current.style.zIndex = '20' // lift above siblings while moving
      ref.current.setPointerCapture(e.pointerId) // now follow the pointer anywhere
    }
    d.nx = nx
    d.ny = ny
    if (ref.current) ref.current.style.transform = `translate(${nx}px, ${ny}px)`
    onMove(node.id, nx, ny)
  }
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    if (d.moved) {
      ref.current?.releasePointerCapture(e.pointerId)
      if (ref.current) ref.current.style.zIndex = ''
      suppressClick.current = e.type !== 'pointercancel' // a real drag — eat the trailing click
      onCommit(node.person.name, d.nx, d.ny)
    }
    drag.current = null
  }
  const onClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      e.preventDefault()
      e.stopPropagation()
      suppressClick.current = false
    }
  }

  // Root reports to no one; everyone else can be re-parented.
  const canReparent = node.depth > 0 && currentManager != null
  const reparented = currentManager !== originalManager

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
      className="group absolute left-0 top-0 flex cursor-grab touch-none flex-col active:cursor-grabbing"
      style={{ transform: `translate(${x}px, ${y}px)`, width: NODE_W, minHeight: NODE_H }}
    >
      <div className={cn('flex flex-1 flex-col transition-opacity duration-150', dim && 'opacity-40')}>
        <PersonCard
          person={node.person}
          onSelect={onSelect}
          showDomain
          className={cn(
            'flex-1 cursor-grab active:cursor-grabbing',
            node.depth === 0 && 'border-primary/40 shadow-sm',
            reparented && 'border-primary/50',
          )}
        />
      </div>
      {/* Hover/focus "+" — adds a direct report to this card. Stops its own
          pointerdown so grabbing it never starts a drag. */}
      {onAddReport && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onAddReport()
          }}
          aria-label={`Add a report to ${node.person.name}`}
          className="absolute -right-2 -top-2 z-10 inline-flex size-6 items-center justify-center rounded-pill border border-border bg-surface text-ink-secondary opacity-0 shadow-sm transition-[opacity,color,border-color] duration-150 hover:border-primary hover:text-primary group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {canReparent && (
        <ReportsToSelect
          value={currentManager}
          options={managerOptions}
          changed={reparented}
          onChange={(mgr) => onReparent(node.person.name, mgr, originalManager)}
        />
      )}
    </div>
  )
}

// The inline "Reports to" picker shown on each card in edit mode. Its own
// pointerdown is stopped so opening the menu never starts a card drag or a pan.
function ReportsToSelect({
  value,
  options,
  changed,
  onChange,
}: {
  value: string
  options: string[]
  changed: boolean
  onChange: (manager: string) => void
}) {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        'mt-1 flex items-center gap-1.5 rounded-chip border bg-surface px-2 py-1',
        changed ? 'border-primary/50' : 'border-border',
      )}
    >
      <span className="shrink-0 text-2xs text-ink-muted">Reports to</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Reports to"
        className={cn(
          'min-w-0 flex-1 cursor-pointer truncate bg-transparent text-2xs font-semibold outline-none',
          changed ? 'text-primary-text' : 'text-ink-secondary',
        )}
      >
        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <svg aria-hidden viewBox="0 0 16 16" className="size-3 shrink-0 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

interface NodeChild {
  person: Person
  mentee: boolean
}

function TreeNode({
  person,
  org,
  query,
  domain,
  filtering,
  onSelect,
  isRoot = false,
}: {
  person: Person
  org: Org
  query: string
  domain: DomainFilter
  filtering: boolean
  onSelect: (p: Person) => void
  isRoot?: boolean
}) {
  const reports = reportsOf(org, person.name)
  const mentees = menteesOf(org, person.name)
  const children: NodeChild[] = [
    ...reports.map((p) => ({ person: p, mentee: false })),
    ...mentees.map((p) => ({ person: p, mentee: true })),
  ]
  const hasChildren = children.length > 0
  const [open, setOpen] = useState(true)
  const isDim = dimmed(person, query, domain, filtering)

  return (
    <Collapsible.Root open={hasChildren ? open : false} onOpenChange={setOpen}>
      <div className="flex flex-col items-center">
        {/* The card + its expand control */}
        <div className={cn('flex flex-col items-center transition-opacity duration-150', isDim && 'opacity-40')}>
          <div className={cn('w-56', (isRoot || hasChildren) && 'w-60')}>
            <PersonCard
              person={person}
              onSelect={onSelect}
              showDomain
              className={cn(
                (isRoot || hasChildren) && 'border-border-strong shadow-sm',
                isRoot && 'border-primary/40',
              )}
            />
          </div>
          {hasChildren && (
            <Collapsible.Trigger
              aria-label={open ? `Collapse ${person.name}'s team` : `Expand ${person.name}'s team`}
              className="group mt-1.5 inline-flex h-6 items-center gap-1 rounded-pill border border-border bg-surface px-2 text-2xs font-medium text-ink-secondary transition-colors duration-150 hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className="size-3 transition-transform duration-150 group-data-[panel-open]:rotate-90"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="tabular">{children.length}</span>
            </Collapsible.Trigger>
          )}
        </div>

        {/* Children: a stem from the parent down to a horizontal bus, then a
            centered row. Each child's bus segment is absolutely positioned to
            span its FULL column box (incl. the gutter), so adjacent segments
            meet into one continuous line regardless of card widths; the ends
            are clipped to a half. Drops are token-coloured; mentees dashed. */}
        {hasChildren && (
          <Collapsible.Panel className="overflow-hidden">
            <div className="flex flex-col items-center">
              {/* stem from the parent card down to the bus */}
              <div aria-hidden className="h-5 w-px bg-border" />
              <div className="flex justify-center">
                {children.map((child, i) => {
                  const first = i === 0
                  const last = i === children.length - 1
                  const only = children.length === 1
                  return (
                    <div
                      key={child.person.name}
                      className="relative flex flex-col items-center px-3 pt-5"
                    >
                      {/* horizontal bus segment (omit for an only child) */}
                      {!only && (
                        <span
                          aria-hidden
                          className={cn(
                            'absolute top-0 h-px bg-border',
                            first ? 'left-1/2 right-0' : last ? 'left-0 right-1/2' : 'left-0 right-0',
                          )}
                        />
                      )}
                      {/* vertical drop from the bus into the child card */}
                      <span
                        aria-hidden
                        className={cn(
                          'absolute left-1/2 top-0 h-5 -translate-x-1/2',
                          child.mentee
                            ? 'w-0 border-l border-dashed border-border-strong'
                            : 'w-px bg-border',
                        )}
                      />
                      {child.mentee && (
                        <span className="mb-1 inline-flex items-center rounded-pill border border-dashed border-border-strong px-2 py-0.5 text-2xs font-medium text-ink-muted">
                          mentee
                        </span>
                      )}
                      <TreeNode
                        person={child.person}
                        org={org}
                        query={query}
                        domain={domain}
                        filtering={filtering}
                        onSelect={onSelect}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </Collapsible.Panel>
        )}
      </div>
    </Collapsible.Root>
  )
}

// ── Narrow: indented disclosure outline ──────────────────────────────────────
function Outline({
  org,
  query,
  domain,
  filtering,
  onSelect,
}: {
  org: Org
  query: string
  domain: DomainFilter
  filtering: boolean
  onSelect: (p: Person) => void
}) {
  return (
    <div className="rounded-card border border-border bg-surface">
      <ul className="divide-y divide-border">
        <OutlineNode
          person={org.root}
          org={org}
          query={query}
          domain={domain}
          filtering={filtering}
          onSelect={onSelect}
          depth={0}
          mentee={false}
        />
      </ul>
    </div>
  )
}

function OutlineNode({
  person,
  org,
  query,
  domain,
  filtering,
  onSelect,
  depth,
  mentee,
}: {
  person: Person
  org: Org
  query: string
  domain: DomainFilter
  filtering: boolean
  onSelect: (p: Person) => void
  depth: number
  mentee: boolean
}) {
  const reports = reportsOf(org, person.name)
  const mentees = menteesOf(org, person.name)
  const children: NodeChild[] = [
    ...reports.map((p) => ({ person: p, mentee: false })),
    ...mentees.map((p) => ({ person: p, mentee: true })),
  ]
  const hasChildren = children.length > 0
  const [open, setOpen] = useState(true)
  const isDim = dimmed(person, query, domain, filtering)
  const count = descendantCount(org, person.name)
  const profile = useProfile(person)
  const { isManager } = useManagerAuth()

  // Indent by depth, capped so deep branches still fit at 360px.
  const indent = Math.min(depth, 5) * 14

  return (
    <li>
      <Collapsible.Root open={hasChildren ? open : false} onOpenChange={setOpen}>
        <div
          className={cn('flex items-stretch transition-opacity duration-150', isDim && 'opacity-40')}
          style={{ paddingLeft: indent }}
        >
          {/* Disclosure chevron (or a spacer to keep rows aligned) */}
          {hasChildren ? (
            <Collapsible.Trigger
              aria-label={open ? `Collapse ${person.name}'s team` : `Expand ${person.name}'s team`}
              className="group flex w-8 shrink-0 items-center justify-center self-stretch text-ink-muted transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className="size-3.5 transition-transform duration-150 group-data-[panel-open]:rotate-90"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Collapsible.Trigger>
          ) : (
            <span aria-hidden className="w-8 shrink-0" />
          )}

          {/* Row body opens the detail dialog */}
          <button
            type="button"
            onClick={() => onSelect(person)}
            aria-label={`${person.name}${person.specialty ? `, ${person.specialty}` : ''}${
              person.status && isManager ? `, ${statusShort(person.status)}` : ''
            }. View details.`}
            className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 py-2 pr-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Avatar name={person.name} photo={profile?.photo} className="size-8 text-xs" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-ink">{person.name}</span>
                {mentee && (
                  <span className="shrink-0 rounded-pill border border-dashed border-border-strong px-1.5 py-px text-2xs font-medium text-ink-muted">
                    mentee
                  </span>
                )}
              </span>
              {person.specialty && person.specialty !== '-' && (
                <span className="mt-0.5 flex items-center gap-1.5 text-2xs text-ink-muted">
                  <SpecialtyIcon kind={person.specialtyKind} className="size-3 shrink-0" />
                  <span className="truncate">{person.specialty}</span>
                </span>
              )}
              {person.status && isManager && (
                <span className="mt-1 flex">
                  <StatusPill status={person.status} month={person.statusMonth} />
                </span>
              )}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-2">
              {hasChildren && <span className="text-2xs text-ink-muted tabular">{count}</span>}
              {person.domain && <DomainDot domain={person.domain} className="size-2.5" />}
              {isManager && !person.isRoot && <EmploymentBadge type={person.employment} />}
            </span>
          </button>
        </div>

        {hasChildren && (
          <Collapsible.Panel className="overflow-hidden">
            <ul className="divide-y divide-border border-t border-border">
              {children.map((child) => (
                <OutlineNode
                  key={child.person.name}
                  person={child.person}
                  org={org}
                  query={query}
                  domain={domain}
                  filtering={filtering}
                  onSelect={onSelect}
                  depth={depth + 1}
                  mentee={child.mentee}
                />
              ))}
            </ul>
          </Collapsible.Panel>
        )}
      </Collapsible.Root>
    </li>
  )
}
