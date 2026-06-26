import { useMemo } from 'react'
import type { Org, Person } from '@/data/types'
import { descendantCount } from '@/data/org'
import { matchesQuery, type ViewProps } from '@/lib/filter'
import { DOMAIN_LABEL } from '@/data/constants'
import { DOMAIN_STYLE } from '@/lib/styles'
import { PersonCard } from '@/components/PersonCard'
import { Avatar, DomainDot } from '@/components/primitives'
import { useProfile } from '@/data/profileViewer'
import { cn } from '@/lib/cn'

interface GhostEntry {
  person: Person
  from: string
}
interface VisibleGroup {
  key: string
  people: Person[]
  ghosts: GhostEntry[]
}

export function DirectoryView({ org, query, domain, onSelect }: ViewProps) {
  // Map each grouped person to their workstream key, so a transfer ghost is not
  // shown in a group the person already belongs to (handles live-data drift).
  const nameToGroupKey = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of org.domains) for (const g of d.groups) for (const p of g.people) m.set(p.name, g.key)
    return m
  }, [org])

  const visibleDomains = useMemo(() => {
    return org.domains
      .filter((d) => domain === 'All' || d.domain === domain)
      .map((d) => {
        const groups: VisibleGroup[] = d.groups
          .map((g) => {
            const people = g.people.filter((p) => matchesQuery(p, query))
            const ghosts: GhostEntry[] = org.ghosts
              .filter(
                (gh) =>
                  gh.destWorkstream === g.key &&
                  nameToGroupKey.get(gh.person.name) !== g.key &&
                  matchesQuery(gh.person, query),
              )
              .map((gh) => ({ person: gh.person, from: gh.person.workstreams || 'previous team' }))
            return { key: g.key, people, ghosts }
          })
          .filter((g) => g.people.length + g.ghosts.length > 0)
        return { domain: d.domain, groups, total: groups.reduce((n, g) => n + g.people.length, 0) }
      })
      .filter((d) => d.groups.length > 0)
  }, [org, domain, query, nameToGroupKey])

  const openRoles = org.openRoles.filter((p) => matchesQuery(p, query) && (domain === 'All'))

  const nothing = visibleDomains.length === 0 && openRoles.length === 0

  return (
    <div className="space-y-8">
      <LeadershipSpine org={org} onSelect={onSelect} dimmed={query.trim().length > 0} />

      {nothing ? (
        <EmptyState query={query} />
      ) : (
        <div className="space-y-9">
          {visibleDomains.map((d) => (
            <section key={d.domain} aria-labelledby={`dom-${d.domain}`}>
              <h2
                id={`dom-${d.domain}`}
                className={cn('flex items-center gap-2 text-sm font-semibold', DOMAIN_STYLE[d.domain].text)}
              >
                <DomainDot domain={d.domain} className="size-2.5" />
                {DOMAIN_LABEL[d.domain]}
                <span className="text-ink-muted">· {d.total}</span>
              </h2>
              <div className="mt-3 space-y-5 border-t border-border pt-4">
                {d.groups.map((g) => (
                  <div key={g.key}>
                    {g.key !== d.domain && (
                      <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-muted">
                        {g.key}
                      </h3>
                    )}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                      {g.people.map((p) => (
                        <PersonCard
                          key={p.name}
                          person={p}
                          onSelect={onSelect}
                          showDomain={false}
                          showManager
                        />
                      ))}
                      {g.ghosts.map((gh) => (
                        <PersonCard
                          key={`ghost-${gh.person.name}`}
                          person={gh.person}
                          onSelect={onSelect}
                          ghostFrom={gh.from}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {openRoles.length > 0 && (
            <section aria-labelledby="dom-open">
              <h2 id="dom-open" className="flex items-center gap-2 text-sm font-semibold text-ink-secondary">
                <span aria-hidden className="size-2.5 rounded-pill border border-dashed border-border-strong" />
                Open roles
                <span className="text-ink-muted">· {openRoles.length}</span>
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {openRoles.map((p, i) => (
                  <PersonCard key={`${p.name}-${i}`} person={p} onSelect={onSelect} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function LeadershipSpine({
  org,
  onSelect,
  dimmed,
}: {
  org: Org
  onSelect: (p: Person) => void
  dimmed: boolean
}) {
  return (
    <section aria-labelledby="leadership" className={cn(dimmed && 'opacity-60')}>
      <h2 id="leadership" className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">
        Leadership
      </h2>
      <div className="mt-2 flex flex-wrap items-stretch gap-3">
        <LeadCard person={org.root} subtitle={org.root.specialty} onSelect={onSelect} isRoot />
        {org.leadership.map((p) => (
          <LeadCard
            key={p.name}
            person={p}
            subtitle={`${p.specialty} · ${descendantCount(org, p.name)} in team`}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  )
}

function LeadCard({
  person,
  subtitle,
  onSelect,
  isRoot = false,
}: {
  person: Person
  subtitle: string
  onSelect: (p: Person) => void
  isRoot?: boolean
}) {
  const profile = useProfile(person)
  return (
    <button
      type="button"
      onClick={() => onSelect(person)}
      aria-label={`${person.name}, ${subtitle}. View details.`}
      className={cn(
        'flex min-w-[14rem] flex-1 items-center gap-3 rounded-card border bg-surface p-3 text-left transition-shadow duration-150 hover:shadow-md',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        isRoot ? 'border-primary/40' : 'border-border hover:border-border-strong',
      )}
    >
      <Avatar name={person.name} photo={profile?.photo} className="size-9 text-sm" />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink">{person.name}</div>
        <div className="truncate text-2xs text-ink-muted">{subtitle}</div>
      </div>
    </button>
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
