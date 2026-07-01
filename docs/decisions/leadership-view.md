# Design decision record — Leadership view (⌘K lens) + employment tags off nodes

> New opt-in lens on the existing org chart. Employment tags (GT/AR/…) are removed
> from person nodes by default and brought back — alongside a team-summary band —
> only inside a "leadership view" reached through a new ⌘K command palette.
> Started at the Phase 3 plan gate; finished at Phase 6 with the evaluator verdict.

- **Date:** 2026-06-30
- **Product:** TW surface — DXD Design Team org chart (internal MOE design-org tool)
- **Change type:** modification (new mode + command-palette overlay on an existing surface)
- **Page type:** workspace view (org chart) + command-palette overlay + summary band
- **Run type:** attended
- **The person and the moment:** This tool is internal to the DXD design org, not
  teacher-facing. Two moments: (1) the everyday viewer scanning who-reports-to-whom,
  for whom a GovTech-vs-Augmented-Resource tag on every card is distinctive noise;
  (2) a design lead (e.g. Wondo) who, when planning, opens ⌘K → leadership view to
  read team make-up — employment mix, open roles, domain/discipline spread, who's in
  flux — without that detail cluttering the normal chart.

## Sprint contract (done-criteria)

1. The employment tag no longer renders on person nodes by default — across Hierarchy
   cards, Domains cards, and the Directory list (all flow through `PersonCard` +
   the tree `OutlineNode`).
2. Open-role placeholders stay obviously distinct without the tag — their dashed
   outline + bracketed name carry the vacancy signal.
3. ⌘K / Ctrl+K opens a command palette: focus-trapped, Esc to close, focus returns
   where it was; keyboard-operable (↑↓ to move, ↵ to run).
4. The palette's "Switch to leadership view" command reveals the employment tags
   again **and** a calm summary band of the numbers a design lead tracks; a visible
   "Exit leadership view" affordance + ⌘K give a way back (not trapped behind a
   shortcut). The toggle is announced politely without stealing focus (A11Y-11).
5. Nothing destructive or lossy; the lens is ephemeral (off on load) and instant to
   toggle. Detail/profile surfaces (full "GovTech"/"Augmented Resource" wording) are
   untouched.

## Chosen approach

- **Hide at node level:** `PersonCard` footer and `TreeView`'s `OutlineNode` gate the
  `EmploymentBadge` behind a new `useLeadershipView()` context (off by default). The
  card footer collapses entirely when it would otherwise be empty, so no dangling row.
- **Command palette:** new `CommandPalette` built on Base UI `Dialog` (modal shell —
  focus trap, Esc, backdrop, focus return) wrapping an APG combobox + listbox (input
  keeps focus; `aria-activedescendant` tracks the active option). One command today
  ("Switch to / Exit leadership view"), built to hold more.
- **Leadership view:** App holds an ephemeral boolean; `LeadershipViewProvider` feeds
  the nodes; a `LeadershipSummary` band renders above the active view (same slot as
  the Legend block, same width treatment) with grouped, labelled, tabular figures —
  Team, Employment, Domains, Disciplines, In flux — computed over the whole team
  (`org.people`), not the active filter. Toggle announced via a polite `aria-live`
  region.

Naming: the builder referred to it as both "leadership view" and "Admin mode"; shipped
as **Leadership view** (clearer than "admin", which reads as system settings; CNT-2).

## Rejected options

- **Hide only GT/AR, keep Intern/Apprentice/Consultant** — rejected at diverge: the
  builder chose to hide all employment tags for a consistently calm node.
- **Leadership view = re-show tags only (no summary)** — rejected at diverge: the
  builder asked for the headcount summary plus the other admin numbers a design lead
  tracks, so the band carries composition / open roles / domain / discipline / flux.
- **Palette also does navigation + jump-to-person** — deferred at diverge: scoped to
  the single toggle for now; the palette is structured so commands drop in later.
- **Summary as a right-side panel** — rejected: it would eat width from the wide
  Hierarchy canvas; a band above the view keeps the canvas full-width.

## Tradeoffs, named

