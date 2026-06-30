import { Collapsible } from '@base-ui-components/react/collapsible'
import { DOMAIN_ORDER, DOMAIN_LABEL } from '@/data/constants'
import { DomainDot, EmploymentBadge } from './primitives'
import { SpecialtyIcon } from './SpecialtyIcon'
import { StatusPill } from './primitives'
import { useManagerAuth } from '@/data/managerAuth'
import type { SpecialtyKind } from '@/data/types'

const SPECIALTIES: { kind: SpecialtyKind; label: string }[] = [
  { kind: 'product', label: 'Product Design' },
  { kind: 'service', label: 'Service Design' },
  { kind: 'engineer', label: 'Design Engineer' },
  { kind: 'manager', label: 'Manager / Lead' },
]

export function Legend({ leading }: { leading?: React.ReactNode }) {
  const { isManager } = useManagerAuth()
  return (
    <Collapsible.Root defaultOpen={false}>
      {/* `leading` (the active-view descriptor) shares the trigger's row, so the
          panel always opens full-width *below* and the trigger never shifts. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {leading}
        <Collapsible.Trigger className="group inline-flex min-h-11 items-center gap-1.5 rounded-chip py-1 text-xs font-medium text-ink-secondary hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-8">
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="size-3.5 transition-transform duration-150 group-data-[panel-open]:rotate-90"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
          >
            <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          What the colours &amp; icons mean
        </Collapsible.Trigger>
      </div>
      <Collapsible.Panel className="overflow-hidden">
        <div className="mt-3 grid gap-4 rounded-card border border-border bg-surface p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <LegendBlock title="Domain">
            <ul className="space-y-1.5">
              {DOMAIN_ORDER.map((d) => (
                <li key={d} className="flex items-center gap-2 text-ink-secondary">
                  <DomainDot domain={d} />
                  {DOMAIN_LABEL[d]}
                </li>
              ))}
            </ul>
          </LegendBlock>

          {isManager && (
            <LegendBlock title="Status">
              <div className="flex flex-col items-start gap-1.5">
                <StatusPill status="joining" month="Jul" />
                <StatusPill status="leave" month="Aug" />
                <StatusPill status="departing" month="Jul" />
                <StatusPill status="xfer-in" month="Jul" />
              </div>
            </LegendBlock>
          )}

          <LegendBlock title="Specialty">
            <ul className="space-y-1.5">
              {SPECIALTIES.map((s) => (
                <li key={s.kind} className="flex items-center gap-2 text-ink-secondary">
                  <SpecialtyIcon kind={s.kind} className="size-3.5 text-ink-muted" />
                  {s.label}
                </li>
              ))}
            </ul>
          </LegendBlock>

          <LegendBlock title="Employment">
            <div className="flex flex-wrap gap-1.5">
              <EmploymentBadge type="GT" />
              <EmploymentBadge type="AR" />
              <EmploymentBadge type="Intern" />
              <EmploymentBadge type="Apprentice" />
              <EmploymentBadge type="Consultant" />
              <EmploymentBadge type="TBH" />
            </div>
            <p className="mt-2 text-2xs text-ink-muted">GT = GovTech · AR = Augmented Resource</p>
          </LegendBlock>
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}

function LegendBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-2xs font-semibold text-ink-muted">{title}</h3>
      {children}
    </div>
  )
}
