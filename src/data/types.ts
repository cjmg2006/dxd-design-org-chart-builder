// Domain model for the DXD org chart. Ported from the legacy index.html, typed.

export type Domain = 'Teachers' | 'Students' | 'Parents' | 'Platforms' | 'HQ'

export type EmploymentType =
  | 'GT'
  | 'AR'
  | 'Intern'
  | 'Apprentice'
  | 'Consultant'
  | 'TBH'

export type PersonStatus =
  | 'leave'
  | 'joining'
  | 'departing'
  | 'xfer-in'
  | 'xfer-out'
  | null

export type SpecialtyKind =
  | 'product'
  | 'service'
  | 'engineer'
  | 'manager'
  | 'other'

/** A raw row as parsed from the Google Sheet CSV (header-keyed). */
export interface RawRow {
  Name: string
  Team: string
  Domain: string
  Workstreams: string
  RO: string
  'GT/AR/Intern': string
  Specialty: string
  Remarks: string
  [key: string]: string
}

/** A normalized person — the unit every view renders. */
export interface Person {
  name: string
  slug: string
  team: string
  specialty: string
  specialtyKind: SpecialtyKind
  /** Original Workstreams field from the sheet. */
  workstreamsRaw: string
  /** Display workstreams (after current-workstream overrides). */
  workstreams: string
  /** Parsed individual workstream chips. */
  workstreamChips: WorkstreamChip[]
  domain: Domain
  employment: EmploymentType
  /** Raw RO field, e.g. "Gloria Chua" or "Eve Gan (mentor)". */
  reportsToRaw: string
  /** Parsed manager name (the parent in the reporting tree), or null. */
  managerName: string | null
  /** True when the RO field marked this as a mentorship, not a report line. */
  isMentored: boolean
  status: PersonStatus
  /** Month label parsed from remarks for a status, e.g. "Jul". */
  statusMonth: string
  remarks: string
  /** True for open-role placeholders (names like "[Senior PD]"). */
  isOpenRole: boolean
}

export interface WorkstreamChip {
  label: string
  full: string
  domain: Domain
}

/** A workstream subgroup within a domain (Directory view). */
export interface WorkstreamGroup {
  key: string
  people: Person[]
}

/** A domain section: its workstream subgroups (Directory view). */
export interface DomainGroup {
  domain: Domain
  groups: WorkstreamGroup[]
  count: number
}

/** Reports + mentees hanging off a person (the hierarchy). */
export interface Reports {
  reports: Person[]
  mentees: Person[]
}

/** An incoming-transfer placeholder shown at the destination workstream. */
export interface TransferGhost {
  person: Person
  destWorkstream: string
}

/** User overrides applied on top of the sheet-derived org, persisted per browser.
 *  Only customised people are stored; everyone else falls back to the sheet. */
export interface OrgEdits {
  /** Cards the user has dragged on the edit canvas ({x,y}), keyed by name. */
  positions: Record<string, { x: number; y: number }>
  /** Re-parented people: name → new "Reports to" target. */
  managers: Record<string, string>
  /** Re-domained people: name → new domain. */
  domains: Record<string, Domain>
  /** Re-product people: name → new workstream string ('' clears the product). */
  workstreams: Record<string, string>
}

/** The fully-derived org, consumed by every view. */
export interface Org {
  /** Active people (incl. manual additions, excl. open-role placeholders). */
  people: Person[]
  /** Open-role placeholders ("[Senior PD]" etc.). */
  openRoles: Person[]
  /** Synthetic root (Keith Oh, Head of Design). */
  root: Person
  /** The leadership line directly under root, in display order. */
  leadership: Person[]
  byName: Map<string, Person>
  bySlug: Map<string, Person>
  /** name → direct reports + mentees. */
  childMap: Map<string, Reports>
  /** Everyone grouped by domain → workstream (flattened across managers). */
  domains: DomainGroup[]
  /** Incoming-transfer ghosts, by destination workstream key. */
  ghosts: TransferGhost[]
  /** Last successful sync time (set by the fetch layer). */
  syncedAt: Date | null
}