- **Discoverability:** ⌘K-only entry (the builder's explicit ask) is invisible to
  people who don't know the shortcut and unreachable by pure touch. Honored as a
  deliberate power-user affordance, softened by a visible "Exit leadership view"
  control once inside. A quiet entry point can be added later if wanted.
- **Open roles** lose the explicit "Open" pill, leaning on the dashed outline +
  bracketed name (already a strong, intentional signal).
- **Whole-team numbers:** the band ignores the active search/domain filter so the
  overview stays stable; the "Domains" group is the per-domain breakdown.
- **Synthetic incoming Head** (Keith Oh) is not in `org.people`, so he is excluded
  from the counts (People 35 = filled team roles); open roles are their own line.

## Controls in scope

A11Y-1 (contrast — band/palette text), A11Y-2 (palette + Exit keyboard reach & focus),
A11Y-3 (visible "Search commands" label on the palette input), A11Y-4 (palette options
& Exit ≥44px mobile via `min-h-11 sm:min-h-9`), A11Y-5 (reduced motion — global rule),
A11Y-6 (decorative icons `aria-hidden`), A11Y-7 (semantic `section`/heading/list in the
band), A11Y-8 (combobox/listbox/option roles + `aria-selected`/`aria-activedescendant`),
A11Y-11 (polite live-region announce on toggle, no focus steal), TOK-1..3 / COL-1..2
(tokens only — token-audit clean), TYP-1..3 (Inter/Jakarta, on-scale), CNT-2/CNT-3 +
SLP-9 (naming + copy), SLP-1/4/5/7 (no glow; one band not nested/identical-card tiles;
spacing rhythm), SLP-8 (no bounce easing), SLP-10 (palette is a single-purpose dialog —
modal is correct; the multi-section summary is an inline band, not a modal), MOT-1
(150ms standard transitions), LAY-2 (single-column reflow at 360/320). No destructive
action (CMP-2 n/a) and no new async transaction (CMP-3 n/a — the data fetch already
owns its loading/error states; the lens reads loaded data).

CMP-1 verdict: **a component exists for part of the need and is used** — Base UI
`Dialog` is the modal shell. Base UI also ships `Autocomplete`/`Combobox`, but those
are popover-anchored to a trigger and do not fit a centered ⌘K command palette; the
inner filterable command list is composed as an APG combobox+listbox inside the Dialog
(no reinvented dialog/dropdown). No waiver required.

## Waivers granted

| Control | Tier | Reason | Approver | Where recorded |
|---------|------|--------|----------|----------------|
| — | — | none | — | — |

## Plan approval

- **Approved by:** Wondo Jeong (product design lead, DXD)
- **Approved on:** 2026-06-30 ("Plz go ahead for building it.")

## Verify verdict

- **Screenshots** (scratchpad `…/05be7914-…/scratchpad/`):
  - `current-01-hierarchy.png` — before (tags on every node)
  - `v-01-tree-standard.png` — Hierarchy 1280, tags removed
  - `v-02-palette-open.png` — ⌘K palette: visible label, focused input, command + hint footer
  - `v-03-tree-leadership.png` — leadership on, Hierarchy: band + GT tag back on cards
  - `v-04-domains-leadership.png` — leadership on, Domains: band + tags
  - `v-05-domains-leadership-360.png` / `v-05b-band-360.png` — 360 reflow (single column, no h-scroll)
  - `v-06-domains-standard-exit.png` — Exit → band gone, tags gone, no empty footer
  - `v-08-tree-leadership-fixed.png` — post-fix: incoming Head (Keith Oh) shows NO tag in the lens
  - `v-09-directory-leadership.png` — post-fix: Directory list rows reveal the tag under the lens
  - `v-10-band-320.png` — band single-column reflow at 320 CSS px (LAY-2)
  - Palette empty-filter state: coded ("No commands found") but not photographed (not a
    hybrid async state; low-risk conditional).
- **Token block line range:** `src/index.css:10-113` (the `@theme` `tfx-tokens` region,
  exempt from token-audit). Changed component files contain no raw colour/spacing/radius —
  `token-audit.py` exit 0 on all changed files.
- **Dark mode:** N/A — product has no dark mode (no `.dark`/`data-theme`/
  `prefers-color-scheme`; light-only tokens).
- **Deterministic controls:**
  - `token-audit.py` (TOK-1..3, COL-1..2): **script-checked, exit 0** on all changed files.
  - `a11y-static.py` (static subset of A11Y-2/3/8): **script-checked, exit 0** on all
    changed files after fixing the palette input's focus indicator (initial
    `focus:outline-none` → `focus-visible` outline). Pre-existing finding at
    `TreeView.tsx:964` (edit-mode "Reports to" `<select>`, `outline-none`, no
    focus-visible replacement) is **outside this change's surface** — not introduced,
    not fixed here; flagged for a separate follow-up.
  - `tsc -b`: clean.
  - A11Y-1 contrast, A11Y-4 hit-area, A11Y-7 semantics, A11Y-11 channel choice, LAY-2
    reflow, MOT-1/SLP-8 easing: **verified manually** (no rendered-DOM script in v0).
