import { useMemo } from 'react'
import type { Domain, EmploymentType, Org, SpecialtyKind } from '@/data/types'
import { DOMAIN_ORDER, DOMAIN_LABEL } from '@/data/constants'
import { EMPLOYMENT_LABEL } from '@/lib/styles'

/** The numbers a design lead tracks, derived from the whole team (not the active
 *  search/domain filter, so the overview stays stable). Counts run over the filled
 *  roles in `org.people`; the synthetic incoming Head and open roles are their own
 *  lines. */
const EMPLOYMENT_ORDER: EmploymentType[] = ['GT', 'AR', 'Intern', 'Apprentice', 'Consultant']

const DISCIPLINE_LABEL: Record<SpecialtyKind, string> = {
  product: 'Product',
  service: 'Service',
  engineer: 'Engineering',
  manager: 'Management',
  other: 'Other',
}
const DISCIPLINE_ORDER: SpecialtyKind[] = ['product', 'service', 'engineer', 'manager', 'other']

interface Stat {
  label: string
  value: number
}
interface StatGroupData {
  label: string
  items: Stat[]
}

function buildGroups(org: Org): StatGroupData[] {
  const people = org.people

  const employment = EMPLOYMENT_ORDER.map((t) => ({
    label: EMPLOYMENT_LABEL[t],
    value: people.filter((p) => p.employment === t).length,
  }))

  const byDomain = DOMAIN_ORDER.map((d: Domain) => ({
    label: DOMAIN_LABEL[d],
    value: people.filter((p) => p.domain === d).length,
  }))

  const byDiscipline = DISCIPLINE_ORDER.map((k) => ({
    label: DISCIPLINE_LABEL[k],
    value: people.filter((p) => p.specialtyKind === k).length,
  }))

  const inFlux: Stat[] = [
    { label: 'Joining', value: people.filter((p) => p.status === 'joining').length },
    { label: 'On leave', value: people.filter((p) => p.status === 'leave').length },
    { label: 'Departing', value: people.filter((p) => p.status === 'departing').length },
    {
      label: 'Transferring',
      value: people.filter((p) => p.status === 'xfer-in' || p.status === 'xfer-out').length,
    },
  ]

  return [
    {
      label: 'Team',
      items: [
        { label: 'People', value: people.length },
        { label: 'Open roles', value: org.openRoles.length },
      ],
    },
    { label: 'Employment', items: employment },
    { label: 'Domains', items: byDomain },
    { label: 'Disciplines', items: byDiscipline },
    { label: 'In flux', items: inFlux },
  ]
}

/** The manager-view summary band: a calm, labelled read-out of team make-up,
 *  shown above the active view while manager view is on. One surface, grouped by
 *  spacing and headings — not a grid of metric tiles. */
export function LeadershipSummary({ org, onExit }: { org: Org; onExit: () => void }) {
  const groups = useMemo(() => buildGroups(org), [org])

  return (
    <section
      aria-labelledby="leadership-summary-heading"
      className="rounded-card border border-border bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="leadership-summary-heading" className="font-display text-base font-semibold text-ink">
            Team overview
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Team make-up across the whole org. You’re in manager view — employment tags and status
            notes show on the cards.
          </p>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start rounded-chip border border-border px-3 py-2 text-xs font-medium text-ink-secondary transition-colors duration-150 hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-9"
        >
          Exit to employee view
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-5">
        {groups.map((group) => (
          <div key={group.label} className="min-w-0">
            <div className="text-2xs font-semibold text-ink-muted">{group.label}</div>
            <ul className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
              {group.items.map((it) => (
                <li key={it.label} className="flex items-baseline gap-1.5">
                  <span className="text-base font-semibold text-ink tabular">{it.value}</span>
                  <span className="text-2xs text-ink-secondary">{it.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
