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
> 1. **Single component** — One element (navbar, hero, pricing table, footer)
> 2. **Single page** — One complete page, static layout only
> 3. **Page with interactions** — Single page including dropdowns, modals, tabs
> 4. **Multi-page shell** — Layout + navigation across 2-3 pages
>
> The larger the scope, the more tokens and time. I recommend starting with a
> single component or page."

Then ask: **"Which areas should I focus on first?"**

Not every clone needs all interactions. A landing page doesn't need dropdown
extraction. A dashboard doesn't need photo carousels. Let the user prioritize.

### Scope → Phase Mapping

| Scope | Phases |
|-------|--------|
| Single component | 1 → simplified 2 → 4 |
| Single page | 1 → 2 → 4 |
| Page with interactions | 1 → 2 → 3 → 4 |
| Multi-page shell | 1 → 2 → 3 → 4, repeated per page |

Store the user's scope choice — reference it throughout to avoid over-extracting.

---

## Phase 1 — Navigate & Auth

### Step 1.1: Open the URL

Navigate Playwright to `$ARGUMENTS` (the URL the user provided) at **1920×1080** viewport:

```
browser_navigate → $ARGUMENTS
```

Take a snapshot for reference. This snapshot is for YOUR context only — do NOT
build from it. You build from extracted DOM data.

### Step 1.2: Handle Authentication

Pause and ask:

> "The browser is open at [URL]. If this page requires authentication, sign in
> now in the browser window. Tell me when you're ready to proceed."

Wait for user confirmation before continuing. Do NOT skip this step even if the
page appears public — some content loads differently when authenticated.

### Step 1.3: Trigger Lazy Loading

After user confirms, scroll the full page to trigger lazy-loaded content:

```js
// Scroll to bottom
window.scrollTo(0, document.body.scrollHeight);
```

Wait 2 seconds, then:

```js
// Scroll back to top
window.scrollTo(0, 0);
```

### Step 1.4: Wait for Network Idle

Check for loading indicators before proceeding:

```js
(function() {
  const indicators = document.querySelectorAll(
    '[class*="skeleton"], [class*="spinner"], [class*="loading"], ' +
    '[class*="placeholder"], [aria-busy="true"]'
  );
  const hidden = [...document.querySelectorAll('*')].filter(el => {
    const s = getComputedStyle(el);
    return s.opacity === '0' || s.visibility === 'hidden';
  });
  return {
    skeletons: indicators.length,
    hiddenElements: hidden.length,
    readyState: document.readyState
  };
})()
```

If skeletons or spinners exist, wait 3 seconds and re-check. After 2 retries,
proceed anyway and note which elements may be incomplete.

---

## Phase 2 — Unified Extraction

This is the core of Dupe. You extract structure, dimensions, and styles in a
SINGLE pass per page section. This is faster than separate passes and keeps
data co-located.

### Step 2.1: Map Page Structure (Top-Level)

