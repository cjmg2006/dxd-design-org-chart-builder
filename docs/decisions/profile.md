# Design decision record — Person profile (view + in-app editor)

> Re-audit + polish of the shipped profile feature against the TFX-DS catalog.
> Started at the Phase 3 plan gate; finished at Phase 6 with the evaluator verdict.

- **Date:** 2026-06-26
- **Product:** TW surface — DXD Design Team org chart (internal MOE design-org tool)
- **Change type:** modification (catalog re-audit + polish of an existing surface)
- **Page type:** overlay — profile **read view** + **edit form**
- **Run type:** attended
- **The person and the moment:** This tool is internal to the DXD design org, not
  teacher-facing. The moment: a designer opens a teammate's card to learn who they
  are as a colleague, or updates their own profile + photo so the team can find them.

## Sprint contract (done-criteria)

1. The profile components hold to the TFX token system — no raw colour, off-scale
   spacing, or off-scale radii (TOK-1..3, COL-1..2).
2. All text meets AA contrast (A11Y-1) — informational text uses `ink-muted`, never
   the decorative-only `ink-faint`.
3. Every interactive target is ≥44px on mobile (A11Y-4), matching the app's existing
   `min-h-11 sm:min-h-9` field pattern.
4. The async Save is announced and focus is managed (A11Y-11): error via `role="alert"`,
   focus returns to the Edit button on success.
5. Running prose is capped at a comfortable measure (LAY-4, ≤68ch) even though the
   modal is intentionally wide.
6. The editor is single-column; the residual "form in a modal" is a documented SLP-10
   waiver justified by the routerless architecture.

## Chosen approach

Scoped polish of the existing profile modal (read + edit views) — contrast, target
size, line-measure, motion, and announce/focus fixes, plus collapsing the editor to a
single column. No structural rebuild; established iconography, radius, layout, and copy
were preserved.

## Rejected options

- **Routed profile page (to fully satisfy SLP-10)** — rejected: the app is a routerless
  SPA where every editing surface (person detail, add-person, history) is already a
  modal. Introducing routing for one surface is inconsistent and a far larger change
  than the request, which was a quality pass on the existing modal.

## Tradeoffs, named

- The profile **editor stays a modal** rather than a routed page (SLP-10 waiver). This
  sacrifices deep-linking and browser-back for that one task, accepted for consistency
  with the rest of the app and the explicitly requested "page modal" form factor. The
  risk a modal carries — losing work on an accidental backdrop dismiss — is removed:
  edits are staged and commit only on Save, and while editing the dialog refuses
  backdrop/Esc dismissal (leave via Cancel → read view first), so a stray click can't
  discard a draft.
- The modal is kept **wide** (`max-w-4xl`) per explicit request; readability is
  protected by capping running-prose columns at ~68ch rather than narrowing the modal.

## Controls in scope

A11Y-1, A11Y-2, A11Y-3, A11Y-4, A11Y-6, A11Y-8, A11Y-11, TOK-1, TOK-2, TOK-3, COL-1,
COL-2, TYP-1, TYP-2, TYP-3, CMP-1, CMP-2, CMP-3, CNT-1, CNT-2, MOT-1, SLP-1..10, LAY-2,
LAY-4. (The Save action is async + the photo Remove is reversible, so the `[flow]`
controls CMP-2/CMP-3 apply.)

## Waivers granted

| Control | Tier | Reason | Approver | Where recorded |
|---------|------|--------|----------|----------------|
| SLP-10 | L1 | The profile editor is a multi-field form in a modal with internal scrolling. The app is a routerless SPA where every editing surface is already a modal; the form factor was explicitly requested. Reduced to single-column to drop the column-layout trigger, and backdrop/Esc dismiss is blocked while editing so staged edits can't be lost. | Wondo Jeong (design lead / product owner) | inline `tfx-waive SLP-10` at `ProfileModal.tsx:50` + this record |

> L0 controls are never waivable. The L0 items here (A11Y-1, A11Y-2, A11Y-3, CMP-2)
> were fixed/met, not waived.

