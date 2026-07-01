import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Dialog } from '@base-ui-components/react/dialog'
import { Menu } from '@base-ui-components/react/menu'
import type { Org, Person } from '@/data/types'
import { managerOf, peersOf, reportsOf, menteesOf } from '@/data/org'
import { useOrgEditsContext } from '@/data/orgEdits'
import { DOMAIN_LABEL } from '@/data/constants'
import { useProfile, useProfileViewer } from '@/data/profileViewer'
import { useManagerAuth } from '@/data/managerAuth'
import { cn } from '@/lib/cn'
import { SpecialtyIcon } from './SpecialtyIcon'
import { Avatar, DomainDot, StatusPill } from './primitives'
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
            'transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
          )}
        >
          {person && (
            <DetailBody
              key={person.name}
              org={org}
              person={person}
              onNavigate={onNavigate}
              onRemoved={onClose}
            />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Resolve the live (possibly just-edited) person from the effective org, so an
 *  edit made here reflects in the open dialog without reopening it. */
function liveOf(org: Org, name: string): Person | undefined {
  return org.byName.get(name) ?? org.openRoles.find((p) => p.name === name)
}

function DetailBody({
  org,
  person,
  onNavigate,
  onRemoved,
}: {
  org: Org
  person: Person
  onNavigate: (p: Person) => void
  onRemoved: () => void
}) {
  const { removePerson } = useOrgEditsContext()
  const { openProfile } = useProfileViewer()
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)
  // When the remove-confirm is summoned from the kebab menu, move focus to it
  // (A11Y-11: a revealed surface takes focus).
  useEffect(() => {
    if (confirmingRemove) cancelRef.current?.focus()
  }, [confirmingRemove])
  // Always render from the live record (overrides applied), falling back to the
  // snapshot we were handed if the person isn't in the derived maps.
  const live = liveOf(org, person.name) ?? person
  const profile = useProfile(live)
  const { isManager } = useManagerAuth()
  const isRoot = live.name === org.root.name

  const manager = managerOf(org, live)
  const peers = peersOf(org, live)
  const reports = reportsOf(org, live.name)
  const mentees = menteesOf(org, live.name)

  // Remove from the chart. To keep the tree connected, the person's direct
  // reports + mentees are promoted to that person's own manager (one atomic edit
  // + one history entry, handled in removePerson). A non-root person with no
  // manager promotes their reports to the root. The root itself can't be removed.
  const directCount = reports.length + mentees.length
  const handleRemove = () => {
    const toManager = live.managerName ?? org.root.name
    const reportNames = [...reports, ...mentees].map((c) => c.name)
    removePerson(live.name, reportNames.length ? { toManager, reportNames } : undefined)
    onRemoved()
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <Avatar name={live.name} photo={profile?.photo} className="size-12 text-base" />
        <div className="min-w-0 flex-1">
          <Dialog.Title className="font-display text-xl text-ink">{live.name}</Dialog.Title>
          <Dialog.Description className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-secondary">
            {live.specialty && live.specialty !== '-' && (
              <SpecialtyIcon kind={live.specialtyKind} className="size-3.5 shrink-0" />
            )}
            <span>
              {live.specialty && live.specialty !== '-' ? live.specialty : 'Specialty not set'}
              {isManager && ` · ${EMPLOYMENT_LABEL[live.employment]}`}
            </span>
          </Dialog.Description>
        </div>
        {!isRoot && isManager && (
          <Menu.Root>
            <Menu.Trigger
              aria-label="Person actions"
              className="-mt-1 inline-flex size-11 items-center justify-center rounded-chip text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:size-9"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
                <circle cx="8" cy="3" r="1.4" />
                <circle cx="8" cy="8" r="1.4" />
                <circle cx="8" cy="13" r="1.4" />
              </svg>
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-[60]">
                <Menu.Popup className="min-w-44 rounded-card border border-border bg-surface p-1 shadow-xl">
                  <Menu.Item
                    onClick={() => setConfirmingRemove(true)}
                    className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-chip px-2.5 text-sm font-medium text-departing-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[highlighted]:bg-departing-soft"
                  >
                    <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.6}>
                      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.5 8.5h5l.5-8.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Remove from chart
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        )}
        <Dialog.Close
          aria-label="Close details"
          className="-mr-1 -mt-1 inline-flex size-11 items-center justify-center rounded-chip text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:size-9"
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
            <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
          </svg>
        </Dialog.Close>
      </div>

      {confirmingRemove && (
        <div className="mt-4 rounded-card border border-departing-border bg-departing-soft p-3" role="group" aria-label="Confirm removal">
          <p id="remove-consequence" className="text-sm text-ink">
            Remove <span className="font-semibold">{live.name}</span> from the chart?
            {directCount > 0 && (
              <>
                {' '}
                Their {directCount} report{directCount > 1 ? 's' : ''} will move to{' '}
                <span className="font-semibold">{manager?.name ?? 'their manager'}</span>.
              </>
            )}
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              ref={cancelRef}
              type="button"
              aria-describedby="remove-consequence"
              onClick={() => setConfirmingRemove(false)}
              className="inline-flex min-h-11 items-center rounded-chip border border-border bg-surface px-3 text-sm font-medium text-ink-secondary hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-9"
            >
              Cancel
            </button>
            <button
              type="button"
              aria-describedby="remove-consequence"
              onClick={handleRemove}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-chip bg-departing-text px-3 text-sm font-semibold text-surface hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-departing-text sm:min-h-9"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {live.status && isManager && (
        <div className="mt-3">
          <StatusPill status={live.status} month={live.statusMonth} destination={live.statusDestination} />
        </div>
      )}

      <button
        type="button"
        onClick={() => openProfile(live)}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-chip bg-primary px-3 text-sm font-semibold text-primary-fg hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-9"
      >
        <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <circle cx="8" cy="5" r="2.6" />
          <path d="M3 13.2c0-2.4 2.2-3.7 5-3.7s5 1.3 5 3.7" strokeLinecap="round" />
        </svg>
        {profile ? 'View full profile' : 'Add a profile'}
      </button>

      {isRoot ? (
        <dl className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
          <Fact label="Reports to">Top of chart</Fact>
        </dl>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-[5.5rem_1fr] items-center gap-x-3 gap-y-2.5 text-sm">
            <Fact label="Reports to">{manager ? manager.name : 'Top of chart'}</Fact>
            <Fact label="Domain">
              <span className="inline-flex items-center gap-1.5">
                <DomainDot domain={live.domain} />
                {DOMAIN_LABEL[live.domain]}
              </span>
            </Fact>
            {live.workstreams.trim() && <Fact label="Product">{live.workstreams}</Fact>}
            {live.team && live.team !== '-' && <Fact label="Squad">{live.team}</Fact>}
          </dl>
          <p className="mt-2.5 text-2xs text-ink-muted">
            Reporting line, domain, product, squad &amp; status are edited in the full profile.
          </p>
        </>
      )}

      {reports.length > 0 && (
        <RelatedGroup label={`Direct reports (${reports.length})`} people={reports} onNavigate={onNavigate} />
      )}
      {mentees.length > 0 && (
        <RelatedGroup label={`Mentees (${mentees.length})`} people={mentees} onNavigate={onNavigate} />
      )}
      {peers.length > 0 && (
        <RelatedGroup label={`Peers (${peers.length})`} people={peers} onNavigate={onNavigate} />
      )}

      {live.remarks && isManager && (
        <div className="mt-4 rounded-card bg-surface-2 p-3 text-sm text-ink-secondary">
          <span className="font-semibold text-ink-secondary">Note: </span>
          {live.remarks}
        </div>
      )}
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-sm text-ink">{children}</dd>
    </>
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
      <h3 className="text-2xs font-semibold text-ink-muted">{label}</h3>
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
