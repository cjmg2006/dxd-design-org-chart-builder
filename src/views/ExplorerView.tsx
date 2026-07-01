import { useEffect, useMemo, useState } from 'react'
import { useMediaQuery } from '@base-ui-components/react/unstable-use-media-query'
import type { Org, Person } from '@/data/types'
import { managerOf, menteesOf, peersOf, reportsOf } from '@/data/org'
import { isMatch, type ViewProps } from '@/lib/filter'
import { DOMAIN_LABEL, DOMAIN_ORDER } from '@/data/constants'
import { DOMAIN_STYLE, EMPLOYMENT_LABEL } from '@/lib/styles'
import { Avatar, DomainDot, EmploymentBadge, StatusPill, WsChip } from '@/components/primitives'
import { useProfile, useProfileViewer } from '@/data/profileViewer'
import { useManagerAuth } from '@/data/managerAuth'
import { SpecialtyIcon } from '@/components/SpecialtyIcon'
import { cn } from '@/lib/cn'

interface DomainBucket {
  domain: (typeof DOMAIN_ORDER)[number]
  people: Person[]
}

export function ExplorerView({ org, query, domain }: ViewProps) {
  // Two-pane on >= md; single-column (list OR detail) below.
  const isWide = useMediaQuery('(min-width: 768px)', { defaultMatches: true })

  // Filtered people, grouped by domain (DOMAIN_ORDER) and sorted by name.
  const matches = useMemo(
    () => org.people.filter((p) => isMatch(p, query, domain)),
    [org, query, domain],
  )

  const grouped = useMemo<DomainBucket[]>(() => {
    return DOMAIN_ORDER.map((d) => ({
      domain: d,
      people: matches
        .filter((p) => p.domain === d)
        .sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((b) => b.people.length > 0)
  }, [matches])

  const defaultPerson = useMemo<Person | null>(() => {
    if (matches.length === 0) return null
    const lead = org.leadership[0]
    if (lead && matches.some((p) => p.name === lead.name)) return lead
    // First person in the grouped (domain-ordered, name-sorted) list.
    return grouped[0]?.people[0] ?? matches[0]
  }, [matches, grouped, org.leadership])

  const [selected, setSelected] = useState<Person | null>(defaultPerson)
  // On narrow screens, the detail panel replaces the list once a row is tapped.
  const [showDetail, setShowDetail] = useState(false)

  // Keep the selected person stable across filter changes when they still
  // match; otherwise fall back to the first match.
  useEffect(() => {
    if (selected && matches.some((p) => p.name === selected.name)) return
    setSelected(defaultPerson)
    setShowDetail(false)
  }, [matches, defaultPerson, selected])

  const onPick = (p: Person) => {
    setSelected(p)
    setShowDetail(true)
  }

  if (matches.length === 0) return <EmptyState query={query} />

  const list = (
    <PersonList
      grouped={grouped}
      total={matches.length}
      selected={selected}
      onPick={onPick}
    />
  )

  const detail = selected ? (
    <FocusPanel org={org} person={selected} onNavigate={onPick} />
  ) : (
    <FocusEmpty />
  )

  // ── Narrow: one column — list, or detail-with-back ────────────────────────
  if (!isWide) {
    if (showDetail && selected) {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowDetail(false)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-chip px-2 text-sm font-medium text-primary-text hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
              <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to list
          </button>
          {detail}
        </div>
      )
    }
    return list
  }

  // ── Desktop: master / detail ──────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[20rem_1fr] lg:grid-cols-[22rem_1fr]">
      <div className="md:sticky md:top-[7.5rem] md:max-h-[calc(100vh-9rem)] md:overflow-y-auto md:pr-1">
        {list}
      </div>
      <div className="min-w-0">{detail}</div>
    </div>
  )
}

// ── Left pane: searchable, grouped list of selectable rows ───────────────────
function PersonList({
  grouped,
  total,
  selected,
  onPick,
}: {
  grouped: DomainBucket[]
  total: number
  selected: Person | null
  onPick: (p: Person) => void
}) {
  return (
    <div>
      <p className="text-2xs font-semibold text-ink-muted">
        {total} {total === 1 ? 'person' : 'people'}
      </p>
      <div className="mt-3 space-y-6">
        {grouped.map((bucket) => (
          <section key={bucket.domain} aria-labelledby={`expl-dom-${bucket.domain}`}>
            <h2
              id={`expl-dom-${bucket.domain}`}
              className={cn(
                'flex items-center gap-2 text-2xs font-semibold',
                DOMAIN_STYLE[bucket.domain].text,
              )}
            >
              <DomainDot domain={bucket.domain} />
              {DOMAIN_LABEL[bucket.domain]}
              <span className="text-ink-muted">· {bucket.people.length}</span>
            </h2>
            <ul className="mt-1.5 space-y-1">
              {bucket.people.map((p) => (
                <li key={p.name}>
                  <PersonRow
                    person={p}
                    active={selected?.name === p.name}
                    onPick={onPick}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

function PersonRow({
  person,
  active,
  onPick,
}: {
  person: Person
  active: boolean
  onPick: (p: Person) => void
}) {
  const profile = useProfile(person)
  const { isManager } = useManagerAuth()
  return (
    <button
      type="button"
      onClick={() => onPick(person)}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-chip px-2 py-1.5 text-left transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        active
          ? 'bg-primary-soft text-primary-text'
          : 'text-ink hover:bg-surface-2',
      )}
    >
      <Avatar name={person.name} photo={profile?.photo} className="size-8 text-xs" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{person.name}</span>
        {person.specialty && person.specialty !== '-' && (
          <span className="mt-0.5 flex items-center gap-1.5 text-2xs text-ink-muted">
            <SpecialtyIcon kind={person.specialtyKind} className="size-3 shrink-0" />
            <span className="truncate">{person.specialty}</span>
          </span>
        )}
      </span>
      {person.status && isManager ? (
        <StatusPill status={person.status} month={person.statusMonth} destination={person.statusDestination} />
      ) : (
        <DomainDot domain={person.domain} />
      )}
      {isManager && !person.isRoot && <EmploymentBadge type={person.employment} />}
    </button>
  )
}

// ── Right pane: full context for the selected person (inline PersonDetail) ───
function FocusPanel({
  org,
  person,
  onNavigate,
}: {
  org: Org
  person: Person
  onNavigate: (p: Person) => void
}) {
  const manager = managerOf(org, person)
  const reports = reportsOf(org, person.name)
  const mentees = menteesOf(org, person.name)
  const peers = peersOf(org, person)
  const profile = useProfile(person)
  const { openProfile } = useProfileViewer()
  const { isManager } = useManagerAuth()

  const hasSpecialty = person.specialty && person.specialty !== '-'

  return (
    <div className="rounded-card border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <Avatar name={person.name} photo={profile?.photo} className="size-14 text-lg sm:size-16 sm:text-xl" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl text-ink">{person.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-secondary">
            {hasSpecialty && (
              <SpecialtyIcon kind={person.specialtyKind} className="size-3.5 shrink-0" />
            )}
            <span>
              {hasSpecialty ? person.specialty : 'Specialty not set'}
              {isManager && ` · ${EMPLOYMENT_LABEL[person.employment]}`}
            </span>
          </p>
        </div>
      </div>

      {person.status && isManager && (
        <div className="mt-4">
          <StatusPill status={person.status} month={person.statusMonth} destination={person.statusDestination} />
        </div>
      )}

      <button
        type="button"
        onClick={() => openProfile(person)}
        className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-chip border border-border bg-surface px-3 text-sm font-medium text-ink-secondary hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-9"
      >
        <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <circle cx="8" cy="5" r="2.6" />
          <path d="M3 13.2c0-2.4 2.2-3.7 5-3.7s5 1.3 5 3.7" strokeLinecap="round" />
        </svg>
        {profile ? 'View full profile' : 'Add a profile'}
      </button>

      <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 border-t border-border pt-5 text-sm">
        <Fact label="Domain">
          <span className="inline-flex items-center gap-1.5">
            <DomainDot domain={person.domain} />
            {person.domain}
          </span>
        </Fact>
        {person.workstreamChips.length > 0 && (
          <Fact label="Workstreams">
            <span className="flex flex-wrap gap-1">
              {person.workstreamChips.map((c, i) => (
                <WsChip key={`${c.label}-${i}`} chip={c} />
              ))}
            </span>
          </Fact>
        )}
        {person.team && person.team !== '-' && <Fact label="Squad">{person.team}</Fact>}
        <Fact label="Reports to">
          {manager ? (
            <PersonChip person={manager} onNavigate={onNavigate} />
          ) : (
            <span className="text-ink-muted">Top of chart</span>
          )}
        </Fact>
      </dl>

      {reports.length > 0 && (
        <RelatedGroup label={`Direct reports (${reports.length})`} people={reports} onNavigate={onNavigate} />
      )}
      {mentees.length > 0 && (
        <RelatedGroup label={`Mentees (${mentees.length})`} people={mentees} onNavigate={onNavigate} />
      )}
      {peers.length > 0 && (
        <RelatedGroup label={`Peers (${peers.length})`} people={peers} onNavigate={onNavigate} />
      )}

      {person.remarks && isManager && (
        <div className="mt-5 rounded-card bg-surface-2 p-3 text-sm text-ink-secondary">
          <span className="font-semibold text-ink-secondary">Note: </span>
          {person.remarks}
        </div>
      )}
    </div>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </>
  )
}

function PersonChip({ person, onNavigate }: { person: Person; onNavigate: (p: Person) => void }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(person)}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-border bg-surface px-2.5 py-1 text-sm text-ink transition-colors duration-150 hover:border-border-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-8"
    >
      <DomainDot domain={person.domain} />
      {person.name}
    </button>
  )
}

function RelatedGroup({
  label,
  people,
  onNavigate,
}: {
  label: string
  people: Person[]
  onNavigate: (p: Person) => void
}) {
  return (
    <div className="mt-5">
      <h3 className="text-2xs font-semibold text-ink-muted">{label}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {people.map((p) => (
          <PersonChip key={p.name} person={p} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  )
}

function FocusEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-card border border-dashed border-border py-16 text-center">
      <p className="text-sm font-medium text-ink">Select someone to see their context.</p>
      <p className="mt-1 text-xs text-ink-muted">Manager, peers, reports, and mentees.</p>
    </div>
  )
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border py-16 text-center">
      <p className="text-sm font-medium text-ink">No one matches “{query}”.</p>
      <p className="mt-1 text-xs text-ink-muted">Try a different name, specialty, or workstream.</p>
    </div>
  )
}
