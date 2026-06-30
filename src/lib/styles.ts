import type { Domain, EmploymentType, PersonStatus } from '@/data/types'

// NOTE: class strings here are written out in full (never interpolated) so the
// Tailwind v4 scanner sees them and generates the utilities.

export interface DomainStyle {
  dot: string
  text: string
  soft: string
  border: string
  ring: string
}

export const DOMAIN_STYLE: Record<Domain, DomainStyle> = {
  Teachers: {
    dot: 'bg-teachers',
    text: 'text-teachers-text',
    soft: 'bg-teachers-soft',
    border: 'border-teachers-border',
    ring: 'ring-teachers-border',
  },
  Students: {
    dot: 'bg-students',
    text: 'text-students-text',
    soft: 'bg-students-soft',
    border: 'border-students-border',
    ring: 'ring-students-border',
  },
  Parents: {
    dot: 'bg-parents',
    text: 'text-parents-text',
    soft: 'bg-parents-soft',
    border: 'border-parents-border',
    ring: 'ring-parents-border',
  },
  Platforms: {
    dot: 'bg-platforms',
    text: 'text-platforms-text',
    soft: 'bg-platforms-soft',
    border: 'border-platforms-border',
    ring: 'ring-platforms-border',
  },
  HQ: {
    dot: 'bg-hq',
    text: 'text-hq-text',
    soft: 'bg-hq-soft',
    border: 'border-hq-border',
    ring: 'ring-hq-border',
  },
}

export interface StatusStyle {
  text: string
  soft: string
  border: string
  dot: string
}

// leave / joining / departing / transfer — functional colours, shown only when present.
export const STATUS_STYLE: Record<Exclude<PersonStatus, null>, StatusStyle> = {
  leave: {
    text: 'text-leave-text',
    soft: 'bg-leave-soft',
    border: 'border-leave-border',
    dot: 'bg-leave',
  },
  joining: {
    text: 'text-joining-text',
    soft: 'bg-joining-soft',
    border: 'border-joining-border',
    dot: 'bg-joining',
  },
  departing: {
    text: 'text-departing-text',
    soft: 'bg-departing-soft',
    border: 'border-departing-border',
    dot: 'bg-departing',
  },
  'xfer-in': {
    text: 'text-transfer-text',
    soft: 'bg-transfer-soft',
    border: 'border-transfer-border',
    dot: 'bg-transfer',
  },
  'xfer-out': {
    text: 'text-transfer-text',
    soft: 'bg-transfer-soft',
    border: 'border-transfer-border',
    dot: 'bg-transfer',
  },
}

export function statusLabel(
  status: Exclude<PersonStatus, null>,
  month: string,
  destination?: string,
): string {
  const m = month && month !== 'TBD' ? month : ''
  const dest = (destination ?? '').trim()
  // Show the date when it's set; fall back to "date TBD" only when nothing else
  // (a destination) is carrying the badge.
  const tail = m ? ` · ${m}` : dest ? '' : ' · date TBD'
  switch (status) {
    case 'leave':
      return `On leave · until ${m || 'date TBD'}`
    case 'joining':
      return `Joining${tail}`
    case 'departing':
      return `Departing${dest ? ` → ${dest}` : ''}${tail}`
    case 'xfer-in':
      return `Transferring in${dest ? ` ← ${dest}` : ''}${tail}`
    case 'xfer-out':
      return `Transferring out${dest ? ` → ${dest}` : ''}${tail}`
  }
}

export function statusShort(status: Exclude<PersonStatus, null>): string {
  switch (status) {
    case 'leave':
      return 'On leave'
    case 'joining':
      return 'Joining'
    case 'departing':
      return 'Departing'
    case 'xfer-in':
      return 'Transfer in'
    case 'xfer-out':
      return 'Transfer out'
  }
}

// Employment is kept calm: a neutral badge for everyone, full word in detail.
export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  GT: 'GovTech',
  AR: 'Augmented Resource',
  Intern: 'Intern',
  Apprentice: 'Apprentice',
  Consultant: 'Consultant',
  TBH: 'Open role',
}

export const EMPLOYMENT_SHORT: Record<EmploymentType, string> = {
  GT: 'GT',
  AR: 'AR',
  Intern: 'Intern',
  Apprentice: 'Appr',
  Consultant: 'Consult',
  TBH: 'TBH',
}
