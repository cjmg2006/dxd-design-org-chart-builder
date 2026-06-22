import type {
  RawRow,
  Person,
  Domain,
  EmploymentType,
  PersonStatus,
  SpecialtyKind,
  WorkstreamChip,
} from './types'
import { CURRENT_WS_OVERRIDES, WS_MAP } from './constants'

// ── CSV parsing (handles quoted fields + escaped quotes) ─────────────────────
export function parseCSV(text: string): RawRow[] {
  const lines = text.trim().split('\n')
  if (lines.length === 0) return []
  const headers = parseRow(lines[0]).map((h) => h.trim())
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const vals = parseRow(line)
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => {
        obj[h] = (vals[i] || '').trim()
      })
      return obj as RawRow
    })
}

function parseRow(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        q = !q
      }
    } else if (c === ',' && !q) {
      result.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  result.push(cur)
  return result
}

// ── Reporting line: "Gloria Chua" or "Eve Gan (mentor)" ──────────────────────
export function parseRO(ro: string): { parent: string | null; isMentor: boolean } {
  const m = (ro || '').match(/^(.+?)\s*\((?:[Mm]entor)\)$/)
  if (m) return { parent: m[1].trim(), isMentor: true }
  const parent = (ro || '').trim()
  return { parent: parent || null, isMentor: false }
}

// ── Status from remarks (transfer direction depends on phrasing) ─────────────
export function parseStatus(remarks: string, name: string): PersonStatus {
  const r = (remarks || '').toLowerCase()
  if (/mat(?:ernity)? leave|on leave/i.test(r)) return 'leave'
  if (/joining/i.test(r)) return 'joining'
  if (/science centre|moving to science/i.test(r)) {
    return /vanessa/i.test(name || '') ? 'xfer-out' : 'departing'
  }
  // "transferring from X" / "officially transferring" → arriving INTO current ws
  if (/transferring from|officially transferring/i.test(r)) return 'xfer-in'
  // "moving to X" → leaving current ws for X
  if (/moving to parents|moving to students|moving to/i.test(r)) return 'xfer-out'
  return null
}

const MONTHS =
  /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/i

export function parseMonth(remarks: string): string {
  const m = (remarks || '').match(MONTHS)
  if (m) {
    const abbrev = m[1].slice(0, 3)
    return abbrev[0].toUpperCase() + abbrev.slice(1).toLowerCase()
  }
  return 'TBD'
}

// ── Employment type ──────────────────────────────────────────────────────────
export function empType(raw: string): EmploymentType {
  const t = (raw || '').trim().toLowerCase()
  if (t.includes('consult')) return 'Consultant'
  if (t.includes('apprentice')) return 'Apprentice'
  if (t.includes('intern')) return 'Intern'
  if (t === 'ar') return 'AR'
  if (t === 'gt') return 'GT'
  return 'GT'
}

// ── Domain inferred from workstream text ─────────────────────────────────────
export function domainFromWS(ws: string): Domain {
  const l = (ws || '').toLowerCase()
  if (/teacher/.test(l)) return 'Teachers'
  if (/holistic student|hsd|sls|student learning|langbuddy/.test(l)) return 'Students'
  if (/parents gateway/.test(l)) return 'Parents'
  if (/flow ds|markly|all ears|edupass|geospatial|oneplacement|seab|platform/.test(l))
    return 'Platforms'
  if (/finance|hr|school platform/.test(l)) return 'HQ'
  return 'HQ'
}

export function specialtyKind(specialty: string): SpecialtyKind {
  const l = (specialty || '').toLowerCase()
  if (l.includes('product')) return 'product'
  if (l.includes('service')) return 'service'
  if (l.includes('engineer')) return 'engineer'
  if (l.includes('manager') || l.includes('head') || l.includes('lead')) return 'manager'
  return 'other'
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function displayWorkstreams(name: string, workstreams: string): string {
  return CURRENT_WS_OVERRIDES[name] || workstreams || ''
}

export function workstreamChips(wsField: string): WorkstreamChip[] {
  if (!wsField || wsField === '-') return []
  return wsField.split(',').map((raw) => {
    const full = raw.trim()
    const key = full
      .toLowerCase()
      .replace(/\s*\(.*?\)/g, '')
      .trim()
    const mapped = WS_MAP[key]
    if (mapped) return { label: mapped.label, full, domain: mapped.domain }
    const label = full.length > 16 ? full.slice(0, 15) + '…' : full
    return { label, full, domain: domainFromWS(full) }
  })
}

// ── Normalize a raw row (+ flags) into a Person ──────────────────────────────
export function normalizePerson(row: RawRow): Person {
  const name = (row.Name || '').trim()
  const isOpenRole = /^\[/.test(name)
  const workstreamsRaw = row.Workstreams || ''
  const workstreams = displayWorkstreams(name, workstreamsRaw)
  const { parent, isMentor } = parseRO(row.RO)
  const status = isOpenRole ? null : parseStatus(row.Remarks, name)
  return {
    name,
    slug: slugify(name) || 'open-role',
    team: row.Team || '',
    specialty: row.Specialty || '',
    specialtyKind: specialtyKind(row.Specialty),
    workstreamsRaw,
    workstreams,
    workstreamChips: workstreamChips(workstreams),
    domain: domainFromWS(workstreams),
    employment: isOpenRole ? 'TBH' : empType(row['GT/AR/Intern']),
    reportsToRaw: row.RO || '',
    managerName: parent,
    isMentored: isMentor,
    status,
    statusMonth: status ? parseMonth(row.Remarks) : '',
    remarks: row.Remarks || '',
    isOpenRole,
  }
}
