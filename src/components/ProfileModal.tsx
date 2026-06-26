import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Dialog } from '@base-ui-components/react/dialog'
import type { Person, ProfileOverride } from '@/data/types'
import { type ProfilePhoto } from '@/data/profiles'
import { useProfile } from '@/data/profileViewer'
import { useOrgEditsContext } from '@/data/orgEdits'
import { saveProfilePhoto } from '@/data/sharedStore'
import { resizeImageToDataUrl } from '@/lib/image'
import { EMPLOYMENT_LABEL } from '@/lib/styles'
import { cn } from '@/lib/cn'
import { Avatar, DomainDot } from './primitives'

interface ProfileModalProps {
  person: Person | null
  onClose: () => void
}

/** The full "colleague, friend, human" profile — a roomy modal housing the rich
 *  content (photo, personality, working style, links, gallery). Opened from a
 *  card's photo or the detail dialog; anyone can edit it + upload a photo in-app. */
export function ProfileModal({ person, onClose }: ProfileModalProps) {
  return (
    <Dialog.Root
      open={!!person}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-[2px] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2',
            'max-h-[calc(100vh-3rem)] overflow-y-auto rounded-card border border-border bg-surface shadow-xl',
            'transition-all duration-200 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0',
          )}
        >
          {person && <ProfileBody key={person.name} person={person} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ProfileBody({ person }: { person: Person }) {
  const [editing, setEditing] = useState(false)
  return editing ? (
    <ProfileEditor person={person} onDone={() => setEditing(false)} />
  ) : (
    <ProfileView person={person} onEdit={() => setEditing(true)} />
  )
}

/* ── Read view ────────────────────────────────────────────────────────────── */

function ProfileView({ person, onEdit }: { person: Person; onEdit: () => void }) {
  const profile = useProfile(person)

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-surface/85 px-4 py-2.5 backdrop-blur">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-8 items-center gap-1.5 rounded-chip border border-border bg-surface px-3 text-xs font-medium text-ink-secondary hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <PencilIcon />
          {profile ? 'Edit profile' : 'Add profile'}
        </button>
        <Dialog.Close
          aria-label="Close profile"
          className="inline-flex size-9 items-center justify-center rounded-chip text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
            <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
          </svg>
        </Dialog.Close>
      </div>

      <div className="px-6 pb-10 pt-1 sm:px-9">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <Avatar
            name={person.name}
            photo={profile?.photo}
            className="size-28 self-center text-3xl shadow-md ring-4 ring-surface sm:size-32 sm:self-start"
          />
          <div className="min-w-0 flex-1">
            <Dialog.Title className="flex items-center gap-2 font-display text-2xl text-ink">
              {profile?.emoji && <span aria-hidden>{profile.emoji}</span>}
              <span className="min-w-0">{person.name}</span>
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-ink-secondary">
              {profile?.jobTitle ??
                (person.specialty && person.specialty !== '-' ? person.specialty : 'Designer')}
            </Dialog.Description>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-2xs text-ink-secondary">
              <span className="inline-flex items-center gap-1.5">
                <DomainDot domain={person.domain} />
                {person.domain}
              </span>
              <Sep />
              <span>{EMPLOYMENT_LABEL[person.employment]}</span>
              {profile?.joined && (
                <>
                  <Sep />
                  <span>Joined {formatJoined(profile.joined)}</span>
                </>
              )}
            </div>

            {profile && (profile.linkedin || profile.portfolio || profile.email) && (
              <div className="mt-3.5 flex flex-wrap gap-2">
                {profile.linkedin && (
                  <LinkButton href={ensureHttp(profile.linkedin)} icon={<LinkedInIcon />}>
                    LinkedIn
                  </LinkButton>
                )}
                {profile.portfolio && (
                  <LinkButton href={ensureHttp(profile.portfolio)} icon={<GlobeIcon />}>
                    Portfolio
                  </LinkButton>
                )}
                {profile.email && (
                  <LinkButton href={`mailto:${profile.email}`} icon={<MailIcon />}>
                    Email
                  </LinkButton>
                )}
              </div>
            )}
          </div>
        </div>

        {profile && (profile.specialisedIn?.length || profile.contributions?.length) ? (
          <div className="mt-6 space-y-3 rounded-card bg-surface-2/60 p-4">
            {profile.specialisedIn?.length ? (
              <TagRow label="Specialised in" items={profile.specialisedIn} tone="primary" />
            ) : null}
            {profile.contributions?.length ? (
              <TagRow label="Worked on" items={profile.contributions} tone="neutral" />
            ) : null}
          </div>
        ) : null}

        {profile ? (
          <div className="mt-8 space-y-8 border-t border-border pt-8">
            {profile.askMeAbout?.length ? (
              <Section title="Ask me about">
                <Chips items={profile.askMeAbout} tone="primary" />
              </Section>
            ) : null}

            {(profile.personality?.length || profile.personalityImage) && (
              <Section title="How I'd describe myself">
                {profile.personality?.length ? <BulletList items={profile.personality} /> : null}
                {profile.personalityImage && (
                  <img src={profile.personalityImage} alt="" className="mt-3 max-w-xs rounded-card border border-border" />
                )}
              </Section>
            )}

            <div className="space-y-8">
              {VIEW_SECTIONS.map(({ key, title }) =>
                profile[key]?.length ? (
                  <Section key={key} title={title}>
                    <BulletList items={profile[key] as string[]} />
                  </Section>
                ) : null,
              )}
            </div>

            {profile.gallery?.length ? (
              <Section title="A few moments">
                <Gallery photos={profile.gallery} />
              </Section>
            ) : null}
          </div>
        ) : (
          <p className="mt-8 border-t border-border pt-8 text-sm text-ink-muted">
            No profile for {person.name.split(' ')[0]} yet — hit{' '}
            <span className="font-medium text-ink-secondary">Add profile</span> to add a photo and a few words.
          </p>
        )}
      </div>
    </div>
  )
}

