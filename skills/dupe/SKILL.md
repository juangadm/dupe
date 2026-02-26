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

This is the core of Dupe. The extraction strategy uses **three complementary
methods**, not one recursive DOM walker:

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

### Step 2.1: Shallow Structure Map

Get the high-level page structure (3 levels deep):

```js
(function() {
  function extract(el, depth) {
    if (depth > 3) return null;
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (rect.width === 0 && rect.height === 0) return null;
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      classes: el.className && typeof el.className === 'string'
        ? el.className.split(/\s+/).filter(Boolean).slice(0, 5)
        : [],
      rect: { x: Math.round(rect.x), y: Math.round(rect.y),
              w: Math.round(rect.width), h: Math.round(rect.height) },
      display: cs.display,
      position: cs.position,
      margin: cs.margin, padding: cs.padding,
      gap: cs.gap, rowGap: cs.rowGap, columnGap: cs.columnGap,
      transition: cs.transition !== 'all 0s ease 0s' ? cs.transition : undefined,
      childCount: el.children.length,
      children: [...el.children].map(c => extract(c, depth + 1)).filter(Boolean)
    };
  }
  return extract(document.body, 0);
})()
```

From this, identify: sidebar, header/banner, main content area, right sidebar,
footer. Note their CSS selectors and layout properties (flex, grid, dimensions).

**Box model values** (`margin`, `padding`, `gap`) are critical —
`getBoundingClientRect()` gives size and position but not internal spacing.
Without these, the build agent will guess padding values and get them wrong.

**Transition values** must be extracted here. If `transition` is non-default
(anything other than `all 0s ease 0s`), include it. Static replicas without
transitions feel dead — you can't add what you didn't extract.

### Step 2.1.5: Content Inventory

Before targeted extraction, inventory ALL interactive containers on the page:

```js
(function() {
  const inventory = {
    tabGroups: [...document.querySelectorAll('[role="tablist"], [data-tab-group]')].map(g => ({
      tabCount: g.querySelectorAll('[role="tab"], [data-tab]').length,
      labels: [...g.querySelectorAll('[role="tab"], [data-tab]')].map(t => t.textContent.trim())
    })),
    hiddenPanels: document.querySelectorAll('[hidden], [aria-hidden="true"], [style*="display: none"]').length,
    dropdowns: [...document.querySelectorAll('[data-dropdown], [aria-haspopup], select')].map(d => ({
      text: d.textContent.trim().slice(0, 30),
      optionCount: d.querySelectorAll('option, [role="option"], li').length
    })),
    forms: document.querySelectorAll('form, [role="form"]').length,
    scrollableRegions: [...document.querySelectorAll('[style*="overflow"], table')].length
  };
  return inventory;
})()
```

Log these in the extraction JSON under `contentInventory`. Mark each as "extracted"
or "pending". Phase 2 is NOT done until all items are extracted.

For each tab group: click EVERY tab and extract the revealed panel content.
For each table: scroll to the rightmost column and extract ALL column headers.
For each dropdown: open it and extract all options.
For forms that change per tab: extract form fields for EACH tab state.

### Step 2.2: Targeted Element Extraction

For each major section, use TARGETED queries — not a deep recursive walk.
Extract the actual elements you care about.

**After extracting visible content, you MUST also:**
1. Click each tab → extract the revealed panel content
2. Scroll each table to its rightmost column → extract ALL column headers and widths
3. Open each dropdown → extract all options
4. For forms that change per tab: extract form fields for EACH tab state

**Navigation / sidebar items:**
```js
(function() {
  const sidebar = document.querySelector('aside, nav, [class*="sidebar"], [class*="Sidebar"]');
  if (!sidebar) return { error: 'No sidebar found' };
  const items = [];
  sidebar.querySelectorAll('a, button, [role="button"]').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const cs = getComputedStyle(el);
    const svg = el.querySelector('svg');
    items.push({
      tag: el.tagName.toLowerCase(),
      href: el.href || undefined,
      innerText: el.innerText.trim().split('\n')[0],
      rect: { x: Math.round(rect.x), y: Math.round(rect.y),
              w: Math.round(rect.width), h: Math.round(rect.height) },
      styles: {
        color: cs.color, backgroundColor: cs.backgroundColor,
        fontSize: cs.fontSize, fontWeight: cs.fontWeight,
        fontFamily: cs.fontFamily, padding: cs.padding,
        borderRadius: cs.borderRadius, gap: cs.gap,
        display: cs.display, alignItems: cs.alignItems
      },
      svg: svg ? svg.outerHTML.slice(0, 1500) : undefined,
      isActive: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
                cs.fontWeight === '600' || cs.fontWeight === '700'
    });
  });
  return { containerRect: sidebar.getBoundingClientRect(), items };
})()
```

