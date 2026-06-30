# Design decision record — person editing surfaces (full profile + detail dialog)

> Modification: move structural editing into the full profile, make the quick dialog
> read-only with a kebab for the destructive action, and make the "Org details" form
> consistent. Run through the tfx-design-ui loop.

- **Date:** 2026-06-30
- **Product:** TW surface — DXD org chart (internal design-team tool)
- **Change type:** modification
- **Page type:** form (full-profile editor) + a read-only detail dialog hosting a destructive action
- **Run type:** attended
- **The teacher and the moment:** a DXD designer reorganising the team — recording that Emily is transferring out, or adding a new report under someone — the week the org is in flux.

## Sprint contract (done-criteria)

1. "Add a report" is reachable from the full profile and gone from the quick detail dialog; the add flow still pre-fills the manager.
2. "Remove from chart" lives behind a kebab beside the person's name in the dialog, and still shows consequences + a two-step confirm (CMP-2, L0).
3. The full-profile "Org details" edit form is visually consistent — selects match the app's text inputs, one card treatment, and no orphaned grid cell across status states.
4. No L0 regressions: every field keeps a visible label (A11Y-3); the kebab + menu are keyboard-reachable with visible focus and correct role/name/state (A11Y-2/8); AA contrast holds (A11Y-1).

## Chosen approach

