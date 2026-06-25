// Append-only edit history — anonymous, timestamped. Each semantic change to the
// shared chart (add / remove / re-parent / re-domain / re-product / reset) pushes
// one entry; GET returns the most-recent first. Capped so the list can't grow
// unbounded. Same Upstash Redis store as the edits doc.

const KEY = 'orgchart:history'
const MAX = 500

function env(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n]
    if (v) return v
  }
  return undefined
}

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
  req: { method?: string; body?: unknown; query?: Record<string, string | string[]> },
  res: {
    status: (code: number) => typeof res
    json: (body: unknown) => void
    setHeader: (k: string, v: string) => void
  },
) {
  try {
    if (req.method === 'GET') {
      const raw = req.query?.limit
      const limit = Math.max(1, Math.min(Number(Array.isArray(raw) ? raw[0] : raw) || 100, MAX))
      const rows = ((await redis(['LRANGE', KEY, 0, limit - 1])) as string[]) || []
      const entries = rows
        .map((r) => {
          try {
            return JSON.parse(r)
          } catch {
            return null
          }
        })
        .filter(Boolean)
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ entries })
    }

    if (req.method === 'POST') {
      const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) as {
        action?: string
        summary?: string
      }
      // Cap lengths — public, unauthenticated endpoint; keep entries bounded.
      const entry = {
        ts: new Date().toISOString(),
        action: String(body.action || 'edit').slice(0, 32),
        summary: String(body.summary || '').slice(0, 300),
      }
      await redis(['LPUSH', KEY, JSON.stringify(entry)])
      await redis(['LTRIM', KEY, 0, MAX - 1])
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return res.status(message === 'NO_STORE' ? 503 : 500).json({ error: message })
  }
}
