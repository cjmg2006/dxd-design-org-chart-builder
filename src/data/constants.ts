import type { Domain } from './types'

// The published Google Sheet (CSV via gviz). Same source as the legacy chart —
// this stays a living, Sheet-driven document.
export const CSV_URL =
  'https://docs.google.com/spreadsheets/d/1Z9kA_wCxjMxGp-0oOohAaZbKj9lyJbFGJZRyt5ydEe4/gviz/tq?tqx=out:csv'

// Synthetic root — the incoming Head of Design (not a sheet row).
export const ROOT = {
  Name: 'Keith Oh',
  Team: '',
  Domain: '',
  Workstreams: '',
  RO: '',
  'GT/AR/Intern': 'GT',
  Specialty: 'Head of Design (Incoming)',
  Remarks: '',
}

// People not yet reflected in the source sheet — mirror into the sheet once added.
export const MANUAL_PEOPLE = [
  {
    Name: 'Yian Ling Cheong',
    Team: 'ESTL',
    Domain: 'Platforms',
    Workstreams: 'OnePlacement',
    RO: 'Darren Yeo',
    'GT/AR/Intern': 'Consultant',
    Specialty: 'Product Design',
    Remarks: '',
  },
]

// A person's *current* workstream when it differs from the sheet's Workstreams
// field (mid-transfer people whose sheet value still shows the origin).
export const CURRENT_WS_OVERRIDES: Record<string, string> = {
  'Vienna Neo': 'Parents Gateway',
}

// Incoming-transfer ghosts: a dashed placeholder shown at the workstream a
// person is transferring INTO, so the destination is visible at a glance.
export const XFER_INCOMING_GHOSTS: { name: string; destWorkstream: string }[] = [
  { name: 'Vienna Neo', destWorkstream: 'SLS' },
  { name: 'Emily Ong', destWorkstream: 'Parents Gateway' },
]

// Workstream → short chip label + domain. Lowercased keys (post normalisation).
export const WS_MAP: Record<string, { label: string; domain: Domain }> = {
  'teacher productivity': { label: 'Tchr Prod', domain: 'Teachers' },
  'teacher learning': { label: 'Tchr Learning', domain: 'Teachers' },
  'holistic student development': { label: 'HSD', domain: 'Students' },
  'student learning space': { label: 'SLS', domain: 'Students' },
  sls: { label: 'SLS', domain: 'Students' },
  'parents gateway': { label: 'Parents GW', domain: 'Parents' },
  langbuddy: { label: 'Langbuddy', domain: 'Students' },
  'flow ds': { label: 'Flow DS', domain: 'Platforms' },
  markly: { label: 'Markly', domain: 'Platforms' },
  'all ears': { label: 'All Ears', domain: 'Platforms' },
  edupass: { label: 'EduPass', domain: 'Platforms' },
  geospatial: { label: 'Geospatial', domain: 'Platforms' },
  oneplacement: { label: 'OnePlacement', domain: 'Platforms' },
  finance: { label: 'Finance', domain: 'HQ' },
  seab: { label: 'SEAB', domain: 'HQ' },
}

// Ordered domain → workstream layout for grouped views.
export const DOMAIN_WS_ORDER: {
  domain: Domain
  workstreams: { key: string; test: (ws: string) => boolean }[]
}[] = [
  {
    domain: 'Teachers',
    workstreams: [
      { key: 'Teacher Productivity', test: (ws) => /teacher productivity/i.test(ws) },
      {
        key: 'Teacher Learning',
        test: (ws) => /teacher learning/i.test(ws) && !/productivity/i.test(ws),
      },
    ],
  },
  {
    domain: 'Students',
    workstreams: [
      { key: 'Holistic Student Development', test: (ws) => /holistic|hsd/i.test(ws) },
      { key: 'SLS', test: (ws) => /sls|student learning space/i.test(ws) },
      { key: 'Langbuddy', test: (ws) => /langbuddy/i.test(ws) },
    ],
  },
  {
    domain: 'Parents',
    workstreams: [{ key: 'Parents Gateway', test: (ws) => /parents gateway/i.test(ws) }],
  },
  {
    domain: 'Platforms',
    workstreams: [
      { key: 'Flow DS', test: (ws) => /flow ds/i.test(ws) },
      { key: 'Markly', test: (ws) => /markly/i.test(ws) },
      { key: 'All Ears', test: (ws) => /all ears/i.test(ws) },
      { key: 'EduPass', test: (ws) => /edupass/i.test(ws) },
      { key: 'Geospatial', test: (ws) => /geospatial/i.test(ws) },
      { key: 'OnePlacement', test: (ws) => /oneplacement/i.test(ws) },
    ],
  },
  {
    domain: 'HQ',
    workstreams: [
      { key: 'Finance', test: (ws) => /finance/i.test(ws) },
      { key: 'SEAB', test: (ws) => /seab/i.test(ws) },
    ],
  },
]

// Domain → its workstream keys, for the editable "Product" picker in the detail
// dialog. Derived from DOMAIN_WS_ORDER so it stays in lockstep with the grouping.
// Keys lowercase to the WS_MAP entries, so a chosen product gets the right chip.
export const WORKSTREAMS_BY_DOMAIN = Object.fromEntries(
  DOMAIN_WS_ORDER.map((d) => [d.domain, d.workstreams.map((w) => w.key)]),
) as Record<Domain, string[]>

export const DOMAIN_ORDER: Domain[] = ['Teachers', 'Students', 'Parents', 'Platforms', 'HQ']

export const DOMAIN_LABEL: Record<Domain, string> = {
  Teachers: 'Teachers',
  Students: 'Students',
  Parents: 'Parents',
  Platforms: 'Platforms',
  HQ: 'HQ / Other',
}