- **Add a report** moved into `ProfileModal`'s read view (button "Add a report to {first}") via an `onAddReport` callback from `App`; removed from `PersonDetail`.
- **Kebab** in the dialog header: Base UI `Menu` (the app's first), trigger is a 44px icon button `aria-label="Person actions"`, single item "Remove from chart" that opens the existing two-step confirm inline at the top of the dialog. Focus moves to the confirm's Cancel (A11Y-11), and both confirm buttons are `aria-describedby` the consequence sentence so it is voiced on the focus move. The always-visible bottom Remove button was removed.
- **Org details form**: native `<select>` wrapped in a `SelectBox` (appearance-reset + overlaid chevron + same box as the `INPUT` class); the edit card changed from `border + bg-surface-2/40` to borderless `bg-surface-2/60` (matches its sibling tags card); Destination spans both columns and Status spans both when no "When" pairs it (no orphaned cells).
- **Destructive colour**: the kebab item, confirm box, and Remove button use the `departing` red ramp (the app's danger signal, already used by `ProfileModal`'s photo-remove), not the `leave` amber it inherited.

## Rejected options

- **Base UI `Select` (custom listbox) instead of a styled native `<select>`** — heavier, and the app already uses native selects; a styled native control is lower-risk and keeps native keyboard/AT behaviour. CMP-1-clean (native select is not a hand-rolled dropdown).
- **"Add a report" inside the staged edit form** rather than the read view — rejected because it's a hand-off flow (opens `AddPersonDialog`), not a staged field; read-view placement keeps it available without entering edit mode.
- **Keeping the always-visible Remove button** — rejected; the dialog is now a read-only glance, so a destructive action belongs tucked in an overflow menu, not competing with the content.

## Tradeoffs, named

- Styled native `<select>` sacrifices a fully custom listbox (multi-line options, rich item content) — accepted; the options are short strings and native AT behaviour is a feature.
- "Add a report" in the read view means it isn't grouped with the staged fields — accepted; it's a separate flow, and grouping it with Save/Cancel would imply it's staged.
- The kebab adds a third portaled layer over the dialog — accepted; mitigated with an explicit z-index above the dialog (see Ratchet).

## Controls in scope

A11Y-1, A11Y-2, A11Y-3 (L0); A11Y-4, A11Y-8, A11Y-11, CMP-1, TOK-1..3, TYP-1..3, SLP-4, SLP-10 (L1); TYP-4, SLP-7, LAY-2 (L2). CMP-2 (L0) inherited via the dialog's destructive action.

## Waivers granted

| Control | Tier | Reason | Approver | Where recorded |
|---------|------|--------|----------|----------------|
| SLP-10 | L1 | Routerless SPA; editor single-column; backdrop/Esc blocked while editing so staged edits aren't lost. Pre-existing, not re-litigated this sprint. | Wondo Jeong | inline `tfx-waive` at `ProfileModal.tsx` + this record |

> CMP-1 is not waived: `CMP-1: asserted, no manifest — manifest absent for dxd-design-org-chart-builder` (Base UI Menu composed; no `.tfx/component-manifest.json`). No L0 waived.

## Plan approval

- **Approved by:** Wondo Jeong ("Run!", and confirmed the kebab holds only "Remove from chart")
- **Approved on:** 2026-06-30

## Verify verdict

- **Screenshots** (session artifacts, 1280 unless noted): `scratchpad/hv-1-dialog.png` (read-only dialog + kebab), `hv-2-kebab-open.png` (red Remove item), `hv-3-confirm.png` (red confirm — consequence + Cancel/Remove), `hv-4-profile-read.png` (Add-report button + Org details), `hv-5-editor-full.png` (Org-details selects/card/grid), `hv-6-editor-360.png` (360 reflow), `hv-7-editor-320.png` (320 reflow).
- **Dark mode:** N/A — product has no dark mode (no toggle, no `.dark` layer in `index.css`).
- **Deterministic controls:** `token-audit` (script) clean; `a11y-static` (script) clean on the two changed components after fixing the Menu's outline-removal; `type-scan` (script) clean (no TYP-4; the 2 TYP-2 size findings are pre-existing, not in the changed files). `tsc -b` + `vite build` green. Everything else verified manually.

### Verification ledger

| Control | Method | Evidence |
|---|---|---|
| A11Y-1 | manual | destructive red/amber pairs hand-computed ≥ AA; a11y-static covers focus/kbd/name only, not contrast |
| A11Y-2 | script | a11y-static clean on PersonDetail.tsx + ProfileModal.tsx |
| A11Y-3 | manual | every editor field wrapped in `<label>` (`Field`); dialog facts are `<dl>` |
| A11Y-4 | manual | kebab/buttons `size-11`/`min-h-11` (44px) mobile → `sm:` 36px (≥24) |
| A11Y-8 | manual | kebab `aria-label`; Base UI role/`aria-haspopup`/`aria-expanded`; item `role="menuitem"` |
| A11Y-11 | manual | confirm focus→Cancel + `aria-describedby` consequence; post-save focus→Edit; single-channel |
| CMP-1 | manual | Base UI Menu; `asserted, no manifest` |
| CMP-2 | manual | hv-3: two-step confirm names object + consequence; Cancel/Remove; no silent execute |
| TOK-1..3 | script | token-audit clean (semantic tokens, on-scale radii) |
| TYP-1..4 | script | type-scan clean (no off-scale sizes; no all-caps) |
| SLP-4 / SLP-7 / SLP-10 | manual | no nested cards; spacing rhythm; SLP-10 waived |
| LAY-2 | manual | hv-6 (360) + hv-7 (320) single-column reflow; 1px subpixel delta from background canvas, modal not clipped |

### Evaluator verdict (verbatim — `tfx-design-evaluator`)

> Run against the pre-fix build. The two ADVISORY items the evaluator could change — the amber-vs-red destructive colour and the consequence announcement — were both **addressed after this verdict** (Remove now uses the `departing` red ramp; the confirm buttons are `aria-describedby` the consequence). Deterministic scans re-run clean afterward. The LAY-2 320 gap was closed with `hv-7-editor-320.png`.

```
VERDICT: pass-with-findings

BLOCKING (must fix before ship):
- None. All in-scope L0 and L1 controls pass on the changed surfaces (PersonDetail.tsx, ProfileModal.tsx, App.tsx).

ADVISORY (should fix):
- CMP-7 / COL-2 (L2, close call) — destructive "Remove" action is rendered in the amber `leave` palette, not red. [...] Not a contrast failure — amber pairs at 6.33:1 / 5.83:1 / 6.33:1, all clear AA. Not new drift either: the prior PersonDetail already used the same `leave` palette. Note the plan text described this item as "departing-red" — the code does not match that description.
- LAY-2 (L1) — the 320 CSS px reflow target is unverified from the evidence supplied. Only a 360 capture was provided. The 360 reflow is clean. Recommend running the 320 test before ship.
- A11Y-2 in src/components/AddPersonDialog.tsx (out of scope, reached by the Add-report flow) — confirmed pre-existing (lines 142, 162, 255 use outline-none with focus shown on the wrapper via focus-within:ring-2).
- A11Y-11 / CMP-2 (close call, not a failure) — the remove consequence may not auto-announce on the confirm focus-move (consequence is a sibling <p>, not the focused element or a live region). The consequence is visibly present (satisfying CMP-2's core requirement) and there is no double-announce. Recommend human review.

QUALITY GRADES:
- Design quality — strong. [...] one coherent borderless bg-surface-2/60 panel matching its sibling; selects and inputs share one box treatment; the grid-span logic leaves no orphaned cell across all status permutations.
- Originality — strong (appropriately conventional). No slop tells; kebab + inline confirm + native-select-in-a-box are stack-appropriate.
- Craft — acceptable. States designed; long names truncate. Held back from strong by the amber-for-destructive choice and the plan/code "departing-red" mismatch. Dark mode: N/A — product has no dark mode.
- Functionality — strong. Add-report flow completes (onAddReport → openAdd(managerName); AddPersonDialog pre-selects that manager). Remove flow re-parents reports to the departing person's manager. Editing is escapable; backdrop/Esc blocked while editing.

JUDGMENT CONTROL NOTES:
- CMP-2 (L0) pass — confirm names object + consequence in plain language; two-step; Cancel + Remove; no silent execution.
- A11Y-1 (L0) pass — static contrast clean; destructive pairs 5.83–6.33:1, all ≥ AA.
- A11Y-2 (L0) pass — every enumerated control carries focus-visible:outline-2; a11y-static clean on changed files.
- A11Y-3 (L0) pass — every editor field wrapped in a <label> with visible text.
- CMP-1 (L1) pass — CMP-1: asserted, no manifest — manifest absent for dxd-design-org-chart-builder. Base UI Menu emits role/haspopup/expanded + role=menuitem.
- A11Y-8 (L1) pass — trigger name "Person actions", haspopup + expanded-state tracking, item role=menuitem named by visible text.
- A11Y-4 (L1) pass — 44px mobile targets stepping to 36px (≥24) at sm:.
- A11Y-11 (L1) pass-with-caveat — two single-channel focus moves; error banner role=alert with no competing focus. Caveat: consequence not auto-voiced on confirm focus-move (see ADVISORY).
- TOK-1/2/3 (L1) pass — token-audit clean; radii on-scale; concentric, no peer-radius drift.
- TYP-1/2/3 (L1) pass — type-scan clean; sizes resolve to scale tokens.
- SLP-4 (L1) pass — functional inline-alert + note inside a modal, not decorative cards-in-cards.
- SLP-10 (L1) pass — waived (named approver + real reason); dialog kebab is a single decision.
- TYP-4 (L2) pass — no uppercase/text-transform/all-caps strings; type-scan clean.
- SLP-7 (L2) pass — spacing has rhythm; related tighter than unrelated.
- LAY-2 (L2 capture) pass-with-caveat — 360 clean; 320 unverified from supplied evidence (since closed).

UNCOVERED (defects no in-scope control covers):
- None.
```

## Ratchet

`[proposed — pending design-lead approval]` **New anti-pattern — portaled overlays inside a modal must stack above it.** A Base UI `Menu`/`Popover`/`Tooltip` rendered in a portal defaults to `z-auto`, so it paints *under* a sibling modal that sets `z-50` — invisible and unclickable, while still passing DOM/role checks. This bit the kebab here (fixed with `z-[60]` on the positioner) and the verify-phase static checks could not catch it (the element reported visible by bounding-box). Proposed as a CMP/LAY anti-pattern: "a portaled overlay opened from within a modal carries an explicit z-index above the modal layer; verify by screenshot, not just DOM presence." Found this sprint, no existing control covered it.
