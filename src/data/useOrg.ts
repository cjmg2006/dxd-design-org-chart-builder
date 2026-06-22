import { useCallback, useEffect, useState } from 'react'
import type { Org } from './types'
import { fetchOrg } from './fetchSheet'

export type LoadStatus = 'loading' | 'success' | 'error'

interface OrgState {
  status: LoadStatus
  org: Org | null
  error: string | null
}

/** Turn any thrown error into a plain "what happened + what to do" message
 *  (CNT-1) — never a raw HTTP code as the primary message. */
function humanizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/no data rows/i.test(msg)) {
    return 'The team sheet loaded but had no people in it. Check that the sheet still has data.'
  }
  if (/Failed to fetch|NetworkError|HTTP|fetch/i.test(msg)) {
    return "Couldn't reach the team sheet. Check your connection, then try again."
  }
  return 'Something interrupted loading the team data. Try again in a moment.'
}

const MIN_LOADING_MS = 350 // avoid a spinner flash on fast loads (CMP-3)

/** Loads the org with loading/success/error states and a manual reload. */
export function useOrg(): OrgState & { reload: () => void } {
  const [state, setState] = useState<OrgState>({ status: 'loading', org: null, error: null })

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    const ctrl = new AbortController()
    const startedAt = performance.now()
    // Demo-only hooks so the loading/error states can be photographed in verify:
    // ?fail=1 forces the error state, ?slow=1 holds the loading state. Harmless
    // in production (no one passes them); documented in the decision record.
    // Dev-only so a shared production link can never carry ?fail and show a
    // fabricated error to a real user.
    const params = new URLSearchParams(window.location.search)
    const forceFail = import.meta.env.DEV && params.has('fail')
    const slowMs = import.meta.env.DEV && params.has('slow') ? 2500 : 0
    const settle = (next: OrgState) => {
      const elapsed = performance.now() - startedAt
      const wait = Math.max(slowMs, MIN_LOADING_MS - elapsed)
      window.setTimeout(() => {
        if (!ctrl.signal.aborted) setState(next)
      }, wait)
    }
    if (forceFail) {
      settle({ status: 'error', org: null, error: humanizeError(new Error('Failed to fetch')) })
      return () => ctrl.abort()
    }
    fetchOrg(ctrl.signal)
      .then((org) => settle({ status: 'success', org, error: null }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        settle({ status: 'error', org: null, error: humanizeError(err) })
      })
    return () => ctrl.abort()
  }, [])

  useEffect(() => load(), [load])

  return { ...state, reload: load }
}
