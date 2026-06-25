// Shared org-chart edits document — login-free, last-write-wins.
//
// One OrgEdits doc is persisted in Redis under a single key. GET returns it with
// a monotonically-increasing `version`; PUT overwrites the doc and bumps the
// version so polling clients can cheaply tell when someone else has changed it.
//
// Backed by an Upstash Redis (Vercel Marketplace) over its REST API. The
// credentials arrive as env vars when the integration is linked — see README.
// With no Redis configured the route 503s and the client silently falls back to
// per-browser localStorage, so the app keeps working before provisioning.

const KEY = 'orgchart:edits'
const VERSION_KEY = 'orgchart:version' // atomic INCR counter so versions stay strictly monotonic
const MAX_BYTES = 256_000 // reject oversized docs on this public, unauthenticated write
const EDIT_MAPS = ['positions', 'managers', 'domains', 'workstreams', 'additions', 'removed']
const EMPTY = { positions: {}, managers: {}, domains: {}, workstreams: {}, additions: {}, removed: {} }

const isPlainObject = (v: unknown): boolean =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Shallow shape check: each known edit map, if present, must be a plain object.
 *  Keeps a malformed/hostile payload (public endpoint) from breaking every client. */
function isValidEdits(data: unknown): boolean {
  if (!isPlainObject(data)) return false
  const d = data as Record<string, unknown>
  return EDIT_MAPS.every((k) => !(k in d) || isPlainObject(d[k]))
}

function env(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n]
    if (v) return v
  }
  return undefined
}

/** Run a single Redis command over the Upstash REST API. */
async function redis(command: (string | number)[]): Promise<unknown> {
  const url = env('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL', 'REDIS_REST_API_URL')
  const token = env('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN', 'REDIS_REST_API_TOKEN')
  if (!url || !token) throw new Error('NO_STORE')
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  })
  const json = (await res.json()) as { result?: unknown; error?: string }
  if (json.error) throw new Error(json.error)
  return json.result
}

export default async function handler(
  req: { method?: string; body?: unknown },
  res: {
    status: (code: number) => typeof res
    json: (body: unknown) => void
    setHeader: (k: string, v: string) => void
  },
) {
  try {
    if (req.method === 'GET') {
      const raw = (await redis(['GET', KEY])) as string | null
      const doc = raw ? JSON.parse(raw) : { version: 0, data: EMPTY, updatedAt: null }
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json(doc)
    }

    if (req.method === 'PUT') {
      const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) as {
        data?: unknown
      }
      const data = body.data ?? EMPTY
      const serialized = JSON.stringify(data)
      if (serialized.length > MAX_BYTES) {
        return res.status(413).json({ error: 'Edits document too large' })
      }
      if (!isValidEdits(data)) {
        return res.status(400).json({ error: 'Invalid edits shape' })
      }
      // Atomic, strictly-monotonic version (INCR) — a separate read-then-set would
      // let two concurrent PUTs collide on the same number and defeat poll detection.
      const version = (await redis(['INCR', VERSION_KEY])) as number
      const updatedAt = new Date().toISOString()
      await redis(['SET', KEY, JSON.stringify({ version, data, updatedAt })])
      return res.status(200).json({ version, updatedAt })
    }

    res.setHeader('Allow', 'GET, PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    // No store linked yet → 503 so the client falls back to local-only edits.
    return res.status(message === 'NO_STORE' ? 503 : 500).json({ error: message })
  }
}
