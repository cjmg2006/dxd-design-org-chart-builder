// Per-person profile photos — login-free, shared, last-write-wins.
//
// Each photo is stored under its own Redis key (`photo:<name>`) as a JPEG data
// URL, kept OUT of the main edits doc (api/edits.ts is capped at 256KB). GET
// serves the decoded image bytes so an <img src> can point straight here; the
// client cache-busts with a `?v=` that bumps on every upload. With no Redis
// configured the route 503s and the client surfaces a "couldn't save" message.
//
// Backed by the same Upstash Redis (Vercel Marketplace) as the edits doc.

const PREFIX = 'photo:'
const MAX_DATAURL = 400_000 // ~300KB binary; the client already downscales to ~90KB
const DATAURL_RE = /^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)$/

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

interface Res {
  status: (code: number) => Res
  json: (body: unknown) => void
  setHeader: (key: string, value: string) => void
  end: (chunk?: Buffer | string) => void
}

export default async function handler(
  req: { method?: string; url?: string; body?: unknown },
  res: Res,
) {
  try {
    const name = new URL(req.url || '', 'http://x').searchParams.get('name')?.trim()

    if (req.method === 'GET') {
      if (!name) return res.status(400).json({ error: 'Missing name' })
      const raw = (await redis(['GET', PREFIX + name])) as string | null
      const m = raw && DATAURL_RE.exec(raw)
      if (!m) return res.status(404).json({ error: 'No photo' })
      res.status(200)
      res.setHeader('Content-Type', m[1])
      // The URL carries a ?v= cache-buster, so a given URL is immutable.
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      return res.end(Buffer.from(m[2], 'base64'))
    }

    if (req.method === 'PUT') {
      const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}) as {
        name?: string
        dataUrl?: string
      }
      const who = body.name?.trim()
      const dataUrl = body.dataUrl
      if (!who || typeof dataUrl !== 'string') return res.status(400).json({ error: 'Missing name or dataUrl' })
      if (dataUrl.length > MAX_DATAURL) return res.status(413).json({ error: 'Photo too large' })
      if (!DATAURL_RE.test(dataUrl)) return res.status(400).json({ error: 'Not an image data URL' })
      await redis(['SET', PREFIX + who, dataUrl])
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return res.status(message === 'NO_STORE' ? 503 : 500).json({ error: message })
  }
}
