import type {
  RawRow,
  Person,
  Org,
  OrgEdits,
  AddedPerson,
  Reports,
  DomainGroup,
  WorkstreamGroup,
  TransferGhost,
} from './types'
import { normalizePerson, workstreamChips } from './parse'
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

  return deriveOrg(people, openRoles, root)
}

/** Re-apply the relationship/grouping derivation over an explicit set of people.
 *  Shared by buildOrg (from the sheet) and applyEdits (with overrides baked in),
 *  so a single code path owns childMap / leadership / domain grouping / ghosts. */
function deriveOrg(people: Person[], openRoles: Person[], root: Person): Org {
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

/** Turn a user-added person into a full Person, then let the override maps layer
 *  on top exactly as they do for sheet people. Domain is taken verbatim (it isn't
 *  always inferable from the chosen product). */
function personFromAddition(a: AddedPerson): Person {
  const base = normalizePerson({
    Name: a.name,
    Team: '',
    Domain: a.domain,
    Workstreams: a.workstreams,
    RO: a.managerName,
    'GT/AR/Intern': a.employment,
    Specialty: a.specialty,
    Remarks: '',
  } as RawRow)
  return { ...base, domain: a.domain }
}

/** Return a new Org with the user's additions + overrides (manager / domain /
 *  workstream) baked in, then fully re-derived — so every view reflects the edits.
 *  A sheet person with no override passes through untouched (same object identity). */
export function applyEdits(org: Org, edits: OrgEdits): Org {
  const apply = (p: Person): Person => {
    const mgr = edits.managers[p.name]
    const dom = edits.domains[p.name]
    const ws = edits.workstreams[p.name]
    if (mgr === undefined && dom === undefined && ws === undefined) return p
    const next: Person = { ...p }
    if (mgr !== undefined) {
      // A manual line is a hard report (never a mentorship).
      next.managerName = mgr || null
      next.reportsToRaw = mgr
      next.isMentored = false
    }
    if (dom !== undefined) next.domain = dom
    if (ws !== undefined) {
      next.workstreams = ws
      next.workstreamsRaw = ws
      next.workstreamChips = workstreamChips(ws)
    }
    return next
  }
  // Added people join the sheet people before overrides apply, so a card added
  // here can still be re-parented / re-domained / dragged like anyone else.
  const added = Object.values(edits.additions).map(personFromAddition)
  // Removed people drop out entirely (the delete handler promotes their reports
  // to their manager first, so the tree stays connected — see PersonDetail).
  const removed = edits.removed ?? {}
  const keep = (p: Person) => !removed[p.name]
  const people = [...org.people, ...added].map(apply).filter(keep)
  const openRoles = org.openRoles.map(apply).filter(keep)
  // Guard against a manager override (or stale shared edit) pointing at someone
  // who's since been removed: re-home the orphan onto the root rather than
  // letting them vanish from the tree (their manager card no longer exists).
  const names = new Set<string>([org.root.name, ...people.map((p) => p.name), ...openRoles.map((p) => p.name)])
  const rehome = (p: Person): Person =>
    p.managerName && !names.has(p.managerName)
      ? { ...p, managerName: org.root.name, reportsToRaw: org.root.name, isMentored: false }
      : p
  const derived = deriveOrg(people.map(rehome), openRoles.map(rehome), org.root)
  derived.syncedAt = org.syncedAt
  return derived
}

/** Valid "Reports to" targets for a person: the root plus anyone who manages
 *  someone, minus the person and their own descendants (so a re-parent can never
 *  form a cycle). Used by both the detail dialog and the edit-canvas picker. */
export function managerCandidates(org: Org, personName: string): string[] {
  const all = [...org.people, ...org.openRoles]
  const mgrOf = new Map<string, string | null>(all.map((p) => [p.name, p.managerName]))
  const names = new Set<string>([org.root.name])
  for (const p of all) if (p.managerName) names.add(p.managerName)
  // candidate sits below person ⇢ person appears in candidate's manager chain.
  const isDescendantOfPerson = (candidate: string): boolean => {
    let cur = mgrOf.get(candidate) ?? null
    let guard = 0
    while (cur && guard++ < 500) {
      if (cur === personName) return true
      cur = mgrOf.get(cur) ?? null
    }
    return false
  }
  return [...names]
    .filter((n) => n !== personName && !isDescendantOfPerson(n))
    .sort((a, b) => a.localeCompare(b))
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
function descendantCountIn(
  childMap: Map<string, Reports>,
  name: string,
  // Guard against a cyclic override (e.g. a stale persisted re-parent) hanging
  // the recursion — each name is counted at most once.
  seen: Set<string> = new Set(),
): number {
  if (seen.has(name)) return 0
  seen.add(name)
  const direct = childMap.get(name)?.reports ?? []
  let total = direct.length
  for (const r of direct) total += descendantCountIn(childMap, r.name, seen)
  return total
}
