import * as React from 'react'
import { ToggleGroup } from '@base-ui-components/react/toggle-group'
import { Toggle } from '@base-ui-components/react/toggle'
import { cn } from '@/lib/cn'

export interface SegOption<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
}

/** Single-select segmented control (Base UI ToggleGroup, multiple=false). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  options: SegOption<T>[]
  ariaLabel: string
}) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(v) => {
        const next = v[v.length - 1]
        if (next) onChange(next as T)
      }}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-pill border border-border bg-surface p-1"
    >
      {options.map((o) => (
        <Toggle
          key={o.value}
          value={o.value}
          className={cn(
            'inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 py-2 text-xs font-medium text-ink-secondary sm:min-h-9',
            'transition-colors duration-150 hover:text-ink',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            'data-[pressed]:bg-primary data-[pressed]:text-primary-fg',
          )}
        >
          {o.icon}
          {o.label}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}
