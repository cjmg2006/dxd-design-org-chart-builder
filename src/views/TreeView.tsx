import { useCallback, useEffect, useRef, useState } from 'react'
import { Collapsible } from '@base-ui-components/react/collapsible'
import { useMediaQuery } from '@base-ui-components/react/unstable-use-media-query'
import type { Org, Person } from '@/data/types'
import { reportsOf, menteesOf, descendantCount } from '@/data/org'
import { isMatch, type DomainFilter, type ViewProps } from '@/lib/filter'
import { statusShort } from '@/lib/styles'
import { PersonCard } from '@/components/PersonCard'
import { DomainDot, EmploymentBadge, Initials, StatusPill } from '@/components/primitives'
import { SpecialtyIcon } from '@/components/SpecialtyIcon'
import { cn } from '@/lib/cn'

const ZOOM_MIN = 0.5
const ZOOM_MAX = 1.4
const ZOOM_STEP = 0.1

export function TreeView({ org, query, domain, onSelect }: ViewProps) {
  // Render the lightweight outline on narrow screens — never the wide canvas
  // (it would force two-dimensional page scrolling). Default to the outline
  // before the media query resolves so the first mount is the safe layout.
  const isWide = useMediaQuery('(min-width: 768px)', { defaultMatches: false })

  const filtering = query.trim().length > 0 || domain !== 'All'

  return (
    <div className="space-y-4">
      <Header org={org} />
      {isWide ? (
        <TreeCanvas org={org} query={query} domain={domain} filtering={filtering} onSelect={onSelect} />
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

// ── Desktop: drawn top-down tree ─────────────────────────────────────────────
function TreeCanvas({
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
  const [zoom, setZoom] = useState(1)
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // offsetWidth/Height are transform-invariant → always the natural size.
  const measure = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    setNatural((n) =>
      n.w === cv.offsetWidth && n.h === cv.offsetHeight ? n : { w: cv.offsetWidth, h: cv.offsetHeight },
    )
  }, [])

  const fit = useCallback(() => {
    const c = containerRef.current
    const cv = canvasRef.current
    if (!c || !cv || !cv.offsetWidth) return
    const usable = c.clientWidth - 48 // minus the p-6 gutter
    setZoom(Math.round(Math.min(1, Math.max(ZOOM_MIN, usable / cv.offsetWidth)) * 100) / 100)
  }, [])

  // Fit to width on load; re-measure on tree-shape changes; re-fit on resize.
  useEffect(() => {
    measure()
    fit()
    const cv = canvasRef.current
    const ro = new ResizeObserver(() => measure())
    if (cv) ro.observe(cv)
    const onResize = () => fit()
    window.addEventListener('resize', onResize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [measure, fit])

  // Once fitted, centre the horizontal scroll so the root (top of the org) is
  // what you land on — not a left-hand subtree. Runs once.
  const didCenterRef = useRef(false)
  useEffect(() => {
    if (didCenterRef.current || !natural.w) return
    const c = containerRef.current
    if (!c) return
    const id = requestAnimationFrame(() => {
      c.scrollLeft = (c.scrollWidth - c.clientWidth) / 2
      didCenterRef.current = true
    })
    return () => cancelAnimationFrame(id)
  }, [natural, zoom])

  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 10) / 10))
  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 10) / 10))

  return (
    <div className="space-y-3">
      <ZoomControls zoom={zoom} onOut={zoomOut} onIn={zoomIn} onReset={fit} />

      {/* The canvas can be wider than the viewport on a big org — scroll it
          locally so the page never 2D-scrolls. The inner wrapper is sized to the
          SCALED dimensions so transform: scale leaves no phantom scroll area. */}
      <div ref={containerRef} className="overflow-x-auto rounded-card border border-border bg-surface p-6">
        <div
          className="mx-auto overflow-hidden"
          style={natural.w ? { width: natural.w * zoom, height: natural.h * zoom } : undefined}
        >
          <div
            ref={canvasRef}
            className="w-max origin-top-left"
            style={{ transform: `scale(${zoom})` }}
          >
            <TreeNode
              person={org.root}
              org={org}
              query={query}
              domain={domain}
              filtering={filtering}
              onSelect={onSelect}
              isRoot
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ZoomControls({
  zoom,
  onOut,
  onIn,
  onReset,
}: {
  zoom: number
  onOut: () => void
  onIn: () => void
  onReset: () => void
}) {
  const btn =
    'inline-flex size-8 items-center justify-center rounded-chip border border-border bg-surface text-ink-secondary transition-colors duration-150 hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={onOut} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out" className={btn}>
        <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path d="M4 8h8" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onReset}
        aria-label="Reset zoom to fit"
        className="inline-flex h-8 min-w-12 items-center justify-center rounded-chip border border-border bg-surface px-2 text-xs font-medium text-ink-secondary tabular transition-colors duration-150 hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" onClick={onIn} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in" className={btn}>
        <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path d="M8 4v8M4 8h8" strokeLinecap="round" />
        </svg>
      </button>
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
              person.status ? `, ${statusShort(person.status)}` : ''
            }. View details.`}
            className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 py-2 pr-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Initials name={person.name} className="size-8 text-xs" />
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
              {person.status && (
                <span className="mt-1 flex">
                  <StatusPill status={person.status} month={person.statusMonth} />
                </span>
              )}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-2">
              {hasChildren && <span className="text-2xs text-ink-muted tabular">{count}</span>}
              {person.domain && <DomainDot domain={person.domain} className="size-2.5" />}
              <EmploymentBadge type={person.employment} />
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
