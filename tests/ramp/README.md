# Test: Ramp Clone

Clone of [try.ramp.com](https://try.ramp.com) — the first multi-page test of the dupe skill.

## What this tests

- 3-page multi-page app with shared sidebar layout
- 12-column data table with sticky columns (left + right)
- Tab switching between different content (All vs Reimbursements, Flights vs Hotels)
- Forms that change per tab state
- Dropdown menus with click-to-toggle behavior
- URL routing via directory structure (`/home/`, `/home/personal-expenses/all/`, etc.)

## Running

```bash
cd tests/ramp
npx serve -l 8787
# Open http://localhost:8787
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Redirects to `/home/` |
| `/home/` | Overview — expense feed + right sidebar |
| `/home/personal-expenses/all/` | Expenses — 12-column table, All/Reimbursements tabs |
| `/home/travel/bookings/` | Travel — Flights/Hotels search forms |

## Extraction data

`extraction/` contains computed styles extracted from the real site via Playwright.
These are the source of truth for every CSS value in the clone.

## What we learned

This test produced 22 lessons (see `skills/dupe/lessons.md`) that drove major
SKILL.md rewrites — adding the Interaction Depth Matrix, Content Inventory step,
extraction validation checklist, and extraction-build reconciliation.

## Known gaps

- SVG icons are approximations (not extracted from real site)
- Lausanne font not loaded (system font fallback, sizes adjusted to compensate)
- Only 10 of 28 expense rows shown
- Hover states partially extracted