## Plan approval

- **Approved by:** Wondo Jeong (design lead)
- **Approved on:** 2026-06-26 ("go!" — fixes 1–3, 5, 6 + SLP-10 option A)

## Verify verdict

- **Screenshots:** read 1280 `scratchpad/B-read-1280.png`; edit 1280 `B-edit-1280.png`;
  read 360 `B-read-360.png`; edit 360 `B-edit-360.png`; read/edit 320 `C-read-320.png` /
  `C-edit-320.png` (LAY-2 reflow confirmed — `320/320`, no two-dimensional scroll).
  Dismiss-guard behaviour verified live (Esc + backdrop ignored while editing; Cancel
  → read; Esc closes from read).
- **Token block line range:** `src/index.css:10-113` (the `/* tfx-tokens */` `@theme`
  region, exempt from token-audit).
- **Dark mode:** N/A — product has no dark mode (no theme toggle, no `.dark` layer).
- **Deterministic controls:** `checks/token-audit.py` → PASS (scripted: TOK-1..3,
  COL-1..2). `checks/a11y-static.py` → PASS on the profile components (scripted static
  subset of A11Y-2/3/8: focus-visible, non-focusable handlers, icon-only names). One
  pre-existing hit on `PersonDetail.tsx`'s `<select>` is a false positive — focus shows
  on the `FieldRow` wrapper via `focus-within`. Contrast (A11Y-1), computed target size
  (A11Y-4), reflow (LAY-2), measure (LAY-4), SLP-10, and CMP-2/3 copy were verified
  manually + by the evaluator.
- **Evaluator verdict** (full `tfx-design-evaluator` output, verbatim — graded the
  state *before* the post-verdict fixes below):