- **CMP-1 verdict form:** `CMP-1: asserted, no manifest — manifest absent for the DXD org-chart product`
  (evidence source: reviewed the product codebase + general Base UI knowledge — `.tfx/component-manifest.json` does not exist).

- **Fixes applied after the verdict below** (the verdict graded the pre-fix build):
  1. **CMP-1 form** — added the fixed verdict string above (was prose; `audit-record.py` requires the form).
  2. **Incoming Head tag/count contradiction** — the synthetic root (Keith Oh) is excluded
     from the band counts, so its node now also hides the employment tag: added `isRoot`
     to the root `Person` (`org.ts`) and gated the badge in `PersonCard`, the tree
     `OutlineNode`, and the Directory `PersonRow` on `!person.isRoot`. Nodes showing a tag
     are now a subset of the band counts. Verified in `v-08-tree-leadership-fixed.png`.
  3. **Directory list now reveals the tag under the lens** (`ExplorerView.tsx` `PersonRow`),
     honouring contract item 4 across all three views. Verified in `v-09-directory-leadership.png`.
  4. **Palette placeholder contrast** — `text-ink-faint` (3.78:1) → `text-ink-muted` (5.19:1).
  Re-ran `tsc -b` (clean), `token-audit.py` (exit 0), `a11y-static.py` (exit 0 on all changed
  files; only the pre-existing `TreeView.tsx:964` select remains, untouched).
  **The evaluator re-checked all five fixes against code + screenshots and returned a final
  `VERDICT: pass` → SHIP** — no regressions, craft grade raised acceptable → strong.

- **Evaluator verdict (verbatim — `tfx-design-evaluator`, pre-fix build):**

VERDICT: pass-with-findings

