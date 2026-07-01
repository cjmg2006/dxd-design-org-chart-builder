import { useState, type FormEvent } from 'react'
import { Dialog } from '@base-ui-components/react/dialog'
import { useManagerAuth } from '@/data/managerAuth'
import { cn } from '@/lib/cn'

interface ManagerAuthDialogProps {
  open: boolean
  onClose: () => void
}

/** Password prompt for manager view — submits to the server-side check in
 *  useManagerAuth().unlock(); the password itself never touches the bundle. */
export function ManagerAuthDialog({ open, onClose }: ManagerAuthDialogProps) {
  const { unlock } = useManagerAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setPassword('')
    setError(null)
    setSubmitting(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await unlock(password)
    setSubmitting(false)
    if (result.ok) {
      reset()
      onClose()
    } else {
      setError(result.error ?? 'Incorrect password')
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset()
          onClose()
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1px] transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2',
            'rounded-card border border-border bg-surface p-5 shadow-xl',
            'transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
          )}
        >
          <Dialog.Title className="font-display text-xl text-ink">Manager view</Dialog.Title>
          <Dialog.Description className="mt-0.5 text-sm text-ink-secondary">
            Enter the manager password to see employment tags and status notes (leave, joining,
            departing, transfers).
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-4">
            <label htmlFor="manager-password" className="sr-only">
              Manager password
            </label>
            <input
              id="manager-password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-chip border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              placeholder="Password"
            />
            {error && <p className="mt-2 text-sm text-leave-text">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Dialog.Close className="inline-flex h-9 items-center rounded-chip border border-border bg-surface px-3 text-sm font-medium text-ink-secondary hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                disabled={submitting || !password}
                className="inline-flex h-9 items-center rounded-chip bg-primary px-3 text-sm font-semibold text-primary-fg hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
              >
                {submitting ? 'Checking…' : 'Unlock'}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
