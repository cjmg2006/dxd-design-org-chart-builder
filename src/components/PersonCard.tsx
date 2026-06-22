import type { Person } from '@/data/types'
import { cn } from '@/lib/cn'
import { SpecialtyIcon } from './SpecialtyIcon'
import { DomainDot, EmploymentBadge, Initials, StatusPill, WsChip } from './primitives'
import { statusShort } from '@/lib/styles'

interface PersonCardProps {
  person: Person
  onSelect: (person: Person) => void
  /** Show the domain dot + label (hide it when the card sits in a domain section). */
  showDomain?: boolean
  /** Render as an incoming-transfer placeholder at a destination workstream. */
  ghostFrom?: string
  /** Show a muted "reports to {manager}" line (Directory/Explorer reporting cue). */
  showManager?: boolean
  className?: string
}

export function PersonCard({
  person,
  onSelect,
  showDomain = true,
  ghostFrom,
  showManager = false,
  className,
}: PersonCardProps) {
  const isGhost = !!ghostFrom
  const isOpen = person.isOpenRole

  const ariaLabel = isGhost
    ? `${person.name}, transferring in from ${ghostFrom}. View details.`
    : `${person.name}${person.specialty ? `, ${person.specialty}` : ''}${
        person.status ? `, ${statusShort(person.status)}` : ''
      }. View details.`

  return (
    <button
      type="button"
      onClick={() => onSelect(person)}
      aria-label={ariaLabel}
      className={cn(
        'group relative flex w-full flex-col gap-2 rounded-card border bg-surface p-3 text-left',
        'transition-shadow duration-150 hover:shadow-md',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        isOpen || isGhost ? 'border-dashed' : 'border-border hover:border-border-strong',
        isGhost && 'border-transfer-border bg-transfer-soft',
        isOpen && 'border-border-strong bg-surface-2/40',
        className,
      )}
    >
      {/* Status pill — only when present; the single loudest thing on the card */}
      {person.status && !isGhost && (
        <StatusPill status={person.status} month={person.statusMonth} />
      )}
      {isGhost && (
        <span className="inline-flex items-center gap-1 self-start rounded-pill border border-transfer-border bg-surface px-2 py-0.5 text-2xs font-semibold text-transfer-text">
          <span aria-hidden className="size-1.5 rounded-pill bg-transfer" />
          Incoming
        </span>
      )}

      <div className="flex items-start gap-2.5">
        <Initials name={person.name} className="size-8 text-xs" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink">{person.name}</div>
          {person.specialty && person.specialty !== '-' ? (
            <div className="mt-0.5 flex items-center gap-1.5 text-2xs text-ink-muted">
              <SpecialtyIcon kind={person.specialtyKind} className="size-3 shrink-0" />
              <span className="truncate">{person.specialty}</span>
            </div>
          ) : isGhost ? (
            <div className="mt-0.5 truncate text-2xs italic text-ink-muted">from {ghostFrom}</div>
          ) : null}
          {showManager && person.managerName && !isGhost && (
            <div className="mt-0.5 truncate text-2xs text-ink-muted">↳ {person.managerName}</div>
          )}
        </div>
      </div>

      {/* Workstream chips */}
      {person.workstreamChips.length > 0 && !isGhost && (
        <div className="flex flex-wrap gap-1">
          {person.workstreamChips.slice(0, 3).map((c, i) => (
            <WsChip key={`${c.label}-${i}`} chip={c} />
          ))}
          {person.workstreamChips.length > 3 && (
            <span className="text-2xs text-ink-muted">+{person.workstreamChips.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer: domain + employment */}
      <div className="mt-auto flex items-center gap-2 pt-0.5">
        {showDomain && !isGhost && (
          <span className="inline-flex items-center gap-1 text-2xs text-ink-secondary">
            <DomainDot domain={person.domain} />
            {person.domain}
          </span>
        )}
        <span className="ml-auto">
          <EmploymentBadge type={person.employment} />
        </span>
      </div>
    </button>
  )
}
