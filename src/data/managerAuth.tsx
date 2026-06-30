import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

// Manager-only status view. The password is checked server-side (api/manager-auth.ts)
// and never shipped in the bundle — only an opaque, expiring token comes back.
// The token lives in sessionStorage (cleared when the tab closes) and is
// revalidated against the server on mount, so a stale/expired token doesn't
// silently keep the view unlocked.

const STORAGE_KEY = 'orgchart:managerToken'

interface ManagerAuth {
  isManager: boolean
  /** Still checking a token found in sessionStorage. */
  checking: boolean
  unlock: (password: string) => Promise<{ ok: boolean; error?: string }>
  lock: () => void
}

const ManagerAuthContext = createContext<ManagerAuth | null>(null)

/** Holds the actual state/logic; called once in App and passed into the
 *  provider, mirroring useOrgEdits() + OrgEditsProvider. */
export function useManagerAuthState(): ManagerAuth {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(STORAGE_KEY))
  const [checking, setChecking] = useState(Boolean(token))

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetch(`/api/manager-auth?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((body: { ok?: boolean }) => {
        if (cancelled) return
        if (!body.ok) {
          sessionStorage.removeItem(STORAGE_KEY)
          setToken(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          sessionStorage.removeItem(STORAGE_KEY)
          setToken(null)
        }
      })
      .finally(() => !cancelled && setChecking(false))
    return () => {
      cancelled = true
    }
    // Only revalidate the token we started with — re-runs on unlock are unnecessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const unlock = useCallback(async (password: string) => {
    try {
      const res = await fetch('/api/manager-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const body = (await res.json()) as { token?: string; error?: string }
      if (!res.ok || !body.token) {
        return { ok: false, error: body.error || 'Incorrect password' }
      }
      sessionStorage.setItem(STORAGE_KEY, body.token)
      setToken(body.token)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Could not reach the server. Try again.' }
    }
  }, [])

  const lock = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setToken(null)
  }, [])

  return { isManager: Boolean(token) && !checking, checking, unlock, lock }
}

export function ManagerAuthProvider({
  value,
  children,
}: {
  value: ManagerAuth
  children: ReactNode
}) {
  return <ManagerAuthContext.Provider value={value}>{children}</ManagerAuthContext.Provider>
}

export function useManagerAuth(): ManagerAuth {
  const ctx = useContext(ManagerAuthContext)
  if (!ctx) throw new Error('useManagerAuth must be used within a ManagerAuthProvider')
  return ctx
}
