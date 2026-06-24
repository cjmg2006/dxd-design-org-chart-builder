import type { ReactNode } from 'react'
import { Dialog } from '@base-ui-components/react/dialog'
import type { Domain, Org, Person } from '@/data/types'
import { managerCandidates, managerOf, peersOf, reportsOf, menteesOf } from '@/data/org'
import { useOrgEditsContext } from '@/data/orgEdits'
import { DOMAIN_LABEL, DOMAIN_ORDER, WORKSTREAMS_BY_DOMAIN } from '@/data/constants'
import { cn } from '@/lib/cn'
import { SpecialtyIcon } from './SpecialtyIcon'
import { DomainDot, Initials, StatusPill } from './primitives'
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

/** Resolve the live (possibly just-edited) person from the effective org, so an
 *  edit made here reflects in the open dialog without reopening it. */
function liveOf(org: Org, name: string): Person | undefined {
  return org.byName.get(name) ?? org.openRoles.find((p) => p.name === name)
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
  const { baseOrg, reparent, setDomain, setWorkstream } = useOrgEditsContext()
  // Always render from the live record (overrides applied), falling back to the
  // snapshot we were handed if the person isn't in the derived maps.
  const live = liveOf(org, person.name) ?? person
  const isRoot = live.name === org.root.name

  const manager = managerOf(org, live)
  const peers = peersOf(org, live)
  const reports = reportsOf(org, live.name)
  const mentees = menteesOf(org, live.name)

  // Original (sheet) values — selecting one of these clears that override.
  const base = baseOrg ? liveOf(baseOrg, live.name) : undefined
  const baseManager = base?.managerName ?? live.managerName ?? null
  const baseDomain = base?.domain ?? live.domain
  const baseWorkstreams = (base?.workstreams ?? live.workstreams).trim()

  const currentWorkstream = live.workstreams.trim()
  const productOptions = WORKSTREAMS_BY_DOMAIN[live.domain] ?? []
  // Keep an unlisted current value (e.g. a multi-workstream sheet entry) pickable.
  const extraProduct =
    currentWorkstream && !productOptions.includes(currentWorkstream) ? currentWorkstream : null

  return (
    <div>
      <div className="flex items-start gap-3">
        <Initials name={live.name} className="size-12 text-base" />
        <div className="min-w-0 flex-1">
          <Dialog.Title className="font-display text-xl text-ink">{live.name}</Dialog.Title>
          <Dialog.Description className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-secondary">
            {live.specialty && live.specialty !== '-' && (
              <SpecialtyIcon kind={live.specialtyKind} className="size-3.5 shrink-0" />
            )}
            <span>
              {live.specialty && live.specialty !== '-' ? live.specialty : 'Specialty not set'}
              {' · '}
              {EMPLOYMENT_LABEL[live.employment]}
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

      {live.status && (
        <div className="mt-3">
          <StatusPill status={live.status} month={live.statusMonth} />
        </div>
      )}

      {isRoot ? (
        // The synthetic head-of-design sits at the top of the chart and isn't
        // assigned a product — show the facts read-only.
        <dl className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
          <Fact label="Reports to">Top of chart</Fact>
        </dl>
      ) : (
        <dl className="mt-4 grid grid-cols-[5.5rem_1fr] items-center gap-x-3 gap-y-2.5 text-sm">
          <FieldRow label="Reports to" changed={live.managerName !== baseManager}>
            <select
              aria-label="Reports to"
              value={live.managerName ?? ''}
              onChange={(e) => reparent(live.name, e.target.value, baseManager)}
              className={selectClass(live.managerName !== baseManager)}
            >
              {managerCandidates(org, live.name).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </FieldRow>

          <FieldRow
            label="Domain"
            changed={live.domain !== baseDomain}
            leading={<DomainDot domain={live.domain} />}
          >
            <select
              aria-label="Domain"
              value={live.domain}
              onChange={(e) => setDomain(live.name, e.target.value as Domain, baseDomain)}
              className={selectClass(live.domain !== baseDomain)}
            >
              {DOMAIN_ORDER.map((d) => (
                <option key={d} value={d}>
                  {DOMAIN_LABEL[d]}
                </option>
              ))}
            </select>
          </FieldRow>

          <FieldRow label="Product" changed={currentWorkstream !== baseWorkstreams}>
            <select
              aria-label="Product"
              value={currentWorkstream}
              onChange={(e) => setWorkstream(live.name, e.target.value, baseWorkstreams)}
              className={selectClass(currentWorkstream !== baseWorkstreams)}
            >
              <option value="">No product</option>
              {productOptions.map((ws) => (
                <option key={ws} value={ws}>
                  {ws}
                </option>
              ))}
              {extraProduct && (
                <option key={extraProduct} value={extraProduct}>
                  {extraProduct}
                </option>
              )}
            </select>
          </FieldRow>

          {live.team && live.team !== '-' && <Fact label="Squad">{live.team}</Fact>}
        </dl>
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

      {!isRoot && manager && (
        <p className="mt-3 text-2xs text-ink-muted">
          Changes here are saved to your view and shown across the chart.
        </p>
      )}

      {live.remarks && (
        <div className="mt-4 rounded-card bg-surface-2 p-3 text-sm text-ink-secondary">
          <span className="font-semibold text-ink-secondary">Note: </span>
          {live.remarks}
        </div>
      )}
    </div>
  )
}

/** Shared class for the native <select> inside an editable field. */
function selectClass(changed: boolean): string {
  return cn(
    'min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent py-2 pr-5 text-sm font-medium outline-none',
    changed ? 'text-primary-text' : 'text-ink',
  )
}

/** A labelled, editable row: the field label, then a bordered control holding an
 *  optional leading adornment, the control itself, and a chevron affordance. */
function FieldRow({
  label,
  changed,
  leading,
  children,
}: {
  label: string
  changed: boolean
  leading?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd>
        <div
          className={cn(
            'flex min-h-11 items-center gap-1.5 rounded-chip border bg-surface px-2.5 transition-colors duration-150 sm:min-h-9',
            'focus-within:ring-2 focus-within:ring-primary',
            changed ? 'border-primary/60' : 'border-border',
          )}
        >
          {leading}
          <div className="relative flex min-w-0 flex-1 items-center">
            {children}
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
        </div>
      </dd>
    </>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
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
