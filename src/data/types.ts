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
  /** Where a transfer / departure is headed, e.g. "Parent Gateway". Override-only
   *  (not parsed from the sheet); empty/absent for most people. */
  statusDestination?: string
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

/** A person added by the user (not present in the sheet). Stored in full because
 *  there's no sheet row to fall back to; manager / domain / product overrides
 *  still layer on top via the override maps below, keyed by the same name. */
export interface AddedPerson {
  name: string
  /** The person they report to (always set — added people hang off a manager). */
  managerName: string
  domain: Domain
  /** Workstream / product string ('' = no product). */
  workstreams: string
  specialty: string
  employment: EmploymentType
}

/** An in-app edit of a person's "human" profile (the detail page). When present
 *  for a person it is the full source of truth for their profile text (the baked
 *  data in data/profiles.ts is only the starting point); photos live in their own
 *  store (api/profile-photo.ts) and are referenced by the `photo` marker. */
export interface ProfileOverride {
  emoji?: string
  jobTitle?: string
  /** 'custom' → a photo saved at /api/profile-photo; '' → explicitly none (hide
   *  the baked photo); absent → fall back to the baked photo. */
  photo?: 'custom' | ''
  /** Bumped on each upload so other clients' cached <img> refetches. */
  photoV?: number
  personality?: string[]
  askMeAbout?: string[]
  workingStyle?: string[]
  communicationStyle?: string[]
  role?: string[]
  responsibilities?: string[]
  successLooksLike?: string[]
  supportNeeded?: string[]
  petPeeves?: string[]
  otherCommitments?: string[]
  specialisedIn?: string[]
  contributions?: string[]
  joined?: string
  email?: string
  linkedin?: string
  portfolio?: string
}

/** An override of a person's status badge — state, timing, and (for transfers /
 *  departures) where they're headed. When present it wins over the status parsed
 *  from the sheet remarks. A null `status` explicitly clears the badge. */
export interface StatusOverride {
  status: PersonStatus
  /** Month label, e.g. "Jul" ('' / 'TBD' render as "date TBD"). */
  month?: string
  /** Destination, e.g. "Parent Gateway" (shown for transfers / departures). */
  destination?: string
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
  /** Re-squadded people: name → new squad/team string ('' clears the squad). */
  teams: Record<string, string>
  /** Status-badge overrides (state / timing / destination), keyed by name. */
  statuses: Record<string, StatusOverride>
  /** People the user added by hand, keyed by name. */
  additions: Record<string, AddedPerson>
  /** Sheet people hidden from the chart (added people are dropped outright instead). */
  removed: Record<string, true>
  /** In-app profile edits (detail page), keyed by name. */
  profiles: Record<string, ProfileOverride>
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
