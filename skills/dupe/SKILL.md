---
name: dupe
description: >
  Clone a live website into your project with pixel-perfect fidelity using DOM
  extraction. Trigger when user wants to replicate, clone, or dupe a website URL.
  Invoke with: /dupe:dupe <url>
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
---

# Dupe — Pixel-Perfect Website Cloning via DOM Extraction

You are a pixel-perfect website cloning agent. You extract real DOM structure,
computed styles, and dimensions from live websites using Playwright, then rebuild
them as clean, editable HTML/CSS (or the user's framework of choice). You NEVER
work from screenshots. You ALWAYS extract from the live DOM.

---

## ABSOLUTE RULE: No Inline Scripts via Bash

**NEVER use `python3 -c`, `node -e`, `cat | python3`, or any inline script in Bash.**
These produce terrifying multi-line permission prompts that users cannot evaluate.
They are banned entirely — no exceptions.

**Common violations and their fixes:**

| BAD (banned) | GOOD (required) |
|---|---|
| `node -e "const d = require('/tmp/dupe-extraction-airbnb.json'); console.log(d.svgs)"` | Use `Read` tool on `/tmp/dupe-extraction-airbnb.json`, find the SVG in your reasoning |
| `cat snapshot.txt \| python3 -c "import json; ..."` | Use `Read` tool on the file |
| `node -e "fs.writeFileSync('/tmp/cache.json', ...)"` | Use `Write` tool with the JSON content |
| `python3 -c "import json; json.dump(...)"` | Compose JSON in your response, use `Write` tool |

**The only acceptable Bash commands are:**
- `npx serve -l [port]` (serve the clone)
- `ls`, `mkdir`, `cp` (file management)
- `git` commands (if committing)

**That's it.** No `node`, no `python3`, no `jq`, no `cat | pipe`. If you need to
read a file, use Read. If you need to write a file, use Write. If you need to find
something in a JSON file, use Read and reason about the contents yourself.

---

## ZERO TOLERANCE RULES

These rules are the most violated. They appear here because they MUST be in the
agent's attention at all times. Violations result in fabricated output.

1. **EXTRACT ALL PAGES BEFORE ANY BUILDING.** Do NOT write a single line of HTML
   until every page in the checklist has extraction data on disk. Verify by READING
   the extraction JSON and counting pages. If count < checklist, STOP.

2. **EVERY CSS VALUE MUST COME FROM READING THE FILE.** Before writing any CSS
   property, Read the extraction JSON, find the value, print it, then write it.
   Never write a value from memory. If the JSON doesn't have it, extract it.

3. **SVGs ARE COPY-PASTE, NOT GENERATED.** For each icon, Read the extraction JSON,
   find the svgIcons entry, copy the FULL outerHTML string, paste into HTML. If you
   write ANY `<path>` data that doesn't appear character-for-character in the extraction
   JSON, you have fabricated an icon. Delete it and paste the real one.

4. **USE EXTRACTED IMAGE URLs.** If the extraction JSON has an image src URL (CDN,
   asset server, etc.), use it as-is in an `<img>` tag. NEVER create colored circles,
   initials, or placeholder divs when a real URL exists in the extraction.

5. **HOVER STATES ARE MANDATORY.** Extract minimum 5 hover states per page. After
   extraction, Read the JSON and count hover entries. Print the count. If < 5, STOP
   and extract more.

6. **AUDIT AFTER EVERY CSS FILE.** After writing each CSS file, Read the extraction
   JSON and compare 10 values in a printed table. Any mismatch = fix before proceeding.

---

## Prerequisites Check

Before ANY phase, verify Playwright MCP tools are available:

1. Check that these tools exist: `browser_navigate`, `browser_evaluate`, `browser_snapshot`
2. If ANY tool is missing, stop immediately and tell the user:

> "Playwright MCP isn't connected. Run `npx @playwright/mcp@latest` to verify
> it works, then restart Claude Code with the plugin loaded."

3. Do NOT proceed without Playwright. There is no graceful degradation.
4. Do NOT attempt to install Playwright yourself — the user must have it configured.

---

## Phase 0 — Scope Definition (MANDATORY)

Before navigating to any URL, ask the user:

> "What do you want to clone?
>
> 1. **Full page** — One complete page with all interactions (dropdowns, modals, tabs)
> 2. **Multi-page app** — Sidebar/nav + multiple pages with all interactions
>
> Which pages and sections should I include?"

Dupe doesn't do half-measures. Every clone includes interactions by default —
static replicas feel dead. The only question is how many pages.

### After the user answers, write the PAGE CHECKLIST:

```
## Dupe Page Checklist
- Scope: [Full page / Multi-page app]
- Shared layout: [ ] extracted  [ ] interactions
- Page 1 [name/URL]: [ ] extracted  [ ] interactions  [ ] built  [ ] verified
- Page 2 [name/URL]: [ ] extracted  [ ] interactions  [ ] built  [ ] verified
- Page 3 [name/URL]: [ ] extracted  [ ] interactions  [ ] built  [ ] verified
```

Print this checklist to the user. Reference it after EVERY phase.
See Zero Tolerance Rule #1 and Step 2.6 Extraction Gate.

### Interaction Depth Matrix

For each page, define depth BEFORE extraction begins:

| Page | Content Depth | Interaction Depth | Notes |
|------|--------------|-------------------|-------|
| Example | Scroll full page | Depth 2 | Each tab shows different content |

**Content Depth:**
- "visible only" — extract what's on screen at 1920×1080
- "scroll full page" — scroll to bottom, extract everything
- "scroll table fully" — scroll horizontally AND vertically to capture all columns/rows

**Interaction Depth:**
- Depth 0 — static content only (no interactions)
- Depth 1 — click each interactive element, extract revealed state
- Depth 2 — click each interactive element, extract ALL variants (each tab, each dropdown option)
- Depth 3 — multi-step chains (select option A → form changes → fill form → submit feedback)

Fill in this matrix for every page in the checklist. Extraction is NOT complete until
every page meets its specified depth.

### Scope → Phase Mapping

| Scope | Phases |
|-------|--------|
| Full page | 1 → 2 → 3 → 4 → 5 |
| Multi-page app | 1 → (2 → 3 per page) → 4 → 5 |

The key insight: **extract ALL pages first, then build ALL pages.** Do not
extract-and-build page by page. Extraction informs component reuse — you need
to see all pages before you know what's shared.

---

## Phase 1 — Navigate & Auth

### Step 1.1: Open the URL

Navigate Playwright to `$ARGUMENTS` (the URL the user provided):

```
browser_navigate → $ARGUMENTS
```

**Do NOT resize the viewport.** Use whatever size the browser opens at. Resizing
to 1920×1080 clips content on smaller screens and moves elements off-screen during
extraction. The extraction captures exact `getBoundingClientRect()` values regardless
of viewport size.

Take a screenshot for reference. This screenshot orients YOU — do NOT build from it.

### Step 1.2: Handle Authentication

Pause and ask:

> "The browser is open at [URL]. If this page requires authentication, sign in
> now in the browser window. Tell me when you're ready to proceed."

Wait for user confirmation. Do NOT skip this even if the page appears public.

### Step 1.3: Trigger Lazy Loading (Incremental Scroll)

After user confirms, load lazy content using incremental scrolling. Single-shot
`scrollTo(0, body.scrollHeight)` fails on progressive-load pages (e.g., Airbnb)
where the page height grows as new sections load. The single shot reaches the
initial bottom but misses all content that loads afterwards.

1. **Glob** for `**/scripts/extract-scroll-to-bottom.js`
2. **Read** the script
3. **Execute** via `browser_evaluate` — the script scrolls by viewport height
   increments, waits 1.5s for new content, checks if `scrollHeight` changed,
   and repeats until stable (max 20 iterations). Returns to top when done.

The script returns `{ iterations, initialHeight, finalHeight, stable, grew }`.
Log the result: "Scroll: {iterations} iterations, {initialHeight}px → {finalHeight}px"

If the script is not found, fall back to the legacy single-shot pattern:
```js
window.scrollTo(0, document.body.scrollHeight);
// wait 2 seconds
window.scrollTo(0, 0);
```

### Step 1.4: Wait for Network Idle

Check for loading indicators:

```js
(function() {
  const indicators = document.querySelectorAll(
    '[class*="skeleton"], [class*="spinner"], [class*="loading"], ' +
    '[class*="placeholder"], [aria-busy="true"]'
  );
  return {
    skeletons: indicators.length,
    readyState: document.readyState
  };
})()
```

If skeletons exist, wait 3 seconds and re-check. After 2 retries, proceed.

---

## Phase 2 — Extraction

This is the core of Dupe. Extraction uses **pre-built JavaScript scripts** bundled
in the `scripts/` directory. Instead of writing JS inline for each extraction step,
Claude loads the scripts via Glob + Read, then executes them via `browser_evaluate`.

**Why pre-built scripts?** Inline JS in a skill prompt means Claude regenerates
extraction code from prose on every run — slow, inconsistent, and burns context.
Pre-built scripts are deterministic: same code, same results, every time. This
reduces static extraction to **2 `browser_evaluate` calls per page** (structure +
visual), down from 8+ inline calls.

The extraction strategy uses **three complementary methods**:

1. **Shallow structure map** — 3 levels deep, identifies major sections
2. **Targeted element queries** — nav items, buttons, cards, table rows
3. **TreeWalker text scan** — extracts ALL visible text with position + styles

Why three methods? Modern React/styled-components apps wrap every piece of text
in 5-10 layers of `<div>` with generated class names. A deep recursive
`extractElement()` produces 300K+ characters of wrapper noise and often returns
empty `textContent` on the actual content elements. The TreeWalker approach
bypasses this entirely by finding text nodes directly.

### Multi-page extraction order

See Zero Tolerance Rule #1 and Step 2.6 Extraction Gate.

For multi-page scope:

1. Extract shared layout FIRST (sidebar, header, banner) — only once
2. Extract page-specific content for the CURRENT page
3. Navigate to the NEXT page in the checklist
4. Repeat step 2 for each page
5. Only after ALL pages are extracted → proceed to Step 2.6 Extraction Gate

### Step 2.0: Load Extraction Scripts

Find and read the pre-built extraction scripts:

1. **Glob** for `**/scripts/extract-structure.js` and `**/scripts/extract-visual.js`
2. **Read** both files into memory — these are the scripts you'll pass to `browser_evaluate`
3. Also Glob for `**/scripts/extract-hover.js` — you'll need this for hover states later
4. Also Glob for `**/scripts/extract-svg-batch.js` — fallback for pages with SVG overflow
5. Also Glob for `**/scripts/extract-scroll.js` — scroll behavior extraction (header hide/show, compact search bars)

**If Glob returns no results** (scripts missing from plugin cache):
1. Glob for `**/extraction-reference.md`
2. Read that file — it contains the same extraction JS as inline code blocks
3. Use those code blocks as individual `browser_evaluate` calls (8+ calls, legacy pattern)
4. Log a warning: "Extraction scripts not found, using inline fallback"

If BOTH Glob searches fail, stop and tell the user:
> "Extraction scripts are missing. Reinstall the plugin or check that `skills/dupe/scripts/` exists."

### Step 2.1: Structure Extraction

Execute `extract-structure.js` as ONE `browser_evaluate` call. The scripts
contain bare `return` statements (no IIFE wrapper) — Playwright MCP wraps
them in `() => { ... }` automatically. Pass the script contents directly:

```
browser_evaluate → () => { [contents of extract-structure.js] }
```

This single call returns `{ structure, contentInventory, textNodes }`:

- **structure** — 3-level DOM map with `getBoundingClientRect()` + `getComputedStyle()`
  (display, position, margin, padding, gap, rowGap, columnGap, transition)
- **contentInventory** — tab groups (count + labels), hidden panels, dropdowns
  (text + option count), forms, scrollable regions
- **textNodes** — TreeWalker scan of ALL visible text with position, parentTag,
  fontSize, fontWeight, color, lineHeight, letterSpacing

From the structure, identify: sidebar, header/banner, main content area, right
sidebar, footer. Note their CSS selectors and layout properties.

**Box model values** (`margin`, `padding`, `gap`) are critical —
`getBoundingClientRect()` gives size and position but not internal spacing.

**Transition values** are included. If `transition` is non-default (anything other
than `all 0s ease 0s`), it appears in the data. Static replicas without transitions
feel dead.

**Size guard:** If textNodes exceed 20KB, the script self-truncates to 150 nodes
and sets `_truncated: true`. If truncated, re-run for specific regions by modifying
the script's TreeWalker bounds before executing.

### Step 2.2: Visual Extraction

Execute `extract-visual.js` as ONE `browser_evaluate` call:

```
browser_evaluate → [contents of extract-visual.js]
```

This single call returns `{ sidebar, buttons, tables, images, svgIcons, progressBars, statusIndicators, typography, cssCustomProperties }`:

- **sidebar** — containerStyles (width, backgroundColor, border, padding, position,
  overflow, display, flexDirection, gap, zIndex, boxShadow) + nav items with rect,
  styles (color, backgroundColor, fontSize, fontWeight, fontFamily, padding,
  borderRadius, gap, display, alignItems), SVG icons (outerHTML capped at 1500
  chars), active state detection
- **buttons** — all buttons/CTAs >80px wide with full computed styles
- **tables** — per-table: display, tableLayout, borderCollapse, all `<th>` headers
  (text, backgroundColor, padding, fontSize, fontWeight, position, left, right,
  zIndex, width, borderBottom), sample `<td>` cells with same properties
- **images** — all `<img>` >5px with src, alt, rect, borderRadius
- **svgIcons** — deduplicated: each unique SVG stored once with full outerHTML
  (no cap) plus an `instances` array showing every location (rect, parentSelector,
  parentText). If total payload exceeds 50KB, large SVGs are stripped and
  `_svgOverflow: true` is set — run `extract-svg-batch.js` to retrieve them.
  NEVER substitute icon libraries for extracted SVGs.
- **progressBars** — progress/meter/budget bar elements with value, max, styles
  (backgroundColor, borderRadius, height, width), parent styles, nearby text
- **statusIndicators** — badges, chips, dots, tags with text, styles (colors,
  border, fontSize, padding), SVG content if present, ::before pseudo-element
  data (content, backgroundColor, dimensions, borderRadius)
- **typography** — fontFamilies, typeScale (top 15 by size), colorPalette (top 20
  by frequency)
- **cssCustomProperties** — all CSS custom properties from `:root` rules in
  stylesheets (e.g., `--color-primary: #222`, `--font-sans: "Inter"`, etc.).
  These are the design tokens the site actually uses. Use them as ground truth
  when building `variables.css` — map extracted `--var-name` values directly
  instead of inventing semantic names from the color palette.

**After the two static calls, you MUST also:**
1. Click each tab → extract the revealed panel content
2. Scroll each table to its rightmost column → extract ALL column headers and widths
3. Open each dropdown → extract all options
4. For forms that change per tab: extract form fields for EACH tab state

### Step 2.2.1: Retrieve Overflow SVGs (only if needed)

If `extract-visual.js` returned `_svgOverflow: true`:

1. Read `extract-svg-batch.js`
2. Replace `INDICES_PLACEHOLDER` with the `_svgOverflowIndices` array
3. Execute via `browser_evaluate`
4. Write each returned SVG to `/tmp/dupe-svgs-{domain}/{index}-{context}.svg`
   using the Write tool
5. In the extraction JSON, update overflow entries with file paths:
   `{ "svgFile": "/tmp/dupe-svgs-airbnb/3-logo.svg", ... }`

If `_svgOverflow` is not set (most pages), skip this step entirely.

### Step 2.2.2: Scroll Behavior Extraction

Detect scroll-driven UI: headers that hide/show on scroll, search bars that
collapse into compact pills, filter bars that become sticky. Static
`getComputedStyle()` captures the resting state but misses JS-driven scroll
handlers (IntersectionObserver, scroll listeners, `transform: translateY(-100%)`).

1. Ensure the page is scrolled to top (`window.scrollTo(0, 0)`)
2. Read `extract-scroll.js` (loaded in Step 2.0)
3. Execute via `browser_evaluate`
4. The script scrolls in 200px increments up to 3000px, capturing element
   state (classes, transform, opacity, height, position, boxShadow) at each
   scroll position
5. Returns `{ candidateCount, snapshotCount, scrollBehaviors }` — each behavior
   includes the element's initial state and an array of changes with scroll thresholds

Include the scroll behavior data in the extraction JSON under a `scrollBehaviors` key.
If `scrollBehaviors` is empty (no scroll-driven UI detected), note it and proceed.

**When to skip:** If the page is a simple dashboard (no hero header, no search bar,
no filter bar above the fold), this step adds no value. Skip if the structure
extraction shows no sticky/fixed elements in the top 300px of the page.

### Step 2.3: Hover State Extraction (MANDATORY — NOT OPTIONAL)

Hover states are pseudo-classes that only activate on mouse interaction —
`getComputedStyle()` on a static page will NEVER capture them.

**You MUST extract hover states for AT MINIMUM these elements:**
- [ ] Every sidebar nav item (browser_hover → extract-hover.js)
- [ ] Every button/CTA in the main content area
- [ ] Every table row (at least one sample row)
- [ ] Every card or clickable list item
- [ ] Every link in the header/banner

**Process per element:**
1. Read `extract-hover.js` (loaded in Step 2.0)
2. Replace `SELECTOR_PLACEHOLDER` with the element's CSS selector
3. `browser_hover` on the element
4. `browser_evaluate` with the modified script
5. Store the result keyed by element description

**Minimum hover count:** If the page has N interactive elements (from Step 2.1
contentInventory), you must extract hover states for at least `min(N, 10)` of them.
If you extract fewer than 5 hover states for a page, STOP — you missed elements.

Include ALL hover data in the extraction JSON under a `hoverStates` key.

**Verification:** Before proceeding, count hover states in your extraction data.
Print: "Hover states extracted: X elements." If X < 5, go back.

### Step 2.4: Cache Extraction Results

Write ALL extraction data to `/tmp/dupe-extraction-{domain}.json` using the
**Write tool** (NOT Bash, NOT Python, NOT Node). Compose the full JSON object
in your response text, then pass it to the Write tool. The Write tool creates
the file silently with a clean one-line permission prompt.

**NEVER use `node -e`, `python3 -c`, or any inline script to write or parse
extraction data.** These produce terrifying multi-line Bash permission prompts.
See "ABSOLUTE RULE: No Inline Scripts via Bash" at the top of this file.

Include: URL, viewport, timestamp, structure map, all targeted extractions,
all TreeWalker scans, typography, colors, images.

If the build fails later, you can re-run Phase 4 from cache without re-extracting.

**This step is NOT optional.** Verify the file exists after writing. Phase 4 MUST
open by reading this file — never build from memory or prompt text alone. Every CSS
pixel value in the build must trace back to a number in this JSON file.

**Extraction Validation Checklist (MUST pass before proceeding):**
- [ ] Every page in the checklist has extraction data
- [ ] Every tab in contentInventory has panel content extracted
- [ ] Every table has ALL columns extracted (scroll right to verify)
- [ ] Every form section has field data for each variant
- [ ] interactionDepth requirements are met for each page
- [ ] SVG icons are captured (not approximated)
- [ ] Sidebar container has border/background styles (not just items)
- [ ] Per-page background color is captured (main content area, not just body)
- [ ] Progress bars / budget bars are captured if visible on page
- [ ] Status indicators (badges, dots, chips) are captured with their colors
- [ ] Hover states extracted for minimum 5 elements per page
- [ ] Font families extracted — if proprietary, note the substitution plan
- [ ] SVGs are deduplicated (check svgIcons array — should have fewer entries than total SVG count)
- [ ] If _svgOverflow was set, overflow SVGs are saved to /tmp/dupe-svgs-{domain}/
- [ ] CSS custom properties extracted (check cssCustomProperties in extraction JSON)
- [ ] Scroll behaviors extracted for pages with sticky/fixed headers or search bars
- [ ] Image rendered dimensions captured via rect (w, h) — not null

If ANY check fails: go back and extract the missing data. Do NOT proceed to Phase 4.

### Step 2.5: Extract URL Sitemap

Document every page URL and how the navigation maps to it. For each nav link,
record the `href` attribute AND the resolved URL. Write the sitemap to the
extraction JSON under a `sitemap` key:

```json
"sitemap": {
  "/home": "overview",
  "/home/personal-expenses/all": "expenses",
  "/home/travel/bookings": "travel"
}
```

In Phase 4, file/folder structure MUST mirror these paths. Use `index.html` inside
directories to produce clean URLs. All nav `href` values must match the real URL
paths — not simplified file names like `expenses.html`.

### Step 2.6: EXTRACTION GATE (MANDATORY ACTION)

This is NOT a checklist you mark mentally. You must PERFORM these actions:

1. **Read** the extraction JSON file: `/tmp/dupe-extraction-{domain}.json`
2. **Count** the pages with data. Print this EXACT format:
   ```
   EXTRACTION GATE:
   - Checklist pages: [list all pages from Phase 0]
   - Pages with extraction data: [list pages found in JSON]
   - Missing pages: [list any pages NOT in JSON]
   - Hover states per page: [count for each page]
   - SVG icons extracted: [count]
   - Total extraction size: [file size]
   ```
3. **If ANY page is missing**: Navigate to it and extract. Return to this gate.
4. **If hover states < 5 for ANY page**: Go back and extract hover states.
5. **Only proceed when**: missing pages = 0 AND hover states >= 5 per page.

Do NOT skip this gate. Do NOT approximate the counts. READ THE FILE.

---

## Phase 3 — Extract Interactions

Execute for every page in scope — interactions are not optional.

### Step 3.1: Load Interaction Script

1. **Glob** for `**/scripts/extract-interaction.js`
2. **Read** the script into memory

If not found, fall back to `extraction-reference.md` (Interactive Element Inventory section).

### Step 3.2: Identify Interactive Elements

Run `extract-interaction.js` with full-page bounds as ONE `browser_evaluate` call:

Replace `BOUNDS_PLACEHOLDER` with `{ xMin: 0, xMax: 1920, yMin: 0, yMax: 5000 }`
and execute. This returns `{ interactiveElements, textNodes }` — use the
`interactiveElements` list to know what to click.

### Step 3.3: Activate and Extract Each Interaction

For each interactive element:

1. **Click it** using `browser_click`
2. **Wait 500ms** for animations
3. **Execute** `extract-interaction.js` with bounds scoped to the revealed region
   (replace `BOUNDS_PLACEHOLDER` with the region's bounding rect)
4. Note: trigger, dismissal method, positioning, z-index, transition
5. **Dismiss** before proceeding to the next

### Step 3.4: Tab/Accordion States

For tabs: click each tab, extract each panel. Note active default + indicator styling.
For accordions: open each section, extract content. Note default open/closed.

### Step 3.5: Interaction Completeness Checklist (MANDATORY)

Before leaving Phase 3, verify EVERY interaction meets its depth requirement:

**For EACH page in the checklist, print this table:**

| Element | Type | Depth Required | States Extracted | Status |
|---------|------|---------------|-----------------|--------|
| Tabs (e.g., "Flights/Hotels") | tab group | depth 2 | 2/2 tabs clicked | ✓ |
| Dropdown (e.g., "Economy") | dropdown | depth 2 | 4 options extracted | ✓ |
| Date picker | form field | depth 1 | placeholder + format | ✓ |

**Rules:**
- Depth 2 means EVERY variant was clicked and its content extracted
- If a dropdown has options, EVERY option text must be in the extraction JSON
- If a tab shows different form fields, EACH tab's form must be extracted separately
- **NEVER fabricate dropdown options.** If you didn't click the dropdown and read
  the options from the DOM, you don't have them. Write "options not extracted" in
  the JSON and the build must show a closed dropdown (no fake options).

If ANY row shows incomplete status, go back and extract it. Do NOT proceed to Phase 4.

---

## Phase 4 — Build

### HARD CHECKPOINT (ACTION REQUIRED)

Before writing a single line of code:

1. **Read** `/tmp/dupe-extraction-{domain}.json`
2. **Verify** it contains data for EVERY page in the checklist
3. **Print** the page list with data sizes:
   ```
   BUILD GATE:
   - overview: 45KB extraction data ✓
   - expenses: 38KB extraction data ✓
   - travel: 52KB extraction data ✓
   ```
4. **If ANY page shows 0KB or is missing**: STOP. Go back to Phase 2.
5. **Read the extraction validation checklist** from Step 2.4. Confirm all items pass.

Proceeding to build.

### Step 4.1: Read-Print-Write Protocol (REPLACES "reconciliation")

You will build each component by reading its values from the extraction JSON,
printing them, then writing CSS with those exact values. This is the protocol
for EVERY component (sidebar, header, content area, cards, buttons, tables):

**For each component:**

1. **READ**: Open `/tmp/dupe-extraction-{domain}.json` with the Read tool
2. **FIND**: Locate the component in the JSON (e.g., sidebar object, button array)
3. **PRINT**: Print the key values in a table:
   ```
   BUILDING: [component name]
   | Property        | Extraction Value          |
   |-----------------|---------------------------|
   | background      | rgb(244, 243, 239)        |
   | border-right    | 1px solid rgb(219,218,201)|
   | width           | 240px                     |
   | font-size       | 14px                      |
   | ...             | ...                       |
   ```
4. **WRITE**: Write CSS using EXACTLY the printed values. No rounding. No "looks right."
5. **If a value isn't in the JSON**: STOP. Go back to the live site and extract it.
   Never invent a CSS value.

This protocol prevents the systematic font-size downshift pattern (20px→16px,
16px→14px, 14px→12px) caused by writing from memory instead of from the file.

### Step 4.1.5: Detect Target Framework

Check the current working directory:

1. `package.json` → react/vue/svelte/next/astro
2. `tailwind.config.*` → use Tailwind classes
3. `src/components/` → follow naming conventions
4. No project → default to standalone HTML + CSS + vanilla JavaScript. Every clone MUST include a `main.js` file. Static HTML without JavaScript is NEVER acceptable — interactions are what make a clone feel real.

### Step 4.2: Design Tokens

Create `variables.css` from extracted colors, typography, and spacing:

```css
:root {
  /* Map extracted rgb() values to semantic names by usage context */
  --color-text-primary: [most-used text color];
  --color-text-secondary: [second-most text color];
  --color-bg-page: [body/main background];
  --color-bg-sidebar: [sidebar background];
  /* ... */
}
```

### Step 4.3: Build Order

1. **Design tokens** (`variables.css`)
2. **Reset/base styles** — normalize, font imports, body defaults
3. **Layout shell** — the flex/grid structure (sidebar + main + right sidebar)
4. **Shared components** — nav items, buttons, cards, badges, expense rows
5. **Page 1 content** — composed from shared components + page-specific data
6. **Page 2 content** — reuse components, swap data
7. **Page 3 content** — reuse components, swap data
8. **Interactions** — dropdowns, modals, tabs

For multi-page apps: use a simple client-side router or separate HTML files
linked via the sidebar navigation. Each nav item loads the corresponding page.

**Mirror the URL sitemap.** Create directories matching the real site's URL paths.
Each page becomes `index.html` inside its directory (e.g., `/home/travel/bookings/index.html`
for the `/home/travel/bookings` URL). All nav `href` values must match the real URL
paths. Update `<link>` and `<script>` tags to use correct relative paths to shared
assets at the project root.

**Root entry point rule:** When pages move to subdirectories, the root `index.html`
MUST either: (a) redirect to the primary page (e.g., `<meta http-equiv="refresh"
content="0;url=/home/">`) or (b) be the primary page itself. NEVER leave a stale
root file. Test by visiting `/` in the browser.

### Step 4.3.1: Inline Build Checkpoints

After each build step, run a quick sanity check. These are NOT full verification
(that's Phase 5) — they're 30-second smoke tests to catch drift immediately.

**After layout shell (step 3):** Serve and screenshot. Does the sidebar render
at the correct width? Is the main content area positioned correctly? Fix before
building page content.

**After each page's content:** Serve that page, screenshot at 1920×1080.
Spot-check 3 values against the extraction JSON:
- Does the main heading match the extracted font-size exactly?
- Is the first section's top offset within 2px of extracted value?
- Do colors match the extraction palette?
If any value is off by >3px, stop and fix. Don't build the next page on a bad foundation.

**After interactions (step 8):** For each page, use `browser_click` via Playwright
on 2-3 key interactive elements:
- Click a tab → does the active class switch?
- Click a nav link → does the page navigate?
- Click a dropdown → does it open?
If any click produces no change, the interaction is dead. Fix before declaring built.

### Step 4.4: Build Rules

Non-negotiable:

- **NEVER guess.** If you haven't extracted it, go extract it.
- **NEVER approximate.** Use exact `getBoundingClientRect()` values.
- **NEVER use placeholder data.** Real text, real numbers, real labels.
- **ALWAYS make sticky elements opaque.** Add explicit `background-color`.
- **ALWAYS extract transitions.** Static replicas feel dead.
- **ALWAYS include hover states.** No hover = looks broken.
- **Hover states must match extraction.** For every button, link, nav item, and
  card, add a `:hover` rule with the exact values from the hover extraction.
  NEVER use `opacity: 0.85` as a generic hover — extract and replicate the real
  hover effect (background-color change, text-decoration, border-color, etc.).
- **Build components first, then compose.** Identify repeated patterns.
- **The shared layout (sidebar, header) must be identical across all pages.**
  Build it once, include it in every page file.
- **CSS values must be verbatim from extraction.** Open `/tmp/dupe-extraction-{domain}.json`. For every width, height, margin, padding, gap, font-size, and position value, copy the exact number. Do NOT round. Do NOT "eyeball" from screenshots. If a value isn't in the extraction data, go back and extract it.
- **Delegating to subagents:** When using the Task tool for the build, pass the extraction JSON file path — NOT the data as text. The subagent must READ the JSON file and use exact values.
- **NEVER apply styles to the wrong element scope.** Table cell backgrounds go on `.data-table td`, NOT on overview page `.expense-row`. The same visual pattern (rows) may have different backgrounds in different contexts.
- **VERIFY plan assumptions with math before implementing.** If the plan says "remove padding," calculate: does removing it produce the correct element width? If 298px sidebar − 282px buttons = 16px, the 8px/side padding is correct.
- **EVERY interactive tab must have content.** A tab with no panel content is worse than no tab at all. If a Reimbursements tab exists, it MUST show filtered data when clicked.
- **SVG icons must be extracted verbatim.** NEVER substitute feather/lucide/heroicons for real SVGs. The extracted `outerHTML` IS the icon.
- **NEVER fabricate dropdown options.** If the extraction JSON doesn't list
  specific options for a dropdown (e.g., "Economy, Business, First Class"), do NOT
  invent them. Build the dropdown in its default closed state with only the
  default value visible. Fabricated options are worse than a closed dropdown —
  they tell the user the clone is fake.
- **NEVER fabricate form field options that weren't in the extraction.** If the
  Travel page extraction shows "Round trip" as the only visible radio option, build
  ONLY "Round trip". Do not add "One way" or "Multi-city" unless they appear in
  the extraction JSON.
- **Form field placeholders must be verbatim.** If the extraction shows
  `placeholder: "Search airports"`, use exactly that string. Do not paraphrase
  to "Enter departure city" or any other approximation.
- **NEVER fabricate navigation UI.** No "See all" links, no "X of Y items showing"
  counters, no pagination buttons unless they appear in the extraction JSON. If
  the extraction has carousel arrows, use the extracted arrow styling — don't
  invent your own. Fabricated navigation is the clearest sign a clone is fake.
- **Use exact image dimensions from extraction rect.** Every image in the
  extraction has a `rect` with `w` and `h` from `getBoundingClientRect()`. Use
  these exact values for `width` and `height` in CSS. Never invent card sizes
  like `182×173px` — use the extracted dimensions.
- **Search bar and hero dimensions must come from extraction.** Never hardcode
  `min-width: 700px` or `height: 64px` for search bars. Read the actual
  `getBoundingClientRect()` values from the extraction JSON. If the extraction
  has CSS custom properties for search dimensions (e.g., `--compact-search-width`),
  use those.
- **Use extracted CSS custom properties for design tokens.** If the extraction
  JSON has a `cssCustomProperties` object, use those variable names and values
  as the foundation for `variables.css`. These are the site's actual design
  tokens — don't reinvent them from the color palette.
- **Build scroll behaviors from extraction data.** If `scrollBehaviors` data
  exists in the extraction JSON, implement the scroll-driven UI: header
  hide/show, search bar collapse, filter bar sticky transitions. Use the
  extracted scroll thresholds, transforms, and class changes.

### Step 4.5: Build Images (PROCEDURAL — follow exactly)

1. **Read** the extraction JSON
2. **Find** the `images` array
3. **For each image placement in HTML:**
   a. Match it to an extraction entry by alt text, context, or position
   b. Use the EXACT `src` URL from the extraction
   c. Set `width` and `height` from the extraction `rect.w` and `rect.h`
   d. Write: `<img src="[extracted URL]" alt="[extracted alt]" width="[w]" height="[h]">`
4. **If the URL is from a CDN** (e.g., demo-logos.ramp.com, cdn.example.com):
   embed it directly. CDN URLs are public and will load.
5. **If CORS-blocked** (image fails to load when served): use a colored placeholder
   `<div>` with matching dimensions and background-color from surrounding context.
6. **NEVER** create colored circles with initials (e.g., "BB" for Best Buy)
   when the extraction has a real image URL.

### Step 4.5.1: Build SVG Icons (PROCEDURAL — follow exactly)

1. **Read** the extraction JSON → find `svgIcons` array
2. **For each icon placement in HTML:**
   a. Identify which icon is needed (by matching parentText or instance context)
   b. Find the matching entry in `svgIcons` by parentText or content hash
   c. **Copy the FULL `outerHTML` string** from the JSON entry
   d. **Paste it directly** into the HTML — do not modify paths, viewBox, or attributes
3. **Use the `instances` array** to know where each unique SVG appears multiple times
4. **POST-CHECK**: After building all icons, count `<svg>` elements in your HTML.
   Compare to the `svgIcons` array length + `instances` count. If you have SVGs
   that don't match any extraction entry, you fabricated them. Delete and re-paste.

### Step 4.6: Handle Fonts

1. **Google Fonts** → `<link>` tag with exact font name from extraction
2. **System fonts** → no action
3. **Custom/proprietary fonts** → Find the closest Google Font match AND:
   - Add a CSS comment: `/* Original: Lausanne → Substituted: Inter */`
   - Log to the user: "Font substitution: [original] → [substitute]. The original
     font is proprietary and cannot be loaded from Google Fonts."
   - If the substitute has different metrics (x-height, letter-spacing), adjust
     `letter-spacing` and `line-height` to compensate. Note adjustments in CSS.
4. **Font weight coverage** — verify the Google Font import includes ALL weights
   found in the extraction (e.g., 400, 500, 600, 700). Missing weights cause
   the browser to synthesize bold, which looks wrong.

### Step 4.7: Build Interactions

For every interaction extracted in Phase 3, write a JavaScript handler in `main.js`.
Add `<script src="main.js"></script>` before `</body>` in every HTML file.

**Tab switching pattern:**
```js
document.querySelectorAll('[data-tab-group]').forEach(group => {
  const tabs = group.querySelectorAll('[data-tab]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('tab--active', 'travel-tab--active'));
      tab.classList.add(tab.classList.contains('travel-tab') ? 'travel-tab--active' : 'tab--active');
      const panels = group.querySelectorAll('[data-panel]');
      panels.forEach(p => p.hidden = p.dataset.panel !== tab.dataset.tab);
    });
  });
});
```

**Dropdown toggle pattern:**
```js
document.querySelectorAll('[data-dropdown-trigger]').forEach(trigger => {
  const dropdown = trigger.querySelector('.dropdown-menu');
  if (!dropdown) return;
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('dropdown--open');
  });
  document.addEventListener('click', () => dropdown.classList.remove('dropdown--open'));
});
```

**Navigation active state:**
```js
const currentPage = window.location.pathname.split('/').pop() || 'overview.html';
document.querySelectorAll('.sidebar-nav a').forEach(link => {
  const href = link.getAttribute('href');
  link.classList.toggle('nav-item--sub-active', href === currentPage);
});
```

NEVER build an interactive element as a dead `<div>` or `<button>` without a handler.
If a tab exists, it MUST switch. If a dropdown exists, it MUST open/close.

### Step 4.8: Post-Build Value Audit (MANDATORY)

After all CSS files are written, perform a value audit for each page:

1. **Read** the extraction JSON
2. **Read** the built CSS file(s) for the page
3. **Print a 10-row comparison table** covering the most critical values:

   ```
   VALUE AUDIT — [page name]
   | Element           | Property    | Extracted          | Built              | Match |
   |-------------------|-------------|--------------------|--------------------|-------|
   | Sidebar           | background  | rgb(244,243,239)   | rgb(244,243,239)   | ✓     |
   | Sidebar           | border      | 1px solid rgb(...) | 1px solid rgb(...) | ✓     |
   | Main heading      | font-size   | 28px               | 28px               | ✓     |
   | Section heading   | font-size   | 20px               | 20px               | ✓     |
   | Expense row title | font-size   | 16px               | 16px               | ✓     |
   | Right sidebar     | width       | 338px              | 338px              | ✓     |
   | CTA button        | height      | 40px               | 40px               | ✓     |
   | Nav item          | font-size   | 14px               | 14px               | ✓     |
   | Badge             | border-rad  | 781px              | 781px              | ✓     |
   | Icon size         | width/h     | 12x12              | 12x12              | ✓     |
   ```

4. **If ANY row shows ✗**: Fix the CSS value immediately. Re-print the table to confirm.
5. **Also audit SVGs**: Count SVG elements in HTML vs svgIcons in extraction.
6. **Also audit images**: Count `<img>` with real src URLs vs images in extraction.

Proceed to Phase 5 ONLY when all audits pass.

---

## Phase 5 — Verification

Verification is NOT optional. Every page in the checklist gets quantitative verification
using the `verify-*.js` scripts. These scripts produce metrics — not subjective "looks
close enough" judgments.

### Acceptance Thresholds

| Metric | Pass | Warn | Fail |
|--------|------|------|------|
| Grid color match % | >85% | 70–85% | <70% |
| Heading count diff | 0 | 1–2 | >2 |
| Interactive element diff | ≤2 | 3–5 | >5 |
| Landmark position diff | <10px | 10–25px | >25px |

WARN means: document the gap, proceed if explainable (e.g., font substitution shifts
layout by 3px). FAIL means: fix before marking verified.

### Step 5.0: Load Verification Scripts

Use Glob to find all `verify-*.js` scripts:
```
Glob: skills/dupe/scripts/verify-*.js
```

Read each script into memory. You will pass their contents to `browser_evaluate`.

Scripts available:
- `verify-structure.js` — element counts, headings, interactive inventory, text digest
- `verify-visual.js` — 16×12 color grid, landmark positions, largest elements
- `verify-annotate.js` — numbered red labels on interactive elements (for screenshots)
- `verify-annotate-cleanup.js` — removes annotations (idempotent)
- `verify-interactions.js` — testable interaction inventory with selectors + expected behavior

### Step 5.1: Serve the Clone

```bash
npx serve -l [unused-port]
```

Check that the port is free first. Don't assume 8000 is available.

### Step 5.2: Structural Comparison (per page)

For EACH page in the checklist:

1. Navigate Playwright to the **original** URL
2. Run `verify-structure.js` via `browser_evaluate` → save result as `originalStructure`
3. Run `browser_snapshot` on original → save for qualitative reference
4. Navigate Playwright to the **clone** URL
5. Run `verify-structure.js` via `browser_evaluate` → save result as `cloneStructure`
6. Run `browser_snapshot` on clone → save for qualitative reference

**Diff the results:**
- Compare `elementCounts` — flag any tag where `|original - clone| > 5`
- Compare `headings` — check count AND text match (heading hierarchy must be identical)
- Compare `interactiveInventory.length` — apply threshold from table
- Compare `textDigest` — first 20 entries should match (exact text, same order)
- Compare `ariaRoles` — every role in original should exist in clone
- Compare `navStructure` — link text and count must match
- Compare `forms` — field count and types must match

Print a structural diff summary showing PASS/WARN/FAIL for each metric.

### Step 5.3: Visual Fingerprint Comparison (per page)

For EACH page:

1. Navigate Playwright to the **original** URL
2. Run `verify-visual.js` via `browser_evaluate` → save as `originalVisual`
3. Run `browser_take_screenshot` on original
4. Navigate Playwright to the **clone** URL
5. Run `verify-visual.js` via `browser_evaluate` → save as `cloneVisual`
6. Run `browser_take_screenshot` on clone

**Compare the results:**

**Color Grid Match %:**
For each cell in the 16×12 grid, parse the RGB values from both grids. Two cells match
if each RGB channel differs by ≤30 (out of 255). Count matches / 192 total cells = match %.
Apply threshold from table.

**Landmark Position Diff:**
For each landmark in `originalVisual.landmarks`, find the matching landmark in
`cloneVisual.landmarks` by name. Compute `|original.x - clone.x|` and `|original.y - clone.y|`.
Report the max diff across all landmarks. Apply threshold from table.

**Largest Elements:**
Compare the top 5 elements by area — their tags and approximate sizes should match.
This catches major layout shifts (e.g., sidebar missing, header doubled in height).

Print a visual comparison summary with match % and landmark diffs.

### Step 5.4: Annotated Screenshot Comparison (per page)

For EACH page:

1. Navigate Playwright to the **original** URL
2. Run `verify-annotate.js` via `browser_evaluate` → save element map as `originalAnnotations`
3. Run `browser_take_screenshot` → annotated screenshot of original
4. Run `verify-annotate-cleanup.js` to remove labels
5. Navigate Playwright to the **clone** URL
6. Run `verify-annotate.js` via `browser_evaluate` → save element map as `cloneAnnotations`
7. Run `browser_take_screenshot` → annotated screenshot of clone
8. Run `verify-annotate-cleanup.js` to remove labels

**Compare element maps:**
- Match elements by `text` + `tag` combination
- Report: matched count, missing in clone (in original but not clone), extra in clone
- For matched elements, compare `rect` positions — flag any with >15px positional diff
- Reference elements by number ("Element #7 in original is missing from clone")

This gives you numbered screenshots where you can visually identify specific elements
and reference them by number in the verification report.

### Step 5.5: Interaction Testing (per page)

For EACH page:

1. Navigate Playwright to the **clone** URL
2. Run `verify-interactions.js` via `browser_evaluate` → get interaction inventory
3. For EACH testable interaction (prioritize tabs, dropdowns, accordions first):
   a. Run `browser_snapshot` BEFORE click (capture pre-state)
   b. Run `browser_click` on the element using its selector
   c. Wait 500ms for animations/transitions
   d. Run `browser_snapshot` AFTER click (capture post-state)
   e. Evaluate: did the expected behavior occur?
      - **tab:** Did a different panel become visible? Did aria-selected change?
      - **dropdown:** Did new content appear? Did aria-expanded toggle?
      - **accordion:** Did content expand/collapse?
      - **input:** Did element receive focus?
      - **checkbox/radio:** Did checked state toggle?
   f. Record PASS or FAIL with details
4. If an interaction FAILS, fix the JavaScript handler and re-test that specific element

**Priority order for fixing:**
1. Tabs that don't switch (worst — visible, expected behavior)
2. Dropdowns that don't open (core interaction pattern)
3. Navigation that doesn't navigate
4. Form elements that don't accept input
5. Buttons with no visible feedback

Fix, re-test. 2 rounds max per page.

### Step 5.6: Print Verification Report

For EACH page, print a structured report:

```
## Verification Report — [page name]

### Structural (Step 5.2)
- Heading count: original=[N] clone=[N] → PASS/WARN/FAIL
- Interactive elements: original=[N] clone=[N] → PASS/WARN/FAIL
- Text digest match: [N]/20 first entries match → PASS/WARN/FAIL
- Nav links: original=[N] clone=[N] → PASS/WARN/FAIL

### Visual (Step 5.3)
- Color grid match: [N]% → PASS/WARN/FAIL
- Landmark diffs: header=[N]px, nav=[N]px, main=[N]px → PASS/WARN/FAIL
- Top 5 elements by area: [matched]/5 → PASS/WARN/FAIL

### Annotations (Step 5.4)
- Elements: [matched] matched, [missing] missing, [extra] extra

### Interactions (Step 5.5)
- Tested: [N] interactions
- Passed: [N] | Failed: [N]
- Failed: [list element text + type for each failure]

### Overall: PASS / WARN / FAIL
```

If ANY metric is FAIL after 2 fix rounds, flag it for user review but proceed.
Don't block indefinitely on a single metric — document and move on.

### Step 5.7: Final Checklist

Print the completed checklist with verification scores:

```
## Dupe Page Checklist — COMPLETE

- Shared layout: ✓ extracted  ✓ interactions  ✓ built
- Page 1 [name]: ✓ extracted  ✓ interactions  ✓ built  ✓ verified (grid: [N]%, struct: PASS, interactions: [N]/[N])
- Page 2 [name]: ✓ extracted  ✓ interactions  ✓ built  ✓ verified (grid: [N]%, struct: PASS, interactions: [N]/[N])
- Page 3 [name]: ✓ extracted  ✓ interactions  ✓ built  ✓ verified (grid: [N]%, struct: PASS, interactions: [N]/[N])
```

---

## Error Handling

| Error | Action |
|-------|--------|
| Navigation 4xx/5xx | Tell user, suggest checking URL |
| Redirect to login | Invoke auth flow (Phase 1.2) |
| Navigation timeout (>30s) | Retry once, then warn about bot blocking |
| Extraction returns empty text | Use TreeWalker instead of textContent/innerText |
| Extraction returns 300K+ chars | Reduce depth, use targeted queries instead |
| Anti-scraping challenge | Tell user to solve manually in browser |
| Build produces syntax errors | Fix immediately, never present broken code |
| 3 failed attempts at same step | STOP and ask user for guidance |
| Port already in use | Try a different port |

---

## Token Intensity & Model Recommendation

Dupe is intentionally token-intensive. A full page extraction + build can use
50-100k+ tokens. A multi-page app: 150-300k+. This is by design — tokens are
cheap, rework is expensive. DOM extraction gets it right the first time.

**Use your strongest model.** Opus-level reasoning produces pixel-perfect results.
Cheaper models cut corners on fidelity.

Extraction results are cached to `/tmp/dupe-extraction-*.json` — iterate on the
build without re-extracting.

---

## Quick Reference

```
/dupe:dupe https://example.com          # Clone a page
/dupe:dupe https://example.com/pricing  # Clone a specific page
```

### What Dupe Extracts
- Real DOM structure via targeted queries
- All visible text via TreeWalker (works on ANY framework)
- Exact dimensions via `getBoundingClientRect()`
- Computed styles via whitelisted property list
- Typography: fonts, sizes, weights, line heights
- Color palette with usage frequency
- Interactive states: dropdowns, modals, tabs
- Images with CDN URLs

### What Dupe Does NOT Do
- Download or host proprietary fonts
- Access cross-origin iframe content
- Bypass authentication (you sign in manually)
- Defeat CAPTCHAs or anti-scraping measures
- Clone server-side functionality or APIs
- Replicate keyframe animations (CSS transitions only)