The change meets all five sprint contract items in the rendered result. Two findings warrant attention before ship: one is a machine-checkable record-compliance gap (CMP-1 verdict form), the other a data-accuracy defect inside the leadership lens itself (Keith Oh's tag). Neither is an L0/L1 control failure with no waiver, so neither blocks — but the CMP-1 form will fail `audit-record.py`.

CONTRACT COMPLIANCE

1. Employment tag off nodes by default — PASS. v-01 (Hierarchy) and v-06 (Domains) show no tags. PersonCard:35 gates showEmployment = leadershipOn && !isGhost; TreeView:1243 gates the OutlineNode badge on leadershipOn. Note the Directory list (ExplorerView PersonRow 161-199) never rendered the tag at all — so "all flow through PersonCard + OutlineNode" is inaccurate, but the by-default-off result holds.
2. Open-role placeholders stay distinct — PASS. PersonCard:51-54 isOpen → border-dashed + bg; bracketed name visible in v-01. The "Open" pill now appears only in leadership view, a deliberate tradeoff; dashed-outline + bracket carries vacancy without it.
3. ⌘K command palette — PASS. App:117-126 binds ⌘K/Ctrl+K. CommandPalette uses Base UI Dialog (focus trap, Esc, backdrop, focus return), role=combobox input + role=listbox/option list; onKeyDown (59-76) handles ↑↓/Home/End/Enter; onClick runs (142). v-02 shows the visible label, focused input, command, and footer hint.
4. Leadership command reveals tags + calm band; way back; polite announce — PASS. App:104-112 toggles the label; v-03/v-04 show band + GT tags returning. Band "Exit leadership view" (LeadershipSummary:93-102) + ⌘K both call toggleLeadership. Announce through one polite sr-only live region (App:175-177); focus not moved. No double-announce: the only other polite region (Legend p, 222) tracks view, which the toggle does not change.
5. Non-destructive, ephemeral, detail surfaces untouched — PASS. leadershipOn is useState(false), toggled via context; no delete/overwrite. Detail keeps full wording: ExplorerView:235 → "GovTech"/"Augmented Resource", ungated.

JUDGMENT / IN-SCOPE CONTROL NOTES (abridged for the record; full reasoning in session log)
- A11Y-1 PASS (manual): ink-secondary/ink-muted on white & surface-2 all ≥ 4.5; placeholder text-ink-faint 3.78 flagged as advisory (placeholder only, real label present).
- A11Y-2 PASS for this surface; pre-existing TreeView:964 select outline-none is outside scope.
- A11Y-3 PASS (visible "Search commands" label). CMP-2 N/A confirmed.
- CMP-1: composition correct (Dialog shell + APG combobox/listbox inside; Autocomplete/Combobox are trigger-anchored popovers), no waiver needed — BUT record carried prose, not the fixed form → audit-record.py would error. (BLOCKING.)
- A11Y-7 PASS (section + h2 + ul/li). A11Y-8 PASS (combobox/listbox/option + aria-selected/activedescendant). A11Y-11 PASS (single polite channel, no focus theft).
- CNT-2 PASS ("Leadership view" plain). CNT-3/SLP-9 PASS (copy clean, no AI tells). SLP-5 PASS (grouped read-out, not a metric-tile grid). SLP-10 PASS (palette dialog; band inline). SLP-1/4/7/8 PASS. MOT-1 PASS (150ms). LAY-2 PASS at 360 (320 not captured at verdict time). TOK/TYP/COL PASS (spot-checked).
- Metric sanity: People 35 = 18+8+5+3+1 = 9+5+3+11+7 = 24+4+1+2+4 = 35.

BLOCKING (must fix before ship):
- [CMP-1] Record carries no fixed verdict form — audit-record.py will error. Add verbatim: CMP-1: asserted, no manifest — manifest absent for the DXD org-chart product. The underlying composition decision is sound.

ADVISORY (should fix):
- [Contract 4 / craft] Keith Oh shows "GT" in leadership view but is excluded from the band's "18 GovTech" (v-03; PersonCard renders for root since !isGhost; band counts only org.people). A contradiction inside the lens. Decide deliberately: exclude the synthetic root from the node badge too, or count him.
- [Contract 1 accuracy] The Directory list (PersonRow) does not flow through PersonCard/OutlineNode and does not reveal the tag under the lens; only the FocusPanel shows the full word. Confirm whether the Directory list should also surface the tag.
- [A11Y-1 close call] Palette placeholder text-ink-faint 3.78:1 — placeholder with a real label, not a hard failure; recommend text-ink-muted.
- [A11Y-2 pre-existing, follow-up] TreeView:964 edit-mode "Reports to" select outline-none with no focus-visible replacement. Outside this change; catalog already covers it.

QUALITY GRADES:
- Design quality — strong. The band reads in the order a lead scans (Team → Employment → Domains → Disciplines → In flux), grouped with deliberate spacing rhythm, in the Legend's slot at the same width treatment. Calm, legible, undecorated.
- Originality — strong (appropriately restrained). Base UI Dialog reused; APG combobox composed rather than hand-rolled; band is plain grouped figures, not a feature-card grid. The one custom pattern (centered ⌘K palette) is justified against Base UI's trigger-anchored alternatives.
- Craft — acceptable. States designed (empty "No commands found", focus rings, footer collapses when empty), motion consistent at 150ms, reflow holds at 360. Held back from strong by the Keith-Oh tag/count contradiction.
- Functionality — strong. Open ⌘K, read make-up, exit via visible button or ⌘K. Ephemeral and lossless; detail surfaces preserved; the way back is visible and keyboard-reachable.

Dark mode: N/A — product has no dark mode (light-only tokens; no .dark/data-theme/prefers-color-scheme).

UNCOVERED (defects no control covers): None. The Keith-Oh tag/count mismatch is a data-accuracy/craft issue tied to contract item 4; the Directory-list plumbing gap is a contract-accuracy note. Both filed under advisory.

## Ratchet

Ratchet: no proposal — nothing uncovered. The evaluator's UNCOVERED list is empty; every
finding maps to an existing control or to contract accuracy, and all were resolved in the
fixes above. One pre-existing item logged as a **follow-up, not a new control**: the
`outline-none` with no focus-visible replacement on the edit-mode "Reports to" `<select>`
(`TreeView.tsx:964`) is an A11Y-2 gap the catalog already covers — to be fixed in a
separate change, out of scope here.

---

# Update 2026-07-01 — Team overview band restyle (aligned-column ledger)

> Follow-on modification to the summary band above. The band (now titled "Team
> overview", shown whenever manager view is on after the leadership-lens → manager-view
> unification) read as a flat wrap of ~27 equally-weighted numbers with no clear
> group boundaries. This restyle rebuilds the band's layout only; the data
> (`buildGroups`) and the surrounding manager-view gating are unchanged.

- **Date:** 2026-07-01
- **Product:** TW surface — DXD Design Team org chart (internal MOE design-org tool)
- **Change type:** modification (restyle of one component region — `LeadershipSummary.tsx`)
- **Page type:** dashboard/summary band above the workspace view
- **Run type:** attended
- **The person and the moment:** Wondo (design lead) unlocks manager view to read team
  make-up while planning; the band must be scannable at a glance, not a river of numbers.

## Sprint contract (done-criteria)

1. The 5 groups (Team, Employment, Domains, Disciplines, In flux) are unmistakably
   distinct at a glance at every width (SLP-7).
2. Stats are scannable — values align in a consistent grid, not an inline wrap; reflow
   to one column holds with no loss at 320px (LAY-2).
3. Real hierarchy: group heading anchors → value prominent → label muted; adjacent
   type steps differentiated (SLP-6).
4. Less noise: stays one flat card (SLP-4), no identical-card grid (SLP-5), trimmed
   helper copy, no decorative colour.
5. Tokens/type/contrast preserved (TOK-1..3, TYP-1..4, A11Y-1); semantic
   `<section>`/heading/list structure kept (A11Y-7); "Exit to employee view" preserved.

## Chosen approach

**Aligned-column ledger.** Each group becomes a column in a responsive CSS grid
(`grid-cols-2` → `sm:grid-cols-3` → `lg:grid-cols-5`) with its items stacked vertically
(right-aligned tabular value + muted label per row). Thin vertical dividers between the
five columns at `lg` (via per-cell `border-l`, first cell excepted — robust across the
wrap breakpoints, unlike `divide-x` on a wrapping grid); a full-width divider separates
the header from the stats. Group headings strengthened as the column anchors. Flat card
kept; no cards-per-group, no colour coding.

## Rejected options

- **Hero-headline** — big "35 people · 2 open roles" lead + 4 breakdown columns. More
  focal punch, but treats the Team group specially (inconsistent) and adds complexity;
  offered to the user, who chose the consistent ledger.
- **Keep inline, add dividers only** — smallest change, but leaves the inline
  number-river that is the core scannability defect; rejected.

## Tradeoffs, named

The band gets a little taller than today's compact 2-row wrap, in exchange for being
scannable. Acceptable: it appears only in manager view and clarity is the whole point.

## Controls in scope

SLP-4, SLP-5, SLP-6, SLP-7 (layout/anti-slop); TOK-1..3, TYP-1..4 (tokens/type);
A11Y-1 (contrast), A11Y-7 (semantic structure); LAY-2 (320px reflow). No async or
destructive action on this band → CMP-2/CMP-3 not in scope.

## Waivers granted

None.

## Plan approval

- **Approved by:** Wondo (design lead) — chose the aligned-column ledger option.
- **Approved on:** 2026-07-01

## Verify verdict

- **Screenshots:** `scratchpad/band-new-1280.png`, `band-new-768.png` (evaluated); post-fix
  `band-fixed-320.png` (single column, band right edge 304px ≤ 320 — fits), `band-fixed-360.png`
  (2 columns). Before: `band-current-1280.png`.
- **Dark mode:** N/A — product has no dark mode (light-only tokens).
- **Deterministic controls:** `token-audit.py` exit 0 (TOK-1..3, COL-1..2); `a11y-static.py`
  exit 0 (FOCUS/KBD/NAME); `tsc`+`vite build` OK. A11Y-1 contrast + LAY-2 320px verified
  manually against the rendered DOM.
- **Evaluator verdict (tfx-design-evaluator, verbatim):**

  > VERDICT: pass-with-findings
  >
  > BLOCKING (must fix before ship):
  > - **LAY-2 (L1)**: The stats grid base is `grid-cols-2` with no single-column floor; at
  >   320 CSS px it renders two columns, not one. LAY-2 requires single-column reflow with no
  >   two-dimensional scrolling at 320px, and done-criterion 2 promised a single/narrow column
  >   at 320. Narrowest capture was 360px. Remedy: add `grid-cols-1` as the base, or run the
  >   320px reflow test and confirm no horizontal scroll. Blocking until the 320px render is checked.
  >
  > ADVISORY: value gutter `w-7` (28px) is close-to-tight for a future 3-digit count (`w-8`/min-w
  > safer); vertical dividers exist only at `lg` — groups still read as distinct at 768/360 via
  > bold headings + spacing (SLP-7 judged met at all widths), noted because the contract said
  > "every width".
  >
  > QUALITY GRADES: Design quality — strong (directly fixes the flat-river critique; five clean
  > labeled columns, proper heading→value→label hierarchy, aligned tabular values, SLP-7
  > satisfied). Originality — strong (appropriately restrained ledger). Craft — acceptable (held
  > back only by the then-unverified 320px behavior and fixed `w-7`). Functionality — strong;
  > CMP-2/CMP-3 correctly out of scope; the sole control "Exit to employee view" is a native
  > button with visible label, focus-visible outline, min-h-11/sm:min-h-9 hit area.
  >
  > IN-SCOPE CONTROLS: SLP-4 pass (single card, borderless inner cells, no nested cards);
  > SLP-5 pass (grid columns of a list, not repeated feature cards); SLP-6 pass (16px value vs
  > 12px heading/label = 1.33x, weight/color separate roles); SLP-7 pass (6px within vs 24px
  > between); A11Y-7 pass (section→h2→h3→ul, descriptive headings, no skipped level);
  > A11Y-8 pass (native button, role+name); LAY-2 FAIL (see blocking); TOK-1..3 pass; TYP-1..4
  > pass (no all-caps, on-scale, Jakarta/Inter); A11Y-1 pass-with-caveat (tokens annotated AA;
  > recommend a rendered contrast scan).
  >
  > UNCOVERED: None — every issue maps to an in-scope control.
  >
  > Overall: needs-fixes before ship — one blocking item (LAY-2). The restyle is a genuine,
  > well-crafted improvement that resolves the stated critique and passes every anti-slop, token,
  > type, and semantic-structure control.

- **Resolution of the blocker (post-verdict):** Applied the evaluator's remedy in full — base
  set to `grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`, **and** ran the
  320px reflow test. At 320px the grid computes to **1 column** and the band's right edge is
  304px (fits within 320 with the p-4 gutter). Gutter bumped `w-7 → w-8` (advisory). Re-ran
  `token-audit`/`a11y-static`/build — all pass. LAY-2 for this surface now **passes**.
- **Known out-of-scope note:** at 320px the *page* overflows by 1px, sourced to a pre-existing
  `rounded-pill` chip elsewhere (not the Team overview band, which fits). Left untouched per
  conservative-defaults; logged as a separate follow-up, not part of this restyle.

## Ratchet

Ratchet: no proposal — nothing uncovered. The evaluator's UNCOVERED list is empty; the sole
blocker (LAY-2) mapped to an existing control and is resolved with 320px evidence. The 1px
page-level overflow from a pre-existing pill is a follow-up on that component, not a new control.
