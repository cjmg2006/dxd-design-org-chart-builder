import type {
  RawRow,
  Person,
  Org,
  Reports,
  DomainGroup,
  WorkstreamGroup,
  TransferGhost,
} from './types'
import { normalizePerson } from './parse'
import { ROOT, MANUAL_PEOPLE, DOMAIN_WS_ORDER, XFER_INCOMING_GHOSTS } from './constants'

/** Build the fully-derived Org from raw sheet rows. Pure + deterministic. */
export function buildOrg(rawRows: RawRow[]): Org {
  // Only add a manual person if the sheet doesn't already have them — once
  // someone is mirrored into the sheet, the manual entry must not duplicate it.
  const sheetNames = new Set(
    rawRows.map((r) => (r.Name || '').trim()).filter(Boolean),
  )
  const manualToAdd = (MANUAL_PEOPLE as RawRow[]).filter(
    (m) => !sheetNames.has(m.Name.trim()),
  )
  const normalized = [...rawRows, ...manualToAdd]
    .map(normalizePerson)
    .filter((p) => p.name)

  const openRoles = normalized.filter((p) => p.isOpenRole)
  const people = normalized.filter((p) => !p.isOpenRole)

  const root = normalizePerson(ROOT as RawRow)

  // Reporting tree: name → { reports, mentees }. Open roles included so the
  // tree can show TBH placeholders beneath their managers.
  const childMap = new Map<string, Reports>()
  const ensure = (n: string): Reports => {
    let r = childMap.get(n)
    if (!r) {
      r = { reports: [], mentees: [] }
      childMap.set(n, r)
    }
    return r
  }
  for (const p of [...people, ...openRoles]) {
    if (!p.managerName) continue
    const bucket = ensure(p.managerName)
    if (p.isMentored) bucket.mentees.push(p)
    else bucket.reports.push(p)
  }

  const byName = new Map<string, Person>(people.map((p) => [p.name, p]))
  byName.set(root.name, root)
  const bySlug = new Map<string, Person>(people.map((p) => [p.slug, p]))

  // Leadership = everyone reporting directly to the root, managers first.
  const rootReports = childMap.get(root.name)?.reports ?? []
  const leadership = [...rootReports].sort(
    (a, b) => descendantCountIn(childMap, b.name) - descendantCountIn(childMap, a.name),
  )

  const domains = groupByDomainAndWS(people)

  const ghosts: TransferGhost[] = XFER_INCOMING_GHOSTS.map((g) => {
    const person = byName.get(g.name)
    return person ? { person, destWorkstream: g.destWorkstream } : null
  }).filter((g): g is TransferGhost => g !== null)

  return {
    people,
    openRoles,
    root,
    leadership,
    byName,
    bySlug,
    childMap,
    domains,
    ghosts,
    syncedAt: null,
  }
}

/** Group everyone by domain → workstream (flattened across managers). Each
 *  person lands in the first matching workstream; leftovers fall to HQ/Other. */
function groupByDomainAndWS(people: Person[]): DomainGroup[] {
  const assigned = new Set<string>()
  const result: DomainGroup[] = []

  // People with no workstream (pure managers like Gloria/Darren) belong in the
  // leadership spine, not a domain section — exclude them from grouping here.
  const groupable = people.filter((p) => p.workstreams.trim())

  for (const domainDef of DOMAIN_WS_ORDER) {
    const groups: WorkstreamGroup[] = []
    for (const wsDef of domainDef.workstreams) {
      const members = groupable.filter(
        (p) => !assigned.has(p.name) && wsDef.test(p.workstreams),
      )
      if (members.length) {
        members.forEach((p) => assigned.add(p.name))
        groups.push({ key: wsDef.key, people: members })
      }
    }
    if (groups.length) {
      result.push({
        domain: domainDef.domain,
        groups,
        count: groups.reduce((n, g) => n + g.people.length, 0),
      })
    }
  }

  const rest = groupable.filter((p) => !assigned.has(p.name))
  if (rest.length) {
    const hq = result.find((d) => d.domain === 'HQ')
    const otherGroup: WorkstreamGroup = { key: 'Other', people: rest }
    if (hq) {
      hq.groups.push(otherGroup)
      hq.count += rest.length
    } else {
      result.push({ domain: 'HQ', groups: [otherGroup], count: rest.length })
    }
  }
  return result
}

// ── Hierarchy helpers ────────────────────────────────────────────────────────
export function reportsOf(org: Org, name: string): Person[] {
  return org.childMap.get(name)?.reports ?? []
}
export function menteesOf(org: Org, name: string): Person[] {
  return org.childMap.get(name)?.mentees ?? []
}
export function managerOf(org: Org, p: Person): Person | null {
  return p.managerName ? org.byName.get(p.managerName) ?? null : null
}
/** Peers = people sharing the same manager (excluding the person). */
export function peersOf(org: Org, p: Person): Person[] {
  if (!p.managerName) return []
  return (org.childMap.get(p.managerName)?.reports ?? []).filter((q) => q.name !== p.name)
}

/** Total descendants beneath a person (reports only, recursive). */
export function descendantCount(org: Org, name: string): number {
  return descendantCountIn(org.childMap, name)
}
function descendantCountIn(childMap: Map<string, Reports>, name: string): number {
  const direct = childMap.get(name)?.reports ?? []
  let total = direct.length
  for (const r of direct) total += descendantCountIn(childMap, r.name)
  return total
}