**Buttons and CTAs** (filter by position/region):
```js
(function() {
  return [...document.querySelectorAll('a[role="button"], button')]
    .filter(el => el.getBoundingClientRect().width > 80)
    .map(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        text: el.innerText.trim(),
        rect: { x: Math.round(r.x), y: Math.round(r.y),
                w: Math.round(r.width), h: Math.round(r.height) },
        backgroundColor: cs.backgroundColor, color: cs.color,
        border: cs.border, borderRadius: cs.borderRadius,
        fontSize: cs.fontSize, fontWeight: cs.fontWeight,
        padding: cs.padding, href: el.href || undefined
      };
    });
})()
```

**Hover states:** For each interactive element (buttons, links, nav items, cards),
use Playwright to hover and extract the changed computed styles. Hover states are
pseudo-classes that only activate on mouse interaction — `getComputedStyle()` on a
static page will NEVER capture them:

```
// For each interactive selector:
browser_hover → [selector]
browser_evaluate →
(function() {
  const el = document.querySelector('[selector]');
  const cs = getComputedStyle(el);
  return {
    backgroundColor: cs.backgroundColor, color: cs.color,
    textDecoration: cs.textDecoration, borderColor: cs.borderColor,
    boxShadow: cs.boxShadow, opacity: cs.opacity,
    outline: cs.outline
  };
})()
```

Include hover data in the extraction JSON under a `hoverStates` key, keyed by
element selector or description.

**Tables:** For every `<table>`, extract: `display`, `tableLayout`, `borderCollapse`.
For each `<th>` and `<td>`: `backgroundColor`, `padding`, `borderBottom`, `fontSize`,
`fontWeight`, `position`, `left`, `right`, `zIndex`, `width`. Document which columns
are sticky and their offset values. Tables are commonly missed because they aren't
covered by the targeted queries above:

```js
(function() {
  return [...document.querySelectorAll('table')].map(table => {
    const cs = getComputedStyle(table);
    const headers = [...table.querySelectorAll('th')].map(th => {
      const thCs = getComputedStyle(th);
      return {
        text: th.textContent.trim(),
        backgroundColor: thCs.backgroundColor, padding: thCs.padding,
        fontSize: thCs.fontSize, fontWeight: thCs.fontWeight,
        position: thCs.position, left: thCs.left, right: thCs.right,
        zIndex: thCs.zIndex, width: thCs.width, borderBottom: thCs.borderBottom
      };
    });
    const firstRow = table.querySelector('tbody tr');
    const cells = firstRow ? [...firstRow.querySelectorAll('td')].map(td => {
      const tdCs = getComputedStyle(td);
      return {
        backgroundColor: tdCs.backgroundColor, padding: tdCs.padding,
        fontSize: tdCs.fontSize, fontWeight: tdCs.fontWeight,
        position: tdCs.position, left: tdCs.left, right: tdCs.right,
        zIndex: tdCs.zIndex, width: tdCs.width, borderBottom: tdCs.borderBottom
      };
    }) : [];
    return {
      display: cs.display, tableLayout: cs.tableLayout,
      borderCollapse: cs.borderCollapse,
      headers, sampleCells: cells
    };
  });
})()
```

### Step 2.3: TreeWalker Text Extraction (THE PRIMARY METHOD)

This is the most important extraction step. It finds ALL visible text nodes
with their exact position, parent tag, and computed styles. It works on ANY
framework — React, Vue, Svelte, vanilla — because it reads the rendered DOM,
not the component tree.

Run this per page region. Replace the coordinate bounds for each section:

```js
(function() {
  // ADJUST THESE BOUNDS for each page region
  const BOUNDS = { xMin: 0, xMax: 1920, yMin: 0, yMax: 5000 };
  const items = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (r.x >= BOUNDS.xMin && r.x <= BOUNDS.xMax &&
          r.y >= BOUNDS.yMin && r.y <= BOUNDS.yMax && r.width > 0) {
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_REJECT;
    }
  });

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const range = document.createRange();
    range.selectNodeContents(node);
    const r = range.getBoundingClientRect();
    const parent = node.parentElement;
    const cs = parent ? getComputedStyle(parent) : null;
    items.push({
      text: node.textContent.trim(),
      rect: { x: Math.round(r.x), y: Math.round(r.y),
              w: Math.round(r.width), h: Math.round(r.height) },
      parentTag: parent?.tagName?.toLowerCase(),
      fontSize: cs?.fontSize, fontWeight: cs?.fontWeight,
      color: cs?.color, lineHeight: cs?.lineHeight,
      letterSpacing: cs?.letterSpacing
    });
  }
  return items;
})()
```

**Why this works where `textContent`/`innerText` fail:** Styled-components,
CSS-in-JS, and similar frameworks generate deeply nested wrapper `<div>` elements.
A React `<a>` tag might contain 8 nested divs before reaching the actual text node.
`element.textContent` traverses down but often returns empty on the `<a>` itself
because the content is in child elements the browser treats differently.
TreeWalker goes directly to the text nodes — no wrapper noise.

### Step 2.4: Images and Assets

