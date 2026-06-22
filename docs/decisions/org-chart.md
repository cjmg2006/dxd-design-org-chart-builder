# Design decision record — DXD org chart (React rebuild)

> One record per page or significant change. Started at the Phase 3 plan gate, finished
> at Phase 6. Keeps the human approval, waivers, and verdict traceable.

- **Date:** 2026-06-19
- **Product:** Internal DXD Design-team tool (Teacher & School Blue brand anchor — the team's main product is Teacher Workspace)
- **Change type:** rebuild — new implementation replacing the legacy single-file `index.html` (preserved at `reference/legacy-org-chart.html`)
- **Page type:** dashboard / directory
- **Run type:** attended
- **The teacher and the moment:** a DXD design lead (e.g. Wondo) or a **new joiner** orienting during reorg season — many Jul-2026 transfers are live in the data — or finding a colleague on a phone between meetings. (Internal-tool analogue of "the teacher and the moment".)

## Sprint contract (done-criteria)

1. The full information model survives: domain→workstream grouping, employment types (GT/AR/Intern/Apprentice/Consultant/TBH), status (leave/joining/departing/transfer in-out), mentorship, co-lead nuance, incoming-transfer ghost cards, open roles, specialty icons.
2. Reflows 320→1280 with **no two-dimensional page scrolling** (LAY-2) — the legacy chart's worst failure.
3. Person detail is keyboard- and touch-reachable (replaces the legacy hover-only tooltip) — A11Y-2.
4. Search makes any of ~35 people findable in seconds.
5. All colour/type/spacing on tokens + scale (TOK/TYP/COL).
6. Loading / empty / error states present (CMP-3).
7. Calmer visual hierarchy than the legacy (5 simultaneous colour systems + sub-11px micro-text).
8. Stays a living, Google-Sheet-synced document.

## Chosen approach

Vite + React + TypeScript on the TFX stack: Tailwind v4 `@theme` tokens sourced from Radix
Colors + shadcn spacing/radius scale, **Base UI** primitives (Dialog, ToggleGroup/Toggle,
Collapsible, unstable-use-media-query), Plus Jakarta Sans (display) + Inter (body), TW blue
`#0064FF` for primary/brand only. Data layer (typed TS) fetches the existing gviz CSV and
ports the legacy domain logic (RO/status/month/employment/domain/workstream parsing,
manual-people merge with sheet-dedup, current-workstream overrides, transfer ghosts).

**Three views behind a view-switcher toggle, defaulting to Directory** (chosen by Wondo at
the diverge gate after clicking a live 3-view prototype):
- **Directory** (default) — leadership spine + domain→workstream card groups that reflow
  4→2→1; a `↳ reports-to` line on every card gives reporting visibility. Best at holistic
  overview + scanning.
- **Tree** — literal drawn reporting hierarchy with zoom/fit + collapsible branches on
  desktop; indented disclosure outline on narrow (no 2-D scroll). Best at structure.
- **Explorer** — searchable grouped list + a focus pane (manager/reports/peers/mentees).
  Best at people-lookup.

Colour load was deliberately reduced vs the legacy: **domain** drives structural colour,
**status** shows as occasional functional pills, **employment** is a neutral badge, and
**specialty** is carried by an icon — not five competing hue systems.

Admin in-UI editing + auth are a deliberately **deferred later stage** (Wondo's call — keep
the first cut login-free and dogfoodable); GitHub login is the accepted fallback when added.

## Rejected options

- **Single view only (Tree-only or Explorer-only)** — no one layout serves both "holistic
  structure + who-reports-to-whom" *and* "find a person among 30+". The toggle (which the
  user explicitly asked for) lets each job use its best view.
- **Directory + Explorer (drop Tree)** — would lose the literal drawn reporting structure,
  which the user values seeing directly.
- **A pannable/zoomable canvas graph library** — over-engineered for a ~35-person org and
  the weakest reflow story; native overflow + zoom-scale + a mobile outline covers it.

## Tradeoffs, named

- **Three views = more surface to maintain.** Accepted: they share one card/detail/search/
  token layer, so the differentiating code is just layout; the value (overview + structure +
  lookup) justifies it.
- **Directory shows reporting via a per-card `↳ name` line, not drawn connectors.** Accepted:
  the Tree view covers the drawn structure; duplicating connectors in Directory would add noise.
- **Brand blue (`#0064FF`) and the Teachers-domain blue are the same family.** Accepted: they
  appear in different contexts (chrome/actions vs content tags) and Teacher Workspace is the
  team's product, so blue-for-teachers is thematically right.
