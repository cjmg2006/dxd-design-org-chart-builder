import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Dialog } from '@base-ui-components/react/dialog'
import { cn } from '@/lib/cn'

export interface Command {
  id: string
  label: string
  /** Optional one-line description under the label. */
  description?: string
  /** Optional short status shown on the right (e.g. "On" / "Off"). */
  hint?: string
  run: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  commands: Command[]
}

/** ⌘K command palette. Base UI Dialog supplies the modal shell — focus trap, Esc
 *  to close, backdrop, and focus return. Inside is an APG combobox + listbox:
 *  focus stays on the input, ↑↓ move the active option (aria-activedescendant),
 *  ↵ runs it. Built to hold more commands; today it carries the leadership-view
 *  toggle. */
export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const q = query.trim().toLowerCase()
  const filtered = q
    ? commands.filter(
        (c) => c.label.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q),
      )
    : commands

  // Reset and focus on each open.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    const id = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(id)
  }, [open])

  // Keep the active index in range as the filter narrows.
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)))
  }, [filtered.length])

  const run = (cmd: Command | undefined) => {
    if (!cmd) return
    cmd.run()
    onClose()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(filtered.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(filtered[active])
    }
  }

  const activeId = filtered[active] ? `${listId}-${filtered[active].id}` : undefined

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
            'fixed left-1/2 top-[12vh] z-50 flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 flex-col overflow-hidden',
            'rounded-card border border-border bg-surface shadow-xl',
            'transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
          )}
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>

          <div className="border-b border-border px-3.5 pt-2.5">
            <label htmlFor={`${listId}-input`} className="block text-2xs font-medium text-ink-muted">
              Search commands
            </label>
            <div className="flex items-center gap-2 pb-2.5 pt-1">
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className="size-4 shrink-0 text-ink-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
              >
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5L14 14" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                id={`${listId}-input`}
                type="text"
                role="combobox"
                aria-expanded
                aria-controls={listId}
                aria-activedescendant={activeId}
                autoComplete="off"
                placeholder="Type to filter…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
            </div>
          </div>

          <ul id={listId} role="listbox" aria-label="Commands" className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {filtered.length === 0 && (
              <li className="px-2.5 py-6 text-center text-sm text-ink-muted">No commands found.</li>
            )}
            {filtered.map((cmd, i) => (
              <li
                key={cmd.id}
                id={`${listId}-${cmd.id}`}
                role="option"
                aria-selected={i === active}
                onClick={() => run(cmd)}
                onMouseMove={() => setActive(i)}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-chip px-2.5 py-2 sm:min-h-9',
                  i === active && 'bg-surface-2',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{cmd.label}</span>
                  {cmd.description && (
                    <span className="mt-0.5 block truncate text-2xs text-ink-muted">{cmd.description}</span>
                  )}
                </span>
                {cmd.hint && (
                  <span className="shrink-0 rounded-chip bg-surface-2 px-1.5 py-0.5 text-2xs font-medium text-ink-secondary">
                    {cmd.hint}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div className="border-t border-border px-3.5 py-2 text-2xs text-ink-muted">
            <span className="tabular">↑↓</span> to move · <span className="tabular">↵</span> to select ·{' '}
            <span className="tabular">esc</span> to close
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
