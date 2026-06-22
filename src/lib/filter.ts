import type { Domain, Org, Person } from '@/data/types'

export type DomainFilter = Domain | 'All'

export function matchesQuery(p: Person, q: string): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return true
  return [p.name, p.specialty, p.workstreams, p.workstreamsRaw, p.remarks, p.domain, p.team]
    .join(' ')
    .toLowerCase()
    .includes(s)
}

export function matchesDomain(p: Person, d: DomainFilter): boolean {
  return d === 'All' || p.domain === d
}

export function isMatch(p: Person, q: string, d: DomainFilter): boolean {
  return matchesQuery(p, q) && matchesDomain(p, d)
}

/** Props every view receives from the app shell. */
export interface ViewProps {
  org: Org
  query: string
  domain: DomainFilter
  onSelect: (p: Person) => void
}
