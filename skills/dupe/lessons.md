# Lessons Learned — Ramp Clone Failure (2026-02-26)

## Lesson 1: Static HTML is never acceptable for interactive sites

Always include `main.js`. The SKILL.md "HTML + CSS" default was wrong — it should
have been "HTML + CSS + vanilla JavaScript" from day one. A clone without
JavaScript for tabs, dropdowns, and navigation feels dead. Users don't say "the
CSS is great" — they say "nothing works."

## Lesson 2: Phase 3 (interactions) must be enforced structurally

Documenting that "interactions are not optional" isn't enough. The page checklist
must have an explicit `[ ] interactions` column so the extraction phase can't be
marked complete without it. If it's not in the checklist, it gets skipped.

## Lesson 3: Extraction data must be cached to disk as JSON

Build agents must READ from `/tmp/dupe-extraction-{domain}.json`, not from prompt
text. When extraction data is passed as text in a prompt, values get approximated
during the build. The JSON file is the single source of truth for every CSS
pixel value.

## Lesson 4: Never delegate the full build to a subagent without exact data files

Passing extraction data as text in a Task prompt loses precision. Always pass the
file path (`/tmp/dupe-extraction-{domain}.json`) so the subagent reads exact
values from disk. Prompt text is lossy — JSON files are not.

## Lesson 5: Every interactive element must have a JavaScript handler

Dead buttons with `cursor: pointer` are worse than no button at all. They
actively mislead the user into thinking something is broken (it is). If a tab
exists in the HTML, it MUST switch on click. If a dropdown trigger has a chevron
icon, it MUST open a menu.

## Lesson 6: Verification must include interaction testing

A pixel-perfect screenshot of a dead UI is a failure. Phase 5 verification must
test every interactive element via Playwright `browser_click` — tabs switch,
dropdowns open/close, navigation navigates. Visual comparison alone misses the
most important failures.

## Lesson 7: Hover states require active extraction — getComputedStyle misses them

`:hover` is a pseudo-class that only activates on mouse interaction. Static
`getComputedStyle()` never captures hover values. You must use Playwright to
hover over the element, THEN extract the changed styles. Without this, the build
agent falls back to `opacity: 0.85` — a dead giveaway the clone is fake.

## Lesson 8: URL routing must be extracted and mirrored in file structure

Real sites use semantic URL paths (`/home/travel/bookings`), not flat file names
(`travel.html`). The extraction pipeline must document the URL sitemap, and the
build must create matching directory structures with `index.html` files. Nav
hrefs must match real paths, not simplified names.

## Lesson 9: Sticky columns need position + offset + z-index + background

Extracting `position: sticky` is useless without `left`, `right`, `top`, `bottom`,
and `z-index`. And sticky elements MUST have explicit `background-color` — without
it, content scrolls visibly underneath them. The extraction must capture the full
sticky recipe, not just the position value.

## Lesson 10: Table cells need dedicated extraction

Tables aren't covered by generic targeted queries for nav/buttons/cards. Without
a specific table extraction step, cells inherit the page background instead of
getting their own white background — making the table blend into the page.

## Lesson 11: Box model (margin/padding/gap) must be extracted, not inferred

`getBoundingClientRect()` gives size and position but not the INTERNAL spacing.
Without extracting `margin`, `padding`, and `gap`, the build agent guesses values
like `padding: 40px 8px` when the real value is `padding: 40px 0`.

## Lesson 12: When restructuring URLs, handle the root entry point

Moving pages into subdirectories (overview.html → home/index.html) without
updating or replacing the root index.html leaves a stale file as the default
entry point. The server serves it at `/`, users see broken links, navigation
fails. Always redirect or replace the root when restructuring.

## Lesson 13: Overview expense rows ≠ expenses table cells

The overview page's `.expense-row` elements inherit the page background (off-white).
Only the expenses page's `.data-table td/th` elements need explicit white backgrounds.
Adding white backgrounds to overview rows creates a color band mismatch.

## Lesson 14: Verify plan assumptions before implementing

The plan said "remove 8px horizontal padding from right-sidebar" but the math
doesn't add it up: 298px sidebar - 282px buttons = 16px = 8px per side. The 8px
padding was creating the correct button width. Always sanity-check spacing math
before deleting padding values.

## Lesson 15: Transitions must be explicitly extracted from computed styles

The rule "ALWAYS extract transitions" existed but the extraction step never queried
`transition`, `transitionDuration`, or `transitionTimingFunction`. Rules without
data = guesswork. Every rule in Phase 4 must have a matching extraction step in
Phase 2.

