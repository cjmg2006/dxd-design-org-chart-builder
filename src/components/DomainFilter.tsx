import { ToggleGroup } from '@base-ui-components/react/toggle-group'
import { Toggle } from '@base-ui-components/react/toggle'
import { DOMAIN_ORDER, DOMAIN_LABEL } from '@/data/constants'
import type { DomainFilter as DomainFilterValue } from '@/lib/filter'
import { cn } from '@/lib/cn'

const OPTIONS: { value: DomainFilterValue; label: string }[] = [
  { value: 'All', label: 'All' },
  ...DOMAIN_ORDER.map((d) => ({ value: d as DomainFilterValue, label: DOMAIN_LABEL[d] })),
]

/** Wrapping row of filter pills — single-select, reflows on narrow screens. */
export function DomainFilter({
  value,
  onChange,
}: {
  value: DomainFilterValue
  onChange: (v: DomainFilterValue) => void
}) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(v) => {
        const next = v[v.length - 1]
        onChange((next as DomainFilterValue) ?? 'All')
      }}
      aria-label="Filter by domain"
      className="flex flex-wrap gap-1.5"
    >
      {OPTIONS.map((o) => (
        <Toggle
          key={o.value}
          value={o.value}
          className={cn(
            'inline-flex min-h-11 items-center rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-secondary sm:min-h-9',
            'transition-colors duration-150 hover:border-border-strong hover:text-ink',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            'data-[pressed]:border-primary data-[pressed]:bg-primary data-[pressed]:text-primary-fg',
          )}
        >
          {o.label}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}
