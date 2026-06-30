import type { Domain, EmploymentType, PersonStatus, WorkstreamChip } from '@/data/types'
import { cn } from '@/lib/cn'
import {
  DOMAIN_STYLE,
  STATUS_STYLE,
  EMPLOYMENT_SHORT,
  statusLabel,
} from '@/lib/styles'

/** Small round initials avatar — gives each person a stable visual anchor. */
export function Initials({ name, className }: { name: string; className?: string }) {
  const initials = name
    .replace(/\[|\]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-pill bg-surface-2 font-semibold text-ink-secondary',
        className,
      )}
    >
      {initials || '·'}
    </span>
  )
}

/** A person's avatar: their profile photo when we have one, falling back to the
 *  initials badge. Photos are baked-in local assets under /profiles (see
 *  data/profiles.ts). The `size-*` (and any ring) come from `className`. */
export function Avatar({
  name,
  photo,
  className,
}: {
  name: string
  photo?: string
  className?: string
}) {
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        aria-hidden
        loading="lazy"
        className={cn('shrink-0 rounded-pill bg-surface-2 object-cover', className)}
      />
    )
  }
  return <Initials name={name} className={className} />
}

/** A small coloured dot marking a domain (decorative; paired with a text label). */
export function DomainDot({ domain, className }: { domain: Domain; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-2 shrink-0 rounded-pill', DOMAIN_STYLE[domain].dot, className)}
    />
  )
}

/** Neutral employment badge. GT (the majority) is the quietest; others read as
 *  exceptions. Colour is deliberately not used here (kept for domain + status). */
export function EmploymentBadge({ type }: { type: EmploymentType }) {
  if (type === 'TBH') {
    return (
      <span className="inline-flex items-center rounded-chip border border-dashed border-border-strong px-1.5 py-0.5 text-2xs font-semibold text-ink-muted">
        Open
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-chip bg-surface-2 px-1.5 py-0.5 text-2xs font-semibold text-ink-secondary">
      {EMPLOYMENT_SHORT[type]}
    </span>
  )
}

/** A workstream chip — domain-tinted text on a soft fill. */
export function WsChip({ chip }: { chip: WorkstreamChip }) {
  const s = DOMAIN_STYLE[chip.domain]
  return (
    <span
      title={chip.full}
      className={cn(
        'inline-flex max-w-full items-center truncate rounded-chip border px-1.5 py-0.5 text-2xs font-medium',
        s.soft,
        s.border,
        s.text,
      )}
    >
      {chip.label}
    </span>
  )
}

/** A status pill (only rendered when a person has a status). */
export function StatusPill({
  status,
  month,
  destination,
  className,
}: {
  status: Exclude<PersonStatus, null>
  month: string
  destination?: string
  className?: string
}) {
  const s = STATUS_STYLE[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-2xs font-semibold',
        s.soft,
        s.border,
        s.text,
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-pill', s.dot)} />
      {statusLabel(status, month, destination)}
    </span>
  )
}
