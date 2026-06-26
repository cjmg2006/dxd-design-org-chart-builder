import { createContext, useContext } from 'react'
import type { Person } from './types'
import { useOrgEditsContext } from './orgEdits'
import { getEffectiveProfile, type Profile } from './profiles'

/** Lets any card or dialog open a person's full "human" profile modal without
 *  threading a callback through every view. App provides the implementation and
 *  renders the modal; PersonCard / PersonDetail just call openProfile. */
interface ProfileViewer {
  openProfile: (person: Person) => void
}

const ProfileViewerContext = createContext<ProfileViewer>({ openProfile: () => {} })

export const ProfileViewerProvider = ProfileViewerContext.Provider

export function useProfileViewer(): ProfileViewer {
  return useContext(ProfileViewerContext)
}

/** The effective profile for a person — baked data merged with the live shared
 *  edit. Re-renders the caller when anyone's edits change (so photos/bios stay
 *  current). Must be used within an OrgEditsProvider. */
export function useProfile(person: Pick<Person, 'name'>): Profile | undefined {
  const { edits } = useOrgEditsContext()
  return getEffectiveProfile(person, edits)
}