/* ── Edit view ────────────────────────────────────────────────────────────── */

// Every list-style profile field the editor manages (each edited one-per-line).
type ListKey =
  | 'askMeAbout'
  | 'personality'
  | 'workingStyle'
  | 'communicationStyle'
  | 'role'
  | 'responsibilities'
  | 'successLooksLike'
  | 'supportNeeded'
  | 'petPeeves'
  | 'otherCommitments'
type SingleKey = 'emoji' | 'jobTitle' | 'joined' | 'email' | 'linkedin' | 'portfolio'
type Form = Record<ListKey, string> & Record<SingleKey, string>

// Read view: sections shown (as bullet lists) after the "Ask me about" chips and
// the personality block, which are rendered specially above.
const VIEW_SECTIONS: { key: ListKey; title: string }[] = [
  { key: 'workingStyle', title: 'My working style' },
  { key: 'communicationStyle', title: 'My communication style' },
  { key: 'role', title: 'My role' },
  { key: 'responsibilities', title: "I'm responsible for" },
  { key: 'successLooksLike', title: 'What success looks like' },
  { key: 'supportNeeded', title: 'Support I need' },
  { key: 'petPeeves', title: 'My pet peeves' },
  { key: 'otherCommitments', title: 'Other commitments' },
]

// Edit view: every list field, in order, each as a one-per-line textarea.
const EDIT_SECTIONS: { key: ListKey; title: string }[] = [
  { key: 'askMeAbout', title: 'Ask me about' },
  { key: 'personality', title: "How I'd describe myself" },
  ...VIEW_SECTIONS,
]

