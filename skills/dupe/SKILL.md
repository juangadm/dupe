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

Print this checklist to the user. Reference it after EVERY phase. Do NOT move
to Phase 4 (Build) until ALL pages show "extracted". This is the single most
important rule in the entire skill — without it, you will get lost in the
extraction of page 1 and never reach page 2.

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

Navigate Playwright to `$ARGUMENTS` (the URL the user provided) at **1920×1080** viewport:

```
browser_navigate → $ARGUMENTS
browser_resize → 1920×1080
```

Take a screenshot for reference. This screenshot orients YOU — do NOT build from it.

### Step 1.2: Handle Authentication

Pause and ask:

> "The browser is open at [URL]. If this page requires authentication, sign in
> now in the browser window. Tell me when you're ready to proceed."

Wait for user confirmation. Do NOT skip this even if the page appears public.

### Step 1.3: Trigger Lazy Loading

After user confirms, scroll the full page to trigger lazy-loaded content:

```js
window.scrollTo(0, document.body.scrollHeight);
```

Wait 2 seconds, then scroll back to top:

```js
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

### CRITICAL: Multi-page extraction order

For multi-page scope:

1. Extract shared layout FIRST (sidebar, header, banner) — only once
2. Extract page-specific content for the CURRENT page
3. Navigate to the NEXT page in the checklist
4. Repeat step 2 for each page
5. Only after ALL pages are extracted → move to Phase 4

**Check the page checklist after each page extraction.** If any page shows
"not extracted", you are NOT done with Phase 2.

### Step 2.0: Load Extraction Scripts

Find and read the pre-built extraction scripts:

1. **Glob** for `**/scripts/extract-structure.js` and `**/scripts/extract-visual.js`
2. **Read** both files into memory — these are the scripts you'll pass to `browser_evaluate`
3. Also Glob for `**/scripts/extract-hover.js` — you'll need this for hover states later

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

This single call returns `{ sidebar, buttons, tables, images, svgIcons, progressBars, statusIndicators, typography }`:

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
- **svgIcons** — all `<svg>` with outerHTML (capped at 2000 chars), rect,
  parentSelector, parentText. NEVER substitute icon libraries for extracted SVGs.
- **progressBars** — progress/meter/budget bar elements with value, max, styles
  (backgroundColor, borderRadius, height, width), parent styles, nearby text
- **statusIndicators** — badges, chips, dots, tags with text, styles (colors,
  border, fontSize, padding), SVG content if present, ::before pseudo-element
  data (content, backgroundColor, dimensions, borderRadius)
- **typography** — fontFamilies, typeScale (top 15 by size), colorPalette (top 20
  by frequency)

**After the two static calls, you MUST also:**
1. Click each tab → extract the revealed panel content
2. Scroll each table to its rightmost column → extract ALL column headers and widths
3. Open each dropdown → extract all options
4. For forms that change per tab: extract form fields for EACH tab state

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
**Write tool** (NOT Bash, NOT Python). The Write tool creates the file silently
with a clean one-line permission prompt. Never generate inline Python or shell
scripts to write JSON — it creates a terrible user experience.

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

### Step 2.6: CHECKPOINT — Review the Page Checklist

Print the page checklist. Mark the current page as "extracted". If there are
unextracted pages remaining:

1. Navigate Playwright to the next page URL
2. Wait for load + lazy content
3. Re-run Steps 2.1–2.3 for the NEW page's content (skip shared layout)
4. Cache the new extraction data
5. Return to this checkpoint

**Do NOT proceed to Phase 4 until every page in the checklist is extracted.**

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

### HARD CHECKPOINT

Before writing a single line of code, verify:

> "I have extraction data AND interaction data for ALL pages in my checklist:
> - Shared layout: ✓ structure ✓ interactions
> - Page 1: ✓ structure ✓ interactions
> - Page 2: ✓ structure ✓ interactions
> - Page 3: ✓ structure ✓ interactions
>
> Proceeding to build."

If any page is missing, go back to Phase 2. Do NOT build partial clones.

### Step 4.1: Extraction-Build Reconciliation

Before writing ANY code, reconcile extraction data against the build plan:

For EACH page to build:
1. Read the extraction JSON file
2. For each interactive element in `contentInventory`:
   - Is there extraction data for it? (If no → go back to Phase 2)
   - Does the build plan include it? (If no → add it)
3. For each CSS value you plan to use:
   - Can you trace it back to the extraction JSON? (If no → extract it first)
4. NEVER build a value from memory or approximation.
   If you don't have the number, you don't write the CSS.

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

### Step 4.5: Handle Images

- Use original CDN URLs for images
- If CORS-blocked: colored placeholder `div` with matching dimensions
- Inline SVGs from extraction data (not icon fonts)

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

---

## Phase 5 — Verification

Verification is NOT optional. Check EVERY page in the checklist.

### Step 5.1: Serve the Clone

```bash
npx serve -l [unused-port]
```

Check that the port is free first. Don't assume 8000 is available.

### Step 5.2: Visual Comparison (per page)

For EACH page in the checklist:

1. Navigate Playwright to the clone's page
2. Take a screenshot at 1920×1080
3. Navigate to the original URL for that page
4. Take a screenshot at 1920×1080
5. Compare visually

### Step 5.3: Systematic Verification (not spot-checking)

Priority order:

1. **FUNCTIONAL:** Every interactive element works (tabs switch, dropdowns open,
   nav navigates, forms accept input). Test ALL of them, not just 2-3.
2. **COMPLETENESS:** Every tab has content. Every table has all columns. Every
   form variant is built. Click through everything.
3. **VISUAL:** Font sizes, weights, colors, spacing match extraction data.
   Check at least 10 values per page against the extraction JSON.
4. **SCROLL STATE:** For every page with tables or horizontally scrollable content:
   - Scroll the table right → verify sticky columns have opaque backgrounds
   - Scroll the page down → verify fixed/sticky headers remain visible
   - If sticky columns are transparent (content shows through), add explicit
     `background-color` from the extraction data and re-verify.

For each page, identify and fix discrepancies in priority order. Fix functional
issues first (broken interactions are worse than wrong spacing). Then completeness.
Then visual fidelity. Fix, re-screenshot, compare. 2 rounds max per page.

### Step 5.3.5: Test Interactions via Playwright

For each page, use `browser_click` to test every interactive element:
- Tabs must switch (active class changes on click)
- Dropdowns must open/close
- Navigation links must navigate to the correct page
- Form elements must be interactive

If any interaction is dead, fix it before marking the page as verified.

### Step 5.4: Final Checklist

Print the completed checklist:

```
## Dupe Page Checklist — COMPLETE
- Shared layout: ✓ extracted  ✓ interactions  ✓ built
- Page 1 [name]: ✓ extracted  ✓ interactions  ✓ built  ✓ verified
- Page 2 [name]: ✓ extracted  ✓ interactions  ✓ built  ✓ verified
- Page 3 [name]: ✓ extracted  ✓ interactions  ✓ built  ✓ verified
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
