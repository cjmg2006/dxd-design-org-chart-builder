import fs from 'node:fs'
import { defineConfig, type Connect, type Plugin, type PreviewServer, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// ── Dev/preview API: file-backed mirror of api/edits.ts + api/history.ts ──────
// Vercel Functions (the /api directory) don't run under `vite dev`, so this
// plugin serves the same routes from a local JSON file. That keeps the shared
// edits flow fully exercisable locally — two browser tabs on localhost share one
// store and see each other's edits — without provisioning a backend.
const EMPTY = { positions: {}, managers: {}, domains: {}, workstreams: {}, additions: {}, removed: {}, profiles: {} }
const DATAURL_RE = /^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)$/

interface DevStore {
  edits: { version: number; data: unknown; updatedAt: string | null }
  history: { ts: string; action: string; summary: string }[]
  /** Per-person profile photos (data URLs), mirroring api/profile-photo.ts. */
  photos: Record<string, string>
}

function devApi(): Plugin {
  const FILE = fileURLToPath(new URL('./.dev-store.json', import.meta.url))
  const read = (): DevStore => {
    try {
      const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Partial<DevStore>
      return { edits: { version: 0, data: EMPTY, updatedAt: null }, history: [], photos: {}, ...parsed }
    } catch {
      return { edits: { version: 0, data: EMPTY, updatedAt: null }, history: [], photos: {} }
    }
  }
  const write = (s: DevStore) => {
    try {
      fs.writeFileSync(FILE, JSON.stringify(s, null, 2))
    } catch {
      /* best-effort in dev */
    }
  }
  const readBody = (req: Connect.IncomingMessage): Promise<Record<string, unknown>> =>
    new Promise((resolve) => {
      let raw = ''
      req.on('data', (c) => (raw += c))
      req.on('end', () => {
        try {
          resolve(JSON.parse(raw || '{}'))
        } catch {
          resolve({})
        }
      })
    })

  const middleware: Connect.NextHandleFunction = async (req, res, next) => {
    const url = req.url || ''
    if (
      !url.startsWith('/api/edits') &&
      !url.startsWith('/api/history') &&
      !url.startsWith('/api/profile-photo')
    )
      return next()
    const send = (code: number, body: unknown) => {
      res.statusCode = code
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify(body))
    }
    const store = read()

    // Per-person profile photos (mirrors api/profile-photo.ts): GET serves the
    // decoded image bytes; PUT stores the data URL.
    if (url.startsWith('/api/profile-photo')) {
      const name = new URL(url, 'http://x').searchParams.get('name')?.trim()
      if (req.method === 'GET') {
        const raw = name ? store.photos[name] : undefined
        const m = raw ? DATAURL_RE.exec(raw) : null
        if (!m) return send(404, { error: 'No photo' })
        res.statusCode = 200
        res.setHeader('Content-Type', m[1])
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        return res.end(Buffer.from(m[2], 'base64'))
      }
      if (req.method === 'PUT') {
        const body = await readBody(req)
        const who = String(body.name || '').trim()
        const dataUrl = typeof body.dataUrl === 'string' ? body.dataUrl : ''
        if (!who || !DATAURL_RE.test(dataUrl)) return send(400, { error: 'Missing name or invalid dataUrl' })
        store.photos = { ...store.photos, [who]: dataUrl }
        write(store)
        return send(200, { ok: true })
      }
      return send(405, { error: 'Method not allowed' })
    }

    if (url.startsWith('/api/edits')) {
      if (req.method === 'GET') return send(200, store.edits)
      if (req.method === 'PUT') {
        const body = await readBody(req)
        store.edits = {
          version: (store.edits.version || 0) + 1,
          data: body.data ?? EMPTY,
          updatedAt: new Date().toISOString(),
        }
        write(store)
        return send(200, { version: store.edits.version, updatedAt: store.edits.updatedAt })
      }
      return send(405, { error: 'Method not allowed' })
    }

    // /api/history
    if (req.method === 'GET') {
      const limit = Math.min(Number(new URL(url, 'http://x').searchParams.get('limit')) || 100, 500)
      return send(200, { entries: store.history.slice(0, limit) })
    }
    if (req.method === 'POST') {
      const body = await readBody(req)
      store.history.unshift({
        ts: new Date().toISOString(),
        action: String(body.action || 'edit'),
        summary: String(body.summary || ''),
      })
      store.history = store.history.slice(0, 500)
      write(store)
      return send(200, { ok: true })
    }
    return send(405, { error: 'Method not allowed' })
  }

  return {
    name: 'dev-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(middleware)
    },
  }
}

// Relative base so the static build works on GitHub Pages, an internal static
// host, or opened from a subpath without rewriting asset URLs.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), devApi()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    // Base UI prebundling can otherwise pull a second React copy → invalid hooks.
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  server: { port: 8731, host: true },
})