function ProfileEditor({ person, onDone }: { person: Person; onDone: () => void }) {
  const profile = useProfile(person)
  const { edits, setProfile } = useOrgEditsContext()
  const fileRef = useRef<HTMLInputElement>(null)

  const lines = (a?: string[]) => (a ?? []).join('\n')
  const [form, setForm] = useState<Form>(() => ({
    emoji: profile?.emoji ?? '',
    jobTitle: profile?.jobTitle ?? '',
    joined: profile?.joined ?? '',
    email: profile?.email ?? '',
    linkedin: profile?.linkedin ?? '',
    portfolio: profile?.portfolio ?? '',
    personality: lines(profile?.personality),
    askMeAbout: lines(profile?.askMeAbout),
    workingStyle: lines(profile?.workingStyle),
    communicationStyle: lines(profile?.communicationStyle),
    role: lines(profile?.role),
    responsibilities: lines(profile?.responsibilities),
    successLooksLike: lines(profile?.successLooksLike),
    supportNeeded: lines(profile?.supportNeeded),
    petPeeves: lines(profile?.petPeeves),
    otherCommitments: lines(profile?.otherCommitments),
  }))
  // specialisedIn / contributions kept beside the typed Form (they're chips, not sections)
  const [tags, setTags] = useState({
    specialisedIn: lines(profile?.specialisedIn),
    contributions: lines(profile?.contributions),
  })

  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof Form, value: string) => setForm((f) => ({ ...f, [key]: value }))
  const shownPhoto = photoPreview ?? (photoRemoved ? undefined : profile?.photo)

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setError(null)
    try {
      const dataUrl = await resizeImageToDataUrl(file)
      setPhotoPreview(dataUrl)
      setPhotoRemoved(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that image')
    }
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    const toLines = (s: string) => {
      const arr = s.split('\n').map((t) => t.trim()).filter(Boolean)
      return arr.length ? arr : undefined
    }
    const clean = (s: string) => s.trim() || undefined
    try {
      const prev = edits.profiles[person.name]
      let photo = prev?.photo
      let photoV = prev?.photoV
      if (photoPreview) {
        await saveProfilePhoto(person.name, photoPreview)
        photo = 'custom'
        photoV = Date.now()
      } else if (photoRemoved) {
        photo = ''
        photoV = undefined
      }
      const override: ProfileOverride = {
        emoji: clean(form.emoji),
        jobTitle: clean(form.jobTitle),
        joined: clean(form.joined),
        email: clean(form.email),
        linkedin: clean(form.linkedin),
        portfolio: clean(form.portfolio),
        specialisedIn: toLines(tags.specialisedIn),
        contributions: toLines(tags.contributions),
        personality: toLines(form.personality),
        askMeAbout: toLines(form.askMeAbout),
        workingStyle: toLines(form.workingStyle),
        communicationStyle: toLines(form.communicationStyle),
        role: toLines(form.role),
        responsibilities: toLines(form.responsibilities),
        successLooksLike: toLines(form.successLooksLike),
        supportNeeded: toLines(form.supportNeeded),
        petPeeves: toLines(form.petPeeves),
        otherCommitments: toLines(form.otherCommitments),
      }
      if (photo !== undefined) override.photo = photo
      if (photoV !== undefined) override.photoV = photoV
      setProfile(person.name, override)
      onDone()
    } catch {
      setError("Couldn't save the photo — the shared store may be unreachable. Try again.")
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-surface/90 px-4 py-2.5 backdrop-blur">
        <span className="pl-1 text-2xs text-ink-muted">Editing · shared with the team</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDone}
            disabled={saving}
            className="inline-flex h-9 items-center rounded-chip border border-border bg-surface px-3 text-sm font-medium text-ink-secondary hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-chip bg-primary px-4 text-sm font-semibold text-primary-fg hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="px-6 pb-10 pt-1 sm:px-9">
        <Dialog.Title className="sr-only">Edit {person.name}'s profile</Dialog.Title>

        {error && (
          <div className="mb-4 rounded-chip border border-departing-border bg-departing-soft px-3 py-2 text-sm text-departing-text">
            {error}
          </div>
        )}

        {/* Photo + name */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex flex-col items-center gap-2">
            <Avatar
              name={person.name}
              photo={shownPhoto}
              className="size-28 text-3xl shadow-md ring-4 ring-surface"
            />
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-8 items-center gap-1.5 rounded-chip border border-border bg-surface px-2.5 text-xs font-medium text-ink-secondary hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <CameraIcon />
                {shownPhoto ? 'Change' : 'Upload photo'}
              </button>
              {shownPhoto && (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPreview(null)
                    setPhotoRemoved(true)
                  }}
                  className="inline-flex h-8 items-center rounded-chip px-2 text-xs font-medium text-ink-muted hover:text-departing-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-departing-text"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 self-stretch">
            <div className="font-display text-2xl text-ink">{person.name}</div>
            <p className="mt-0.5 text-2xs text-ink-muted">
              Name, domain &amp; reporting line are set from the org chart — edit those from the card’s detail dialog.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Job title">
                <input className={INPUT} value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} placeholder="e.g. Product Designer" />
              </Field>
              <Field label="Emoji">
                <input className={INPUT} value={form.emoji} onChange={(e) => set('emoji', e.target.value)} placeholder="🌻" maxLength={8} />
              </Field>
              <Field label="Joined">
                <input className={INPUT} type="date" value={form.joined} onChange={(e) => set('joined', e.target.value)} />
              </Field>
              <Field label="Email">
                <input className={INPUT} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@moe.gov.sg" />
              </Field>
              <Field label="LinkedIn">
                <input className={INPUT} value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="linkedin.com/in/…" />
              </Field>
              <Field label="Portfolio">
                <input className={INPUT} value={form.portfolio} onChange={(e) => set('portfolio', e.target.value)} placeholder="yoursite.com" />
              </Field>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 rounded-card bg-surface-2/60 p-4 sm:grid-cols-2">
          <Field label="Specialised in" hint="One per line">
            <textarea className={TEXTAREA} value={tags.specialisedIn} onChange={(e) => setTags((t) => ({ ...t, specialisedIn: e.target.value }))} placeholder={'UX design\nUI design'} />
          </Field>
          <Field label="Worked on" hint="One per line">
            <textarea className={TEXTAREA} value={tags.contributions} onChange={(e) => setTags((t) => ({ ...t, contributions: e.target.value }))} placeholder={'Parents Gateway\nAll Ears'} />
          </Field>
        </div>

        <div className="mt-8 space-y-6 border-t border-border pt-8">
          {EDIT_SECTIONS.map(({ key, title }) => (
            <Field key={key} label={title} hint="One per line">
              <textarea className={TEXTAREA} value={form[key]} onChange={(e) => set(key, e.target.value)} />
            </Field>
          ))}
        </div>
      </div>
    </div>
  )
}