First, get the high-level page structure (3 levels deep):

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
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height)
      },
      display: cs.display,
      position: cs.position,
      children: [...el.children].map(c => extract(c, depth + 1)).filter(Boolean)
    };
  }
  return extract(document.body, 0);
})()
```

From this, identify major sections: header, hero, content areas, sidebar, footer,
navigation. Name them for reference in subsequent extractions.

### Step 2.2: Extract Each Section

For EACH major section identified above, run a detailed extraction. This is the
workhorse function — it captures everything needed to rebuild.

```js
(function() {
  const STYLE_WHITELIST = [
    'display', 'position', 'width', 'height', 'maxWidth', 'minHeight',
    'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'background', 'backgroundColor', 'backgroundImage', 'backgroundSize',
    'color', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight',
    'letterSpacing', 'textAlign', 'textDecoration', 'textTransform',
    'border', 'borderRadius', 'borderColor', 'borderWidth',
    'boxShadow', 'gap', 'rowGap', 'columnGap',
    'flexDirection', 'flexWrap', 'alignItems', 'justifyContent', 'flex',
    'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow',
    'opacity', 'transform', 'transition',
    'overflowX', 'overflowY', 'zIndex',
    'top', 'left', 'right', 'bottom',
    'listStyleType', 'cursor', 'whiteSpace',
    'aspectRatio', 'objectFit'
  ];

  function extractElement(el, depth, maxDepth) {
    if (depth > maxDepth) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;

    const cs = getComputedStyle(el);
    const styles = {};
    for (const prop of STYLE_WHITELIST) {
      const val = cs[prop];
      if (val && val !== 'none' && val !== 'normal' && val !== 'auto'
          && val !== '0px' && val !== 'rgba(0, 0, 0, 0)' && val !== 'start') {
        styles[prop] = val;
      }
    }

    // Get direct text content (not from children)
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === 3) { // TEXT_NODE
        const t = node.textContent.trim();
        if (t) text += (text ? ' ' : '') + t;
      }
    }

    const result = {
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      classes: el.className && typeof el.className === 'string'
        ? el.className.split(/\s+/).filter(Boolean)
        : [],
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height)
      },
      styles: styles,
      text: text || undefined,
      children: []
    };

    // Handle specific element types
    if (el.tagName === 'IMG') {
      result.src = el.src;
      result.alt = el.alt;
    }
    if (el.tagName === 'A') {
      result.href = el.href;
    }
    if (el.tagName === 'SVG') {
      result.svg = el.outerHTML;
    }
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      result.placeholder = el.placeholder;
      result.type = el.type;
    }

    // Recurse into children
    for (const child of el.children) {
      const extracted = extractElement(child, depth + 1, maxDepth);
      if (extracted) result.children.push(extracted);
    }

    return result;
  }

  // TARGET: Replace this selector with the section's actual selector
  const section = document.querySelector('SECTION_SELECTOR_HERE');
  if (!section) return { error: 'Section not found' };
  return extractElement(section, 0, 8);
})()
```

**Replace `SECTION_SELECTOR_HERE`** with the actual CSS selector for each section.
Use the structure map from Step 2.1 to determine selectors.

Depth limit: 8 levels. If a section is extremely deep (data tables, nested lists),
increase to 12 for that section only.

### Step 2.3: Extract Images & Assets

For each `<img>` found during extraction:
- Record the `src` URL (keep original CDN URLs for now)
- Record `width`, `height`, `objectFit`, `aspectRatio`
- For background images: record the `backgroundImage` URL and `backgroundSize`

For SVGs:
- If inline: captured via `outerHTML` in extraction
- If external (`<img src="*.svg">`): note the URL

Do NOT download assets at this stage. Use original URLs in the build. The user
can replace them later.

### Step 2.4: Extract Typography

Run a dedicated typography extraction to capture the font stack:

```js
(function() {
  const fonts = new Set();
  const typeScale = [];
  const seen = new Set();

  document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,span,li,td,th,label,button,input').forEach(el => {
    const cs = getComputedStyle(el);
    fonts.add(cs.fontFamily);
    const key = `${cs.fontSize}|${cs.fontWeight}|${cs.lineHeight}|${cs.letterSpacing}`;
    if (!seen.has(key)) {
      seen.add(key);
      typeScale.push({
        tag: el.tagName.toLowerCase(),
        sample: el.textContent.trim().slice(0, 40),
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        fontFamily: cs.fontFamily,
        color: cs.color
      });
    }
  });

  return {
    fontFamilies: [...fonts],
    typeScale: typeScale.sort((a, b) =>
      parseFloat(b.fontSize) - parseFloat(a.fontSize)
    )
  };
})()
```

### Step 2.5: Extract Color Palette

```js
(function() {
  const colors = new Map();

  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    [cs.color, cs.backgroundColor, cs.borderColor].forEach(c => {
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') {
        colors.set(c, (colors.get(c) || 0) + 1);
      }
    });
  });

  return [...colors.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([color, count]) => ({ color, count }));
})()
```

### Step 2.6: Cache Extraction Results

Write ALL extraction data to a cache file so the build phase can be re-run
without re-extracting:

```bash
# Write to /tmp/dupe-extraction-{timestamp}.json
```

Use the Bash tool to write the JSON. Include:
- Page URL
- Viewport size
- Timestamp
- Structure map
- All section extractions
- Typography data
- Color palette
- Image/asset list

### Shadow DOM Handling

If extraction returns fewer elements than expected, try shadow DOM traversal:

```js
(function() {
  function extractAll(root) {
    const elements = [...root.querySelectorAll('*')];
    const shadowElements = [];
    for (const el of elements) {
      if (el.shadowRoot) {
        shadowElements.push(...extractAll(el.shadowRoot));
      }
    }
    return [...elements, ...shadowElements];
  }
  return extractAll(document).length;
})()
```

If shadow DOM elements exist, re-run section extraction with shadow DOM traversal
included.

### Cross-Origin Iframes

Cross-origin iframes CANNOT be accessed. When encountered:
- Note their presence, position, and dimensions
- Add a placeholder element with matching dimensions
- Comment in the code: `<!-- Cross-origin iframe: [src] -->`
- Do NOT attempt to circumvent cross-origin restrictions

---

## Phase 3 — Extract Interactions

**Only execute if scope is "page with interactions" or "multi-page shell".**

### Step 3.1: Identify Interactive Elements

```js
(function() {
  const interactive = [];
  document.querySelectorAll(
    'button, [role="button"], [role="tab"], [role="menuitem"], ' +
    '[data-toggle], [data-dropdown], details, [aria-haspopup], ' +
    '[aria-expanded], select, [role="combobox"], [role="listbox"]'
  ).forEach(el => {
    const rect = el.getBoundingClientRect();
    interactive.push({
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role'),
      ariaExpanded: el.getAttribute('aria-expanded'),
      ariaHaspopup: el.getAttribute('aria-haspopup'),
      text: el.textContent.trim().slice(0, 50),
      rect: { x: Math.round(rect.x), y: Math.round(rect.y),
              w: Math.round(rect.width), h: Math.round(rect.height) },
      selector: el.id ? `#${el.id}` : undefined
    });
  });
  return interactive;
})()
```

### Step 3.2: Activate Each Interaction

For each interactive element:

1. **Click it** using `browser_click`
2. **Wait 500ms** for animations
3. **Snapshot** the revealed state
4. **Extract** the revealed element (dropdown, modal, drawer, tooltip):
   - Structure + styles (same extraction function as Phase 2)
   - Trigger: what element was clicked
   - Dismissal: click outside? Escape key? Click toggle?
   - Positioning: absolute/fixed, anchor element, z-index
   - Animation: transition properties

5. **Dismiss** the revealed element before proceeding to the next one

### Step 3.3: Tab/Accordion States

For tabbed interfaces:
- Click each tab, extract each panel's content
- Note which tab is active by default
- Extract the tab indicator styling (active state, underline, background)

For accordions:
- Open each section, extract content
- Note open/closed default states

---

## Phase 4 — Build

### Step 4.1: Detect Target Framework

Check the current working directory for project configuration:

1. `package.json` → check dependencies for react, vue, svelte, next, astro
2. `tailwind.config.*` → use Tailwind utility classes
3. `src/components/` → follow existing naming conventions
4. `tsconfig.json` → use TypeScript

If no project exists, ask:
> "No project detected. Should I create:
> 1. **Standalone HTML + CSS** (most portable, no build step)
> 2. **New Next.js project** with Tailwind
> 3. **Add to a specific framework** (tell me which)"

Default to standalone HTML + CSS if the user doesn't have a preference.

### Step 4.2: Design Tokens

Create a CSS variables file from extracted data:

```css
/* variables.css — extracted from [URL] */
:root {
  /* Colors */
  --color-primary: [extracted];
  --color-secondary: [extracted];
  --color-bg: [extracted];
  --color-text: [extracted];
  --color-border: [extracted];
  /* ... top 10-15 colors from palette extraction */

  /* Typography */
  --font-primary: [extracted font-family];
  --font-secondary: [extracted font-family];
  --font-mono: [extracted if present];

  /* Spacing — derived from extracted margins/paddings */
  --space-xs: [extracted];
  --space-sm: [extracted];
  --space-md: [extracted];
  --space-lg: [extracted];
  --space-xl: [extracted];

  /* Border radius */
  --radius-sm: [extracted];
  --radius-md: [extracted];
  --radius-lg: [extracted];
}
```

Map extracted `rgba()` values to semantic names based on usage frequency and context.

### Step 4.3: Build Order

Follow this order strictly — each layer builds on the previous:

1. **Design tokens** (`variables.css`) — colors, typography, spacing
2. **Reset/base styles** — normalize, font imports, body defaults
3. **Layout shell** — the outermost structure (sidebar, main content, header)
4. **Shared components** — elements reused across sections (buttons, cards, badges)
5. **Section compositions** — each page section assembled from components
6. **Real data** — use the ACTUAL text, numbers, and labels scraped from the page
7. **Interactions** — dropdowns, modals, tabs (if scope includes them)

### Step 4.4: Build Rules

These are non-negotiable:

- **NEVER guess.** If you haven't extracted a value, go back to Phase 2 and get it.
- **NEVER approximate.** Use exact `getBoundingClientRect()` values. Don't round
  `14px` to `1rem` unless the type scale clearly shows rem-based sizing.
- **NEVER use placeholder data.** Use the real text, numbers, and labels from extraction.
  "Lorem ipsum" is a build failure.
- **ALWAYS make sticky elements opaque.** Sticky headers/columns without `background-color`
  cause content to show through. Set explicit background matching the design.
- **ALWAYS extract transitions.** Static replicas feel dead. Include `transition`
  properties on hover states, active states, and interactive elements.
- **ALWAYS include hover states.** Extract `:hover` styles for buttons, links, cards,
  table rows. A clone without hover states looks broken.
- **Build components first, then compose.** Don't build page sections monolithically.
  Identify repeated patterns (cards, list items, table rows) and build them as
  reusable components.
- **Respect the original's responsive behavior** where visible. If the extracted page
  shows flex-wrap or grid auto-fit, preserve it. Don't add responsive breakpoints
  that weren't in the original.

### Step 4.5: Handle Images

For the initial build:
- Use original CDN URLs for images (`src="https://..."`)
- If images are behind auth or CORS-blocked, use a colored placeholder `div`
  matching the image dimensions with a comment: `<!-- Image: [original-url] -->`
- For decorative SVGs: inline them from the extraction data
- For icons: use inline SVGs, not icon font classes (they won't work without the font)

### Step 4.6: Handle Fonts

Check if the extracted fonts are available:

1. **Google Fonts** — add `<link>` tag or `@import`
2. **System fonts** — no action needed
3. **Custom/proprietary fonts** — use the closest Google Font equivalent and note it:
   ```css
   /* Original: "Ramp Sans", custom font. Using "Inter" as closest match. */
   ```

Never attempt to download or host proprietary font files.

---

## Phase 4.5 — Verification

Verification is NOT optional. Every build must be checked against the original.

### Step 4.5.1: Serve the Clone

```bash
npx serve -l 8000
```

Or if the project has a dev server (`npm run dev`, `next dev`), use that.

### Step 4.5.2: Visual Comparison

1. Navigate Playwright to `http://localhost:8000` (or dev server URL)
2. Take a screenshot at 1920×1080
3. Navigate to the original URL
4. Take a screenshot at 1920×1080
5. Compare both visually