## Lesson 16: Extraction JSON must cover ALL pages

A 3KB extraction JSON for a 3-page app means most content was guessed. Each page
needs its own extraction pass with dedicated JSON data. If the JSON doesn't have
values for a page, that page was built from imagination — and it shows.

## Lesson 17: Never build from memory — re-extract if the JSON doesn't have it

If the extraction JSON doesn't have a specific value (column width, padding, font
weight), go back to the live site and extract it. Writing CSS from memory or
"what looks right" produces values that are consistently 2-8px off — enough to
feel wrong but not obviously broken.

## Lesson 18: Interaction depth must be defined upfront

Tabs without content are worse than no tabs at all. Before extracting, define how
deep each page's interactions go. If a page has tabs, every tab must have panel
content extracted and built. An empty tab panel tells the user the clone is fake.

## Lesson 19: Hotels ≠ Flights — tab switching that doesn't change form content is broken

When different tabs show different forms (Flights vs Hotels), the extraction must
capture form fields for EACH tab state. Building one form and reusing it for both
tabs means the Hotels tab shows flight fields — a functional failure, not just a
visual one.

## Lesson 20: SVG icons must be extracted verbatim

Feather/lucide/heroicon substitutions are visible to anyone who knows the real site.
Extract the actual `outerHTML` of each `<svg>` element and use it directly. Icon
libraries approximate the visual intent but never match the exact paths, stroke
widths, and viewBox of the original.

## Lesson 21: Right sidebar padding must be verified with math

sidebar_width - button_width = padding * 2. If the grid column is 362px, the inner
content is 298px, and buttons are 282px, then 298 - 282 = 16px = 8px per side.
Don't remove padding that the math says is correct just because the plan says to.

## Lesson 22: Every fix must flow back to SKILL.md

A lesson that stays in lessons.md but doesn't update SKILL.md will repeat on the
next clone. Every lesson must trace to a specific SKILL.md rule, extraction step,
or validation check. If there's no structural change to prevent recurrence, the
lesson is incomplete.

## Lesson 23: Pre-built extraction scripts beat inline JS in skill prompts

Inline JS in SKILL.md meant Claude regenerated extraction code from prose descriptions
on every run — 8+ separate `browser_evaluate` calls per page, each one an LLM-mediated
roundtrip where Claude writes JS from scratch. This was slow, inconsistent across runs,
and burned context window on boilerplate.

The fix: bundle extraction JS as standalone `.js` files in `scripts/`, load them via
Glob + Read at runtime, and pass the file contents to `browser_evaluate`. This reduces
static extraction to 2 calls per page (structure + visual) with deterministic code.

Key design decisions:
- Scripts use `var` and `Array.from()` instead of `const`/`let`/spread — broader
  browser compatibility in Playwright's evaluate context
- Each script includes a size guard (20KB limit, truncates with `_truncated` flag)
- Hover and interaction scripts are parameterized (SELECTOR_PLACEHOLDER / BOUNDS_PLACEHOLDER)
  because they need per-element customization after browser_hover/browser_click
- Fallback to `extraction-reference.md` if Glob can't find scripts (plugin cache issue)

Official docs confirm: skills can bundle and run scripts in any language, and all files
in the skill directory are included in the plugin cache on install.

## Lesson 24: Scripts must NOT use IIFE wrappers

Playwright MCP's `browser_evaluate` wraps your code in `() => { ... }` automatically.
If the script uses an IIFE pattern `(function() { ... return result; })()`, the IIFE's
return value gets swallowed — the outer arrow function has no `return`, so the result
is `undefined`. Scripts must use bare `return` statements at the end so they work
inside Playwright's wrapper.

## Lesson 25: Use Write tool for JSON caching, never Bash/Python

Writing extraction JSON to disk via Bash generates 100+ line Python scripts in the
permission prompt. Users see an intimidating wall of code they can't evaluate. The
Write tool does the same thing with a clean one-line prompt: "Write to
/tmp/dupe-extraction-ramp.json". Always prefer Write for file creation.

## Lesson 26: Measure time-to-build as a quality metric

End-to-end wall clock time from `/dupe <url>` to verified clone is a core quality
metric. Fewer tool calls = less latency. Fewer permission prompts = less user
friction. Pre-built scripts should reduce both. Track this per site in
`tests/{site}/metrics.json` alongside tool call counts and extraction JSON size.