const INPUT =
  'h-9 w-full rounded-chip border border-border bg-surface px-2.5 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
const TEXTAREA =
  'min-h-[4.5rem] w-full rounded-chip border border-border bg-surface px-2.5 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
        {hint && <span className="text-2xs text-ink-faint">{hint}</span>}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}

/* ── Read-view pieces ─────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">{title}</h3>
      <div className="mt-2.5">{children}</div>
    </section>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-secondary">
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-pill bg-border-strong" />
          <span className="min-w-0">{t}</span>
        </li>
      ))}
    </ul>
  )
}

function Chips({ items, tone = 'neutral' }: { items: string[]; tone?: 'neutral' | 'primary' }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t, i) => (
        <span
          key={i}
          className={cn(
            'inline-flex items-center rounded-pill border px-2.5 py-1 text-xs font-medium',
            tone === 'primary'
              ? 'border-primary-soft bg-primary-soft text-primary-text'
              : 'border-border bg-surface-2 text-ink-secondary',
          )}
        >
          {t}
        </span>
      ))}
    </div>
  )
}

function TagRow({ label, items, tone }: { label: string; items: string[]; tone: 'neutral' | 'primary' }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="shrink-0 pt-0.5 text-2xs font-semibold uppercase tracking-wide text-ink-muted sm:w-28">
        {label}
      </span>
      <Chips items={items} tone={tone} />
    </div>
  )
}

function Gallery({ photos }: { photos: ProfilePhoto[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((p, i) => (
        <figure key={i} className="min-w-0">
          <img
            src={p.src}
            alt={p.caption ?? ''}
            loading="lazy"
            className="aspect-square w-full rounded-card border border-border object-cover"
          />
          {p.caption && <figcaption className="mt-1.5 text-2xs text-ink-muted">{p.caption}</figcaption>}
        </figure>
      ))}
    </div>
  )
}

function LinkButton({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-border bg-surface px-3 text-xs font-medium text-ink-secondary hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="text-ink-muted">{icon}</span>
      {children}
    </a>
  )
}

function Sep() {
  return <span aria-hidden className="text-ink-faint">·</span>
}

function formatJoined(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })
}

function ensureHttp(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

/* ── Icons ────────────────────────────────────────────────────────────────── */

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path d="M11 2.5l2.5 2.5M3 13l1-3 7-7 2.5 2.5-7 7-3 1Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function CameraIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden>
      <path d="M2 5.5h2l1-1.5h4l1 1.5h2a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <circle cx="8" cy="9" r="2.2" />
    </svg>
  )
}
function LinkedInIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden>
      <path d="M3.4 5.5H1.6V14h1.8V5.5ZM2.5 1.6a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1ZM14.4 8.9c0-2-.6-3.5-2.9-3.5-1.1 0-1.8.6-2.1 1.1h0V5.5H7.6V14h1.8V9.8c0-1.1.2-2.1 1.5-2.1 1.3 0 1.3 1.2 1.3 2.2V14h1.8V8.9Z" />
    </svg>
  )
}
function GlobeIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden>
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12M8 2c1.8 1.6 2.8 3.8 2.8 6S9.8 12.4 8 14C6.2 12.4 5.2 10.2 5.2 8S6.2 3.6 8 2Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function MailIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden>
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="M2.5 4.5 8 8.5l5.5-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
