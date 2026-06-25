import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Dialog } from '@base-ui-components/react/dialog'
import type { AddedPerson, Domain, EmploymentType, Org } from '@/data/types'
import { managerCandidates } from '@/data/org'
import { useOrgEditsContext } from '@/data/orgEdits'
import {
  DOMAIN_LABEL,
  DOMAIN_ORDER,
  WORKSTREAMS_BY_DOMAIN,
} from '@/data/constants'
import { EMPLOYMENT_LABEL } from '@/lib/styles'
import { cn } from '@/lib/cn'

const EMPLOYMENT_OPTIONS: EmploymentType[] = ['GT', 'AR', 'Consultant', 'Apprentice', 'Intern']

interface AddPersonDialogProps {
  org: Org
  open: boolean
  /** Pre-selected manager (the card/person the add was launched from). */
  defaultManager?: string | null
  onClose: () => void
}

/** A small form for adding a person who isn't in the sheet yet. Shared by every
 *  entry point (the edit toolbar, a card's hover "+", the detail dialog's
 *  "Add report"); the only thing that varies between them is the pre-filled
 *  manager. The new person is reported to an existing manager so they always
 *  land somewhere visible in the tree. Submitting adds the person and closes —
 *  the journey ends there. */
export function AddPersonDialog({ org, open, defaultManager, onClose }: AddPersonDialogProps) {
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
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
            'max-h-[calc(100vh-2rem)] overflow-y-auto rounded-card border border-border bg-surface p-5 shadow-xl',
            'transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
          )}
        >
          {open && <AddPersonForm org={org} defaultManager={defaultManager} onClose={onClose} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function AddPersonForm({
  org,
  defaultManager,
  onClose,
}: {
  org: Org
  defaultManager?: string | null
  onClose: () => void
}) {
  const { addPerson } = useOrgEditsContext()

  const managerOptions = useMemo(() => managerCandidates(org, ''), [org])
  const initialManager =
    defaultManager && managerOptions.includes(defaultManager)
      ? defaultManager
      : managerOptions[0] ?? org.root.name
  // Seed the domain from the chosen manager's domain so the common case (adding
  // someone onto a team) needs no extra clicks.
  const initialDomain = org.byName.get(initialManager)?.domain ?? DOMAIN_ORDER[0]

  const [name, setName] = useState('')
  const [managerName, setManagerName] = useState(initialManager)
  const [domain, setDomain] = useState<Domain>(initialDomain)
  const [workstreams, setWorkstreams] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [employment, setEmployment] = useState<EmploymentType>('GT')

  // Keep the product valid for the chosen domain.
  const productOptions = WORKSTREAMS_BY_DOMAIN[domain] ?? []
  useEffect(() => {
    if (workstreams && !productOptions.includes(workstreams)) setWorkstreams('')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to a domain change
  }, [domain])

  const trimmed = name.trim()
  const duplicate =
    trimmed.length > 0 &&
    (org.byName.has(trimmed) || org.openRoles.some((p) => p.name === trimmed))
  const canSubmit = trimmed.length > 0 && !duplicate

  const submit = () => {
    if (!canSubmit) return
    const person: AddedPerson = {
      name: trimmed,
      managerName,
      domain,
      workstreams,
      specialty: specialty.trim(),
      employment,
    }
    addPerson(person)
    onClose()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Dialog.Title className="font-display text-xl text-ink">Add a person</Dialog.Title>
          <Dialog.Description className="mt-0.5 text-sm text-ink-secondary">
            They’ll appear under their manager in the chart.
          </Dialog.Description>
        </div>
        <Dialog.Close
          aria-label="Cancel"
          className="-mr-1 -mt-1 inline-flex size-11 items-center justify-center rounded-chip text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:size-9"
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
            <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
          </svg>
        </Dialog.Close>
      </div>

      <div className="mt-4 grid grid-cols-[5.5rem_1fr] items-center gap-x-3 gap-y-2.5 text-sm">
        <Field label="Name">
          {/* eslint-disable-next-line jsx-a11y/no-autofocus -- focus the first field on open */}
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            aria-label="Name"
            aria-invalid={duplicate || undefined}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm font-medium text-ink outline-none placeholder:text-ink-muted/70"
          />
        </Field>

        <Field label="Reports to">
          <Select value={managerName} onChange={setManagerName} ariaLabel="Reports to">
            {managerOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Specialty">
          <input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="e.g. Product Design"
            aria-label="Specialty"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm font-medium text-ink outline-none placeholder:text-ink-muted/70"
          />
        </Field>

        <Field label="Domain">
          <Select value={domain} onChange={(v) => setDomain(v as Domain)} ariaLabel="Domain">
            {DOMAIN_ORDER.map((d) => (
              <option key={d} value={d}>
                {DOMAIN_LABEL[d]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Product">
          <Select value={workstreams} onChange={setWorkstreams} ariaLabel="Product">
            <option value="">No product</option>
            {productOptions.map((ws) => (
              <option key={ws} value={ws}>
                {ws}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Type">
          <Select value={employment} onChange={(v) => setEmployment(v as EmploymentType)} ariaLabel="Employment type">
            {EMPLOYMENT_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {EMPLOYMENT_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {duplicate && (
        <p className="mt-2 text-2xs text-leave-text">Someone with this name is already in the chart.</p>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        <Dialog.Close className="inline-flex h-9 items-center rounded-chip border border-border bg-surface px-3.5 text-sm font-medium text-ink-secondary hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Cancel
        </Dialog.Close>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-primary px-3.5 text-sm font-semibold text-primary-fg hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          Add to chart
        </button>
      </div>

      <p className="mt-3 text-2xs text-ink-muted">
        Saved to your view alongside your other edits. Use “Reset edits” to clear.
      </p>
    </form>
  )
}

/** A labelled row matching the detail dialog: label + a bordered control box. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span className="text-sm text-ink-muted">{label}</span>
      <div className="flex min-h-11 items-center gap-1.5 rounded-chip border border-border bg-surface px-2.5 transition-colors duration-150 focus-within:ring-2 focus-within:ring-primary sm:min-h-9">
        {children}
      </div>
    </>
  )
}

/** A native <select> styled to match, with its own chevron affordance. */
function Select({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  children: ReactNode
}) {
  return (
    <div className="relative flex min-w-0 flex-1 items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent py-2 pr-5 text-sm font-medium text-ink outline-none"
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="pointer-events-none absolute right-0 size-3 shrink-0 text-ink-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
