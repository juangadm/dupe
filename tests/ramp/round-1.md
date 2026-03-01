# Round 1 — Ramp — 2026-02-28

**Context:** Pre-subagent split. Monolithic SKILL.md (1124 lines). Single context window for all 5 phases.

## Human grades

| Page | Visual | Content | Interactions | Notes |
|------|--------|---------|-------------|-------|
| Overview | 3 | 5 | 3 | Sidebar completely broken. Table padding wrong in recent expenses. Banner mixed with rest of page and title heading. Missing all sidebar interactions — agent treated it as 2 interactions, not 3. |
| Expenses | 4 | 4 | 4 | New Reimbursement button completely misplaced. Extra padding on sides of expenses. Avatars are squircles in clone but circles in original. Missing table columns (require horizontal scroll). Background is weird off-white, not white. Transaction date and date fields never opened. |
| Travel | 5 | 4 | 4 | Flights/Hotels headers ended up outside the box instead of inside. Search Flights button should be halfway on the box, not fully inside. Placeholder DDMMYY in departure/return instead of "Departure"/"Return" labels. Flight/hotel tab works but boxes below don't load the right sidebar. |

## Agent verification said

- Overview: Color grid ~81% WARN, Structural WARN, Interactions 1/1 PASS → Overall WARN
- Expenses: Color grid ~91% PASS, Structural PASS, Interactions 2/2 PASS → Overall PASS
- Travel: Color grid ~92% PASS, Structural PASS, Interactions 2/2 PASS → Overall PASS

## False positives

- Expenses said PASS but: New Reimbursement button misplaced, extra padding, wrong avatar shapes, missing columns, wrong background color — human scored Visual 4, Content 4
- Travel said PASS but: headers outside box, button positioning wrong, placeholder dates instead of labels — human scored Content 4
- Overview interactions said 1/1 PASS but sidebar interactions completely missing — human scored 3
- Expenses interactions said 2/2 PASS but date fields never opened — human scored 4

## Issue diagnosis (11 issues)

| # | Issue | Page | Category | Root Cause |
|---|-------|------|----------|------------|
| 1 | Flights/Hotels headers outside box | Travel | A | Tabs built as sibling of `.travel-card`, not child. Extraction shows tabs at y=154, inside card y=129-354. Context exhaustion — agent lost DOM containment logic. |
| 2 | Search button fully inside card | Travel | B | Button in normal flow. Should straddle card bottom (button y=327-383, card bottom y=354). No build rule for straddle positioning. |
| 3 | DDMMYY vs Departure/Return labels | Travel | A | Agent fabricated DDMMYY instead of reading extraction JSON. Existing build rule covers this — context exhaustion. |
| 4 | Reimbursement button misplaced | Expenses | A | Button is in correct panel HTML, but agent forgot or misplaced it by the time it reached expenses page (3rd page, running on fumes). |
| 5 | Extra side padding (24px vs 40px) | Expenses | B | `.expense-row` uses `padding: 12px 24px` but extraction shows 40px. Agent substituted a "standard" value. No guard against padding substitution. |
| 6 | Squircles vs circles (avatars) | Expenses | C | `extract-visual.js` captured `borderRadius: "0px"` on `<img>`, missed parent container's `border-radius: 50%` and `overflow: hidden`. |
| 7 | Off-white background | Expenses | A | `.page-content` uses `rgb(252,251,250)` instead of `rgb(255,255,255)` from extraction. Read-Print-Write protocol failure. |
| 8 | Missing columns (horizontal scroll) | Expenses | D | All 12 columns exist in extraction and HTML — they need horizontal scroll to see. Not a bug. |
| 9 | Sidebar broken | Overview | A | CSS class names don't match HTML. Agent invented class names late in build when context was exhausted. |
| 10 | Table padding wrong (24px vs 40px) | Overview | A | Same substitution pattern as #5 — agent wrote 24px from memory instead of reading extraction. |
| 11 | Banner color wrong | Overview | A | `--color-bg-banner` set to hero green `rgb(47,72,66)` instead of dark charcoal `rgb(46,46,39)` from extraction. |

## Root cause categories

### A — Context exhaustion (7 issues: 1, 3, 4, 7, 9, 10, 11)

Subagent split alone should fix these. The agent had correct rules and extraction data
but ran out of context window capacity by Phase 4. Fresh ~200K context per phase will
let the build agent follow the Read-Print-Write protocol without degradation.

### B — Needs new build rule (2 issues: 2, 5)

- **Straddle positioning (#2):** No build rule for elements whose rect extends beyond
  their parent. Added rule to Step 4.4: detect straddle, use `transform: translateY(50%)`
  or negative margin, set `overflow: visible` on parent.
- **Padding substitution (#5):** No guard against rounding padding to "standard" values.
  Added rule to Step 4.4: padding values are exact, never rounded. 40px ≠ 24px.

### C — Extraction gap (1 issue: 6)

`extract-visual.js` captures `borderRadius` on the `<img>` element (0px) but misses
the parent container's `border-radius: 50%` that creates the circular shape. Added
`parentShape` field to image extraction. Added Step 4.5 point 7: wrap `<img>` in a
clipping container when `parentShape` is present.

### D — Not a bug (1 issue: 8)

Columns exist in both extraction and HTML. They require horizontal scroll.
`.data-table-wrapper` with `overflow-x: auto` handles this correctly.

## Fixes applied

- `extract-visual.js`: Added `parentShape` to image extraction (Lesson 50)
- `build.md` Step 4.4: Added straddle-positioning rule and padding exactness rule
- `build.md` Step 4.5: Added parentShape image wrapping rule (point 7)
- `lessons.md`: Added Lesson 50 documenting all three patterns
- Subagent split (Lesson 49): Addresses all 7 Category A issues
