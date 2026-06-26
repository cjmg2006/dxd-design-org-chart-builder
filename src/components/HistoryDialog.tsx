import { useEffect, useState } from 'react'
import { Dialog } from '@base-ui-components/react/dialog'
import { fetchHistory, type HistoryEntry } from '@/data/sharedStore'
import { cn } from '@/lib/cn'

interface HistoryDialogProps {
  open: boolean
  onClose: () => void
}

type Load = { status: 'loading' } | { status: 'ready'; entries: HistoryEntry[] } | { status: 'error' }

/** Read-only feed of recent shared edits (timestamped, anonymous). Fetched fresh
 *  each time it opens. When no backend is reachable it explains that history is a
 *  shared-deployment feature rather than showing a raw error. */
export function HistoryDialog({ open, onClose }: HistoryDialogProps) {
  const [load, setLoad] = useState<Load>({ status: 'loading' })

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoad({ status: 'loading' })
    fetchHistory(100)
      .then((entries) => !cancelled && setLoad({ status: 'ready', entries }))
      .catch(() => !cancelled && setLoad({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [open])

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1px] transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col',
            'rounded-card border border-border bg-surface shadow-xl',
            'transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border p-5 pb-3">
            <div>
              <Dialog.Title className="font-display text-xl text-ink">Recent changes</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-ink-secondary">
                Every edit to the shared chart, newest first.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close history"
              className="-mr-1 -mt-1 inline-flex size-11 items-center justify-center rounded-chip text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:size-9"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
                <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
              </svg>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-3">
            {load.status === 'loading' && (
              <p className="py-8 text-center text-sm text-ink-muted">Loading…</p>
            )}
            {load.status === 'error' && (
              <p className="py-8 text-center text-sm text-ink-muted">
                History is captured once the chart is deployed with a shared store. It isn’t available here.
              </p>
            )}
            {load.status === 'ready' && load.entries.length === 0 && (
              <p className="py-8 text-center text-sm text-ink-muted">No changes yet.</p>
            )}
            {load.status === 'ready' && load.entries.length > 0 && (
              <ol className="space-y-2.5">
                {load.entries.map((e, i) => (
                  <li key={`${e.ts}-${i}`} className="flex items-start gap-2.5">
                    <span aria-hidden className={cn('mt-1.5 size-2 shrink-0 rounded-pill', dotClass(e.action))} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">{e.summary || e.action}</p>
                      <p className="mt-0.5 text-2xs text-ink-muted tabular">{formatTs(e.ts)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function dotClass(action: string): string {
  switch (action) {
    case 'add':
      return 'bg-primary'
    case 'remove':
      return 'bg-leave-text'
    case 'reset':
      return 'bg-ink-muted'
    default:
      return 'bg-border-strong'
  }
}

function formatTs(ts: string): string {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  return d.toLocaleString('en-SG', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