```js
(function() {
  return [...document.querySelectorAll('img')].filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 5 && r.height > 5;
  }).map(el => ({
    src: el.src, alt: el.alt,
    rect: { x: Math.round(el.getBoundingClientRect().x),
            y: Math.round(el.getBoundingClientRect().y),
            w: Math.round(el.getBoundingClientRect().width),
            h: Math.round(el.getBoundingClientRect().height) },
    borderRadius: getComputedStyle(el).borderRadius
  }));
})()
```

### Step 2.4.5: SVG Icon Extraction

For every `<svg>` element on the page, extract the full markup:

```js
(function() {
  return [...document.querySelectorAll('svg')].filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }).map(el => {
    const r = el.getBoundingClientRect();
    const parent = el.closest('a, button, [role="button"], li, div');
    return {
      outerHTML: el.outerHTML.slice(0, 2000),
      rect: { x: Math.round(r.x), y: Math.round(r.y),
              w: Math.round(r.width), h: Math.round(r.height) },
      parentSelector: parent ? (parent.className || parent.tagName) : 'unknown',
      parentText: parent ? parent.textContent.trim().slice(0, 50) : ''
    };
  });
})()
```

Store in extraction JSON under `svgIcons` keyed by parent selector or description.
NEVER substitute feather/lucide/heroicons for extracted SVGs. The actual SVG markup
IS the icon — there is no approximation.

### Step 2.5: Typography + Color Palette

Run these once per site (not per page):

```js
(function() {
  const fonts = new Set();
  const typeScale = [];
  const seen = new Set();
  document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,span,li,td,th,label,button,input').forEach(el => {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    fonts.add(cs.fontFamily);
    const key = cs.fontSize + '|' + cs.fontWeight + '|' + cs.lineHeight;
    if (!seen.has(key)) {
      seen.add(key);
      typeScale.push({
        tag: el.tagName.toLowerCase(),
        sample: el.textContent.trim().slice(0, 40),
        fontSize: cs.fontSize, fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing,
        fontFamily: cs.fontFamily, color: cs.color
      });
    }
  });

  const colors = new Map();
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    [cs.color, cs.backgroundColor, cs.borderColor].forEach(c => {
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent')
        colors.set(c, (colors.get(c) || 0) + 1);
    });
  });

  return {
    fontFamilies: [...fonts],
    typeScale: typeScale.sort((a, b) => parseFloat(b.fontSize) - parseFloat(a.fontSize)).slice(0, 15),
    colorPalette: [...colors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([color, count]) => ({ color, count }))
  };
})()
```

### Step 2.6: Cache Extraction Results

Write ALL extraction data to `/tmp/dupe-extraction-{domain}.json` using the
Bash tool. Include: URL, viewport, timestamp, structure map, all targeted
extractions, all TreeWalker scans, typography, colors, images.

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

If ANY check fails: go back and extract the missing data. Do NOT proceed to Phase 4.

### Step 2.7: Extract URL Sitemap

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

### Step 2.8: CHECKPOINT — Review the Page Checklist

Print the page checklist. Mark the current page as "extracted". If there are
unextracted pages remaining:

1. Navigate Playwright to the next page URL
2. Wait for load + lazy content
3. Re-run Steps 2.2–2.4 for the NEW page's content (skip shared layout)
4. Cache the new extraction data
5. Return to this checkpoint

**Do NOT proceed to Phase 4 until every page in the checklist is extracted.**

---

## Phase 3 — Extract Interactions

Execute for every page in scope — interactions are not optional.

### Step 3.1: Identify Interactive Elements

```js
(function() {
  return [...document.querySelectorAll(
    'button, [role="button"], [role="tab"], [role="menuitem"], ' +
    '[data-toggle], [data-dropdown], details, [aria-haspopup], ' +
    '[aria-expanded], select, [role="combobox"], [role="listbox"]'
  )].filter(el => el.getBoundingClientRect().width > 0).map(el => ({
    tag: el.tagName.toLowerCase(),
    role: el.getAttribute('role'),
    ariaExpanded: el.getAttribute('aria-expanded'),
    text: el.innerText.trim().slice(0, 50),
    rect: el.getBoundingClientRect(),
    selector: el.id ? '#' + el.id : undefined
  }));
})()
```

### Step 3.2: Activate and Extract Each Interaction

For each interactive element:

1. **Click it** using `browser_click`
2. **Wait 500ms** for animations
3. **Snapshot** the revealed state
4. **Extract** the revealed element using TreeWalker on the new region
5. Note: trigger, dismissal method, positioning, z-index, transition
6. **Dismiss** before proceeding to the next

### Step 3.3: Tab/Accordion States

For tabs: click each tab, extract each panel. Note active default + indicator styling.
For accordions: open each section, extract content. Note default open/closed.

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

### Step 4.5: Handle Images

- Use original CDN URLs for images
- If CORS-blocked: colored placeholder `div` with matching dimensions
- Inline SVGs from extraction data (not icon fonts)

### Step 4.6: Handle Fonts

1. **Google Fonts** → `<link>` tag
2. **System fonts** → no action
3. **Custom/proprietary** → closest Google Font + comment noting the substitution

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