### Step 4.5.3: Identify Discrepancies

List the **top 3 most visible discrepancies** between original and clone:
- Layout misalignment
- Color differences
- Typography mismatches
- Missing elements
- Spacing issues

### Step 4.5.4: Fix and Re-verify

For each discrepancy:
1. Identify the root cause (wrong extracted value? missed element? CSS specificity?)
2. Fix it
3. Re-verify

Repeat until the top 3 discrepancies are resolved. Then check for the NEXT
top 3. Stop after 2 rounds of fixes (6 total discrepancies addressed).

---

## Error Handling

Handle failures explicitly. Do not silently skip steps.

| Error | Action |
|-------|--------|
| Navigation 4xx/5xx | Tell user, suggest checking URL or authentication |
| Redirect to login | Invoke auth flow (Phase 1, Step 1.2) |
| Navigation timeout (>30s) | Retry once. If still failing, warn about possible bot blocking |
| Extraction returns empty | Try shadow DOM traversal. If still empty, note limitation and move on |
| Anti-scraping challenge (CAPTCHA, Cloudflare) | Tell user to solve it manually in the browser window, then confirm |
| Build produces syntax errors | Fix immediately. Never present broken code to the user |
| 3 failed attempts at same step | STOP. Ask user for guidance. Do not keep retrying |
| Playwright disconnected | Tell user to restart Claude Code with the plugin loaded |

