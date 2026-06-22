import { parseCSV } from './parse'
import { buildOrg } from './org'
import { CSV_URL } from './constants'
import type { Org } from './types'

/** Fetch the published sheet, parse the CSV, and derive the Org. */
export async function fetchOrg(signal?: AbortSignal): Promise<Org> {
  const resp = await fetch(CSV_URL, { signal })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const text = await resp.text()
  const rows = parseCSV(text).filter((r) => r.Name && r.Name.trim())
  if (!rows.length) throw new Error('No data rows found in the sheet')
  const org = buildOrg(rows)
  org.syncedAt = new Date()
  return org
}
