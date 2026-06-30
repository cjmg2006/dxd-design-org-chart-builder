// Manager-only password gate. POST verifies a shared password against
// process.env.MANAGER_PASSWORD and, on success, mints an opaque token stored
// in Redis with a TTL — the password itself is never sent back or cached.
// GET revalidates a previously-issued token so a page refresh doesn't
// immediately re-lock the view.
//
// Backed by the same Upstash Redis (Vercel Marketplace) store as api/edits.ts
// over its REST API. With no Redis configured the route 503s and the client
// explains manager view isn't available in this deployment yet.

const TOKEN_PREFIX = 'orgchart:managertoken:'
const TOKEN_TTL_SECONDS = 60 * 60 * 24 // 1 day

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

function randomToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export default async function handler(
  req: { method?: string; body?: unknown; query?: Record<string, string | string[] | undefined> },
  res: {
    status: (code: number) => typeof res
    json: (body: unknown) => void
    setHeader: (k: string, v: string) => void
  },
) {
  try {
    res.setHeader('Cache-Control', 'no-store')

    if (req.method === 'GET') {
      const raw = req.query?.token
      const token = Array.isArray(raw) ? raw[0] : raw
      if (!token) return res.status(200).json({ ok: false })
      const exists = await redis(['GET', `${TOKEN_PREFIX}${token}`])
      return res.status(200).json({ ok: exists != null })
    }

    if (req.method === 'POST') {
      const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) as {
        password?: string
      }
      const expected = process.env.MANAGER_PASSWORD
      if (!expected) throw new Error('NO_STORE')
      if (body.password !== expected) {
        return res.status(401).json({ error: 'Incorrect password' })
      }
      const token = randomToken()
      await redis(['SET', `${TOKEN_PREFIX}${token}`, '1', 'EX', TOKEN_TTL_SECONDS])
      return res.status(200).json({ token })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return res
      .status(message === 'NO_STORE' ? 503 : 500)
      .json({ error: message === 'NO_STORE' ? 'Manager view isn’t available in this deployment yet' : message })
  }
}
