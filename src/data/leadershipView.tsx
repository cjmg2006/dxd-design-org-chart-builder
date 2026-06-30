import { createContext, useContext } from 'react'

/** Leadership view is an opt-in lens (off by default, reset each load), reached
 *  via the ⌘K command palette. When on, person nodes show their employment tag
 *  again and a summary band of the numbers a design lead tracks appears above the
 *  view. App owns the boolean; PersonCard / the tree outline read it so the tag
 *  doesn't have to be threaded through every view. */
interface LeadershipView {
  on: boolean
}

const LeadershipViewContext = createContext<LeadershipView>({ on: false })

export const LeadershipViewProvider = LeadershipViewContext.Provider

export function useLeadershipView(): LeadershipView {
  return useContext(LeadershipViewContext)
}
