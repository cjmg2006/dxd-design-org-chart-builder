interface SearchBoxProps {
  value: string
  onChange: (v: string) => void
  resultCount: number
  total: number
}

/** Labelled people search. Visible label (A11Y-3); live result count announced
 *  via a polite live region without stealing focus (A11Y-11, transient). */
export function SearchBox({ value, onChange, resultCount, total }: SearchBoxProps) {
  return (
    <div className="w-full max-w-sm">
      {/* Label + live result count share one row, so the box is just label +
          input — its bottom aligns cleanly with the View toggle beside it. */}
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor="people-search" className="text-2xs font-semibold text-ink-muted">
          Find people
        </label>
        <span aria-live="polite" className="truncate text-2xs text-ink-muted tabular">
          {value.trim() ? `${resultCount} of ${total} ${resultCount === 1 ? 'person' : 'people'}` : ''}
        </span>
      </div>
      <div className="relative mt-1">
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
        >
          <circle cx="7" cy="7" r="4.5" />
          <line x1="14" y1="14" x2="10.5" y2="10.5" strokeLinecap="round" />
        </svg>
        <input
          id="people-search"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Name, specialty, or workstream…"
          autoComplete="off"
          className="h-10 w-full rounded-pill border border-border bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      </div>
    </div>
  )
}