- **Calmer colour sacrifices the legacy's full domain-tinted zones.** Accepted: anti-slop
  (SLP-4 no nested cards) + Kind Utility favour flat sections with coloured headings.
- **Admin editing deferred.** Accepted per user direction — ship a dogfoodable read-only cut first.

## Controls in scope

A11Y-1, A11Y-2, A11Y-3, A11Y-4, A11Y-5, A11Y-6, A11Y-7, A11Y-8, A11Y-9, A11Y-10, A11Y-11,
TOK-1, TOK-2, TOK-3, TYP-1, TYP-2, TYP-3, COL-1, COL-2, CMP-1, CMP-3, CNT-1, CNT-2, CNT-3,
MOT-1, IDN-1, SLP-1..SLP-10, LAY-2, LAY-4.

> CMP-2 (destructive actions) — **N/A this cut**: there is no destructive surface until the
> deferred admin-editing stage.

## Waivers granted

| Control | Tier | Reason | Approver | Where recorded |
|---------|------|--------|----------|----------------|
| (none) | | No L1 waivers required to date. | | |

- **CMP-1:** asserted, no manifest — `.tfx/component-manifest.json` absent for this product.
  Interactive primitives use Base UI; the search filter is a native labelled `<input>` (Base
  UI Autocomplete deferred to the admin/production stage).
- **IDN-1:** this internal tool has no official product lockup; a simple generic mark is used
  (no recreated/distorted official logo). Recorded as N/A pending design-lead confirmation.

> L0 controls are never waivable. L1 waivers need a named human approver. L2 waivers need a
> specific, real reason.

## Plan approval