---

## Token Intensity & Model Recommendation

Dupe is intentionally token-intensive. A full page extraction + build can use
50-100k+ tokens and take 5-15 minutes depending on page complexity. This is by
design — tokens are cheap, rework is expensive. DOM extraction gets it right
the first time.

**Use your strongest model.** Dupe works best with Claude Opus or equivalent.
The extraction-to-build pipeline requires strong reasoning about layout structure,
component decomposition, and style inheritance. Cheaper models will cut corners
on fidelity. This is the one task where you want maximum intelligence.

For cost-conscious users: extraction results are cached to `/tmp/dupe-extraction-*.json`.
You can iterate on the build without re-extracting.

---

## Quick Reference

```
/dupe:dupe https://example.com          # Clone a page
/dupe:dupe https://example.com/pricing  # Clone a specific page
```

### What Dupe Extracts
- Real DOM structure (not screenshots)
- Computed styles (not stylesheet rules)
- Exact dimensions via `getBoundingClientRect()`
- Typography: fonts, sizes, weights, line heights
- Color palette with usage frequency
- Interactive states: dropdowns, modals, tabs
- Real text content, labels, and data

### What Dupe Does NOT Do
- Download or host proprietary fonts
- Access cross-origin iframe content
- Bypass authentication (you sign in manually)
- Defeat CAPTCHAs or anti-scraping measures
- Clone server-side functionality or APIs
- Replicate animations frame-by-frame (extracts CSS transitions only)
