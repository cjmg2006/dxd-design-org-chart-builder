import type { SpecialtyKind } from '@/data/types'

/** Decorative specialty wayfinding icon (aria-hidden — the specialty text is
 *  the accessible label). Ported from the legacy chart's icon set. */
export function SpecialtyIcon({
  kind,
  className,
}: {
  kind: SpecialtyKind
  className?: string
}) {
  const common = {
    viewBox: '0 0 13 13',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    className,
  }
  switch (kind) {
    case 'product':
      return (
        <svg {...common}>
          <path d="M2 11 l1.4-4.2 6.5-6.5 2.3 2.3-6.5 6.5z" />
          <path d="M7.5 3l2.5 2.5" />
        </svg>
      )
    case 'service':
      return (
        <svg {...common}>
          <circle cx="6.5" cy="2.2" r="1.5" />
          <circle cx="2.2" cy="10.8" r="1.5" />
          <circle cx="10.8" cy="10.8" r="1.5" />
          <line x1="6.5" y1="3.7" x2="2.9" y2="9.4" />
          <line x1="6.5" y1="3.7" x2="10.1" y2="9.4" />
          <line x1="3.7" y1="10.8" x2="9.3" y2="10.8" />
        </svg>
      )
    case 'engineer':
      return (
        <svg {...common}>
          <polyline points="4,3 1,6.5 4,10" />
          <polyline points="9,3 12,6.5 9,10" />
          <line x1="8" y1="2" x2="5" y2="11" />
        </svg>
      )
    case 'manager':
      return (
        <svg {...common}>
          <circle cx="6.5" cy="4" r="2.2" />
          <path d="M1.5 12c0-2.8 2.2-5 5-5s5 2.2 5 5" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <rect x="2" y="2" width="9" height="9" rx="2" />
          <line x1="5" y1="6.5" x2="8" y2="6.5" />
          <line x1="6.5" y1="5" x2="6.5" y2="8" />
        </svg>
      )
  }
}