- **Approved by:** Wondo Jeong (design lead, DXD)
- **Approved on:** 2026-06-19 (plan approved via the plan gate; layout direction — "all three
  behind a toggle, default Directory" — chosen at the diverge gate after reviewing a live prototype)

## Verify verdict

- **Screenshots** (scratchpad): widths — Directory `fix-dir-1280` / `ev-directory-768` /
  `dir-mobile-360` / `ev-directory-320`; Tree `tree-d-1280` / `ev-tree-768` / `tree-m-360` /
  `ev-tree-320`; Explorer `fix-expl-1280` / `expl-m-360`. States — `ev-loading`, `ev-error`,
  `ev-empty` (+ success in the view shots). Detail dialog — `ev-dialog-1280`, `final-dialog-390`.
- **Token block line range:** `src/index.css:10-113` (the `/* tfx-tokens */ … /* /tfx-tokens */`
  `@theme` region — exempt from token-audit).
- **Dark mode:** N/A — product has no dark mode.
- **Deterministic controls:** `token-audit.py src/index.css src` → exit 0 (TOK-1/2/3, COL-1/2).
  `a11y-static.py src` → exit 0 (focus / non-focusable-click / icon-name static subset). A11Y-1
  contrast (no script — needs rendered colours) verified by WCAG computation of all token pairs,
  re-confirmed independently by the evaluator (lowest 4.54:1). A11Y-2 320px reflow:
  `scrollWidth === clientWidth === 320` for all three views. A11Y-4 hit-area: rendered heights
  measured at 360 px — Legend trigger / filter pill / view toggle / Dialog Close / Explorer Back /
  related-person chips / Reports-to chip all = 44 px.

### Evaluator verdict (re-verification pass — `tfx-design-evaluator`, verbatim)

> VERDICT: fail
>
> BLOCKING (must fix before ship):
> - **A11Y-4** (L1, waiver: none on file) — interactive targets below the 44px mobile floor,
>   verified manually from route code: Dialog Close `size-9` 36px (PersonDetail.tsx:74); Explorer
>   "Back to list" `min-h-9` 36px (ExplorerView.tsx:86); Explorer PersonChip `min-h-6` 24px
>   (ExplorerView.tsx:303); Legend Collapsible.Trigger ≈26px (Legend.tsx:18). All four clear WCAG
>   2.2 AA SC 2.5.8 (24px) — they fail only the TFX-DS catalog's stricter 44px-mobile rule. The fix
>   this round was scoped to DomainFilter + Segmented pills (now `min-h-11`/`sm:min-h-9`, confirmed
>   correct); these other controls were neither in that scope nor flagged in the prior pass. By the
>   skill's mechanical rule (L1 fail, no waiver → blocking) they belong here, but the calibration is
>   a reasonable place for human override. TreeView ZoomControls (32px) NOT flagged — desktop-only.
>
> ADVISORY: None outstanding. The four prior advisories are all resolved.
>
> QUALITY GRADES: Design quality — strong. Originality — strong (appropriately restrained; semantic
> per-domain/status colour is deliberate wayfinding, not SLP-1). Craft — strong (all four states
> designed + confirmed; focus rings everywhere; three widths + a 320 reflow hold). Functionality —
> strong (lookup completes end-to-end at every width; deep-link resolves + stays shareable; mobile
> Explorer detail-with-back preserves the list; error offers a working retry).
>
> JUDGMENT CONTROL NOTES:
> - A11Y-1 (L0) PASS — independently recomputed all 18 claimed pairs; every one clears 4.5:1
>   (lowest joining/departing 4.54, ink-muted-on-surface-2 4.56). Cross-checks of every
>   text-on-background combination also pass incl. blended backgrounds (ink-muted on transfer-soft
>   ghost 4.64, on the bg-surface-2/40 open-role card 4.77, on bg-surface/95 header 5.19).
>   `--color-ink-faint` #80838d (3.78) is the only sub-4.5 token and is never used as text;
>   `--color-danger` is never rendered. No remaining sub-4.5 text.
> - A11Y-4 (L1) fail — see BLOCKING (DomainFilter/Segmented fix confirmed; other mobile controls under 44px).
> - A11Y-8 PASS; A11Y-9 PASS (lang + per-view/person document.title); A11Y-11 PASS (single search
>   announcer — only SearchBox aria-live; LoadingState role=status + ErrorState role=alert distinct);
>   LAY-2 PASS (single-column reflow, Tree falls back to indented Outline <768, no 2D page scroll;
>   scrollWidth===clientWidth===320); CMP-3 PASS; CNT-1 PASS; CMP-1 PASS (Base UI primitives, no
>   hand-rolled controls); SLP-10 PASS.
>
> UNCOVERED: None. Demo-hook hardening resolved — useOrg.ts gates ?fail and ?slow behind
> import.meta.env.DEV, so a shared production link cannot surface a fabricated error or stuck spinner.

**Follow-up after the verdict (A11Y-4 resolved):** the four remaining sub-44px controls the
evaluator flagged were fixed to meet the 44px-mobile floor — Dialog Close → `size-11 sm:size-9`;
Explorer Back → `min-h-11`; Explorer + PersonDetail related-person chips → `min-h-11 sm:min-h-8`;
Legend trigger → `min-h-11 sm:min-h-8`; and the inline "Reports to" link was promoted to a
consistent 44px chip. Rendered heights re-measured at 360 px — all = 44 px (see Deterministic
controls above). With A11Y-1 (L0) passing and A11Y-4 now resolved, the surface clears its in-scope
controls. No L1 waivers were needed.

**Post-review visual fix — Tree connectors (user-reported).** The drawn Tree's connector lines
were disconnected: the bus was built from per-child `border-t` half-segments inside each card's
padded content box, so the horizontal line broke across every inter-card gutter and the outer
half-segment dangled into empty space. Rebuilt the bus as an absolutely-positioned line spanning
each child's *full* column box (clipped to a half on the first/last), so adjacent segments meet
into one continuous line regardless of card widths. While there, made the Tree fit-to-width on load
(CSS-measured natural width → clamped zoom; a sized+`overflow-hidden` wrapper so `transform: scale`
leaves no phantom scroll) and centred the initial horizontal scroll on the root, so you land on the
top of the org instead of a left-hand subtree. token-audit + a11y-static + build remain clean.

## Ratchet

The evaluator's first pass surfaced a defect **no in-scope control covered**: demo/test URL
affordances (`?fail`, `?slow`) shipping to production, where — combined with shareable deep-link
sync — a link could present a real user a fabricated error or stuck spinner. Fixed here by gating
them behind `import.meta.env.DEV`. Proposed addition to `standards/`:

> **[proposed — pending design-lead approval] SLP-11 (or a CMP addition): Test/demo affordances are
> build-gated.** Any UI hook that fabricates a state for verification (forced error/loading, seeded
> data, feature-flag overrides read from the URL or env) must be unreachable in a production build
> (e.g. gated behind `import.meta.env.DEV` or stripped at build), so a shared link or crafted query
> string cannot show an end user a fake state. *fails_when:* a query param / global toggle that
> forces an error, loading, or empty state is honoured in the production bundle.

Note for the catalog maintainers (process, not a new control): A11Y-4's "44px on mobile" rule
applies to **every** mobile-reachable control, not just the obviously-tappable pills — the second
evaluator pass caught dialog/close, back, chip, and disclosure-trigger targets that the first pass
and the initial build both missed. A `checks/` hit-area script (rendered-DOM height measurement at
mobile widths) would have caught all of these mechanically; worth building when the deterministic
suite is extended.
