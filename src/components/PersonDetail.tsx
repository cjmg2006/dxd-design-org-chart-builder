import { Dialog } from '@base-ui-components/react/dialog'
import type { Org, Person } from '@/data/types'
import { managerOf, peersOf, reportsOf, menteesOf } from '@/data/org'
import { cn } from '@/lib/cn'
import { SpecialtyIcon } from './SpecialtyIcon'
import { DomainDot, Initials, StatusPill, WsChip } from './primitives'
import { EMPLOYMENT_LABEL } from '@/lib/styles'

interface PersonDetailProps {
  org: Org
  person: Person | null
  onClose: () => void
  /** Navigate to a related person inside the open dialog. */
  onNavigate: (person: Person) => void
}

export function PersonDetail({ org, person, onClose, onNavigate }: PersonDetailProps) {
  return (
    <Dialog.Root
      open={!!person}
      onOpenChange={(open) => {
        if (!open) onClose()
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
          {person && <DetailBody org={org} person={person} onNavigate={onNavigate} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DetailBody({
  org,
  person,
  onNavigate,
}: {
  org: Org
  person: Person
  onNavigate: (p: Person) => void
}) {
  const manager = managerOf(org, person)
  const peers = peersOf(org, person)
  const reports = reportsOf(org, person.name)
  const mentees = menteesOf(org, person.name)

  return (
    <div>
      <div className="flex items-start gap-3">
        <Initials name={person.name} className="size-12 text-base" />
        <div className="min-w-0 flex-1">
          <Dialog.Title className="font-display text-xl text-ink">{person.name}</Dialog.Title>
          <Dialog.Description className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-secondary">
            {person.specialty && person.specialty !== '-' && (
              <SpecialtyIcon kind={person.specialtyKind} className="size-3.5 shrink-0" />
            )}
            <span>
              {person.specialty && person.specialty !== '-' ? person.specialty : 'Specialty not set'}
              {' · '}
              {EMPLOYMENT_LABEL[person.employment]}
            </span>
          </Dialog.Description>
        </div>
        <Dialog.Close
          aria-label="Close details"
          className="-mr-1 -mt-1 inline-flex size-11 items-center justify-center rounded-chip text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:size-9"
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
            <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
          </svg>
        </Dialog.Close>
      </div>

      {person.status && (
        <div className="mt-3">
          <StatusPill status={person.status} month={person.statusMonth} />
        </div>
      )}

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <Fact label="Domain">
          <span className="inline-flex items-center gap-1.5">
            <DomainDot domain={person.domain} />
            {person.domain}
          </span>
        </Fact>
        {person.workstreamChips.length > 0 && (
          <Fact label="Workstreams">
            <span className="flex flex-wrap gap-1">
              {person.workstreamChips.map((c, i) => (
                <WsChip key={i} chip={c} />
              ))}
            </span>
          </Fact>
        )}
        {person.team && person.team !== '-' && <Fact label="Squad">{person.team}</Fact>}
        <Fact label="Reports to">
          {manager ? <PersonLink person={manager} onNavigate={onNavigate} /> : 'Top of chart'}
        </Fact>
      </dl>

      {reports.length > 0 && (
        <RelatedGroup label={`Direct reports (${reports.length})`} people={reports} onNavigate={onNavigate} />
      )}
      {mentees.length > 0 && (
        <RelatedGroup label={`Mentees (${mentees.length})`} people={mentees} onNavigate={onNavigate} />
      )}
      {peers.length > 0 && (
        <RelatedGroup label={`Peers (${peers.length})`} people={peers} onNavigate={onNavigate} />
      )}

      {person.remarks && (
        <div className="mt-4 rounded-card bg-surface-2 p-3 text-sm text-ink-secondary">
          <span className="font-semibold text-ink-secondary">Note: </span>
          {person.remarks}
        </div>
      )}
    </div>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </>
  )
}

function PersonLink({ person, onNavigate }: { person: Person; onNavigate: (p: Person) => void }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(person)}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-border bg-surface px-2.5 py-1 font-medium text-ink hover:border-border-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-8"
    >
      <DomainDot domain={person.domain} />
      {person.name}
    </button>
  )
}

function RelatedGroup({
  label,
  people,
  onNavigate,
}: {
  label: string
  people: Person[]
  onNavigate: (p: Person) => void
}) {
  return (
    <div className="mt-4">
      <h3 className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">{label}</h3>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {people.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => onNavigate(p)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-border bg-surface px-2.5 py-1 text-xs text-ink hover:border-border-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-8"
          >
            <DomainDot domain={p.domain} />
            {p.name}
          </button>
        ))}
      </div>
    </div>
  )
}