```
VERDICT: pass-with-findings

BLOCKING (must fix before ship):
- SLP-10 (L1, judgment) — FAIL, no waiver on file. The profile editor is a multi-section
  form inside a Base UI Dialog.Popup with overflow-y-auto (ProfileModal.tsx:34). ~18 fields
  across four logical groups; the single-column fix removed only the column trigger; the
  internal scrollbar and multiple sections independently fail. A grep of src/ and docs/
  finds no `tfx-waive SLP-10` annotation — the rationale/approver exist only in the prompt,
  not on file. Per the mechanical rule, an L1 with no waiver on file is blocking. To clear:
  route the editor to its own page, or land an inline `tfx-waive SLP-10 approver="Wondo Jeong"
  reason="..."`. Judgment: single-column alone does not make this an acceptable modal; it
  needs the documented waiver to ship, and that waiver is currently absent.

ADVISORY (should fix):
- MOT-1 (L2) — HistoryDialog.tsx:44, AddPersonDialog.tsx:44, TreeView.tsx:917 still use
  transition-all (ProfileModal.tsx:35 is correctly transition-[opacity,transform]).
- LAY-4 measure on max-w-[68ch] — within the 80ch ceiling (acceptable), above the ~66ch
  target. Not a finding; close call only.

QUALITY GRADES: Design quality — strong (clear hierarchy, deliberate spacing rhythm, calm
token palette, Kind Utility copy). Originality — strong/restrained (no SLP tells; blue chips
are deliberate wayfinding). Craft — strong (loading/success/error/empty/photo states all
designed; degrades gracefully; responsive verified). Functionality — acceptable (edit→save→read
preserves work; the one concern is an accidental backdrop click on the large scrolling editor
discarding staged edits — the real harm behind SLP-10).

JUDGMENT/HYBRID CONTROL NOTES: A11Y-1 pass (ink-muted 5.19:1 on white / 4.56:1 on surface-2;
placeholders+hints now ink-muted; decorative · stays ink-faint + aria-hidden). A11Y-2 pass
(all 9 controls focus-visible; PersonDetail select is a focus-within false positive, out of
scope). A11Y-3 pass (Field wraps every input in a <label>). A11Y-6 pass (decorative imgs
aria-hidden/empty alt; gallery alt=caption). A11Y-8 pass (native buttons; file input proxied
by a labelled button). A11Y-11 pass (success → focus move single channel; error → role=alert,
focus untouched; no double-announce). TOK-1/2/3 pass (token-audit clean; radii on scale; peer
containers consistent). TYP-1/2/3 pass (Plus Jakarta + Inter; ≥11px; on-scale). COL-1 pass
(Save = #0064FF product primary). COL-2 pass (error uses departing/Radix red). CMP-1 pass
(asserted, no manifest — Base UI dialog + native inputs, no unwarranted custom widgets).
CMP-2 pass/N-A for this surface (no destructive verb; the repo's Remove-from-chart two-step
confirm is elsewhere and passes). CMP-3 pass (Save loading/success/error). CNT-1 pass (errors
say what happened + next step, no codes). CNT-2 pass (plain labels). MOT-1 pass for ProfileModal;
fail on sibling dialogs (advisory). SLP-1/2/3/4/8 pass (no gradients/glow/side-tab/nested-cards/
overshoot). SLP-9 pass (functional, human copy; no buzzwords/em-dash chains/artifacts). SLP-10
FAIL (see blocking). LAY-2 pass-with-caveat (360 reflows; 320/400%-zoom not yet tested —
recommend a 320px spot-check). LAY-4 pass (BulletList max-w-[68ch], not full-bleed at 1280).

UNCOVERED (feed the ratchet):
- Accidental-dismiss data loss on the editor: a backdrop click / Esc on the open editor closes
  the dialog and silently discards staged edits — no "discard changes?" guard. No control cleanly
  covers it (CMP-2 targets named destructive actions; SLP-10 targets the surface choice). Worth a
  ratchet item ("staged-edit modals confirm before discarding on accidental dismiss").
- Dark mode — N/A: product has no dark mode.

Overall: NO-GO until SLP-10 is resolved — either route the editor to a page, or land an auditable
`tfx-waive SLP-10` with the named approver. Every other in-scope control passes (six fixes verified
to hold: A11Y-1 contrast, A11Y-4 targets, A11Y-11 focus, single-column edit layout, LAY-4 measure,
MOT-1 on this modal). The single blocker is that the SLP-10 residual is carried as a waiver that
does not exist in the code or decision records.
```

  **Resolution (post-verdict fixes — re-verified after):**
  - **SLP-10 blocker — CLEARED.** Landed the auditable `tfx-waive SLP-10 approver="Wondo Jeong" …`
    annotation at `ProfileModal.tsx:50` (greppable), plus the dismiss guard: while editing, the
    dialog ignores backdrop/Esc so staged edits can't be lost (verified live — Esc/backdrop keep
    Save present; Cancel → read; Esc then closes). The editor remains single-column.
  - **MOT-1 advisory — CLEARED.** `transition-all` removed from HistoryDialog, AddPersonDialog,
    and the TreeView node button; `grep -rn transition-all src` now returns **0**.
  - **LAY-2 320px caveat — CLEARED.** Spot-checked at 320 (read + edit): `320/320`, single column,
    controls reachable, nothing clipped (`C-edit-320.png`).
  - Re-ran after fixes: `token-audit` PASS, `a11y-static` PASS, `tsc -b` clean, `vite build` OK.

## Ratchet

The evaluator surfaced a defect no control cleanly covers: **staged-edit modals can
lose work on an accidental dismiss** (CMP-2 targets named destructive *actions*; SLP-10
targets the surface choice). Fixed for this surface (dismiss blocked while editing).

**[proposed — pending design-lead approval]** New anti-pattern control, e.g.
`CMP-4 — A modal hosting an in-progress, staged edit must not discard unsaved input on
an accidental dismiss (backdrop press / Esc): block the dismissal or confirm "discard
changes?" first.` Rationale: protects teacher work (HIG: Agency); the harm is invisible
until it happens, so it belongs in the catalog rather than relying on per-surface review.
