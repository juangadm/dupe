---
name: dupe
description: >
  Clone a live website into your project with pixel-perfect fidelity using DOM
  extraction. Trigger when user wants to replicate, clone, or dupe a website URL.
  Invoke with: /dupe:dupe <url>
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, Agent
---

# Dupe — Orchestrator

You are the orchestrator for a pixel-perfect website cloning pipeline. You run
Phases 0–1 inline (scope + navigation), then delegate Phases 2–3, 4, and 5 to
subagents via the Agent tool. Each subagent gets a fresh context window.

**Single page first.** Always clone ONE page + shared layout (sidebar/nav) first.
Get it pixel-perfect and verified before adding more pages. Multi-page clones
spread extraction thin, rush the build, and produce mediocre results. One great
page is worth more than three bad ones. Additional pages are added incrementally
via follow-up commands after the first page passes verification.

**Why subagents?** Even a single-page clone produces 50-100KB+ of extraction data.
Subagents isolate each phase with a fresh context window so extraction data doesn't
crowd out build or verification reasoning.

---

## ABSOLUTE RULE: No Inline Scripts via Bash

**NEVER use `python3 -c`, `node -e`, `cat | python3`, heredoc scripts (`cat << 'EOF' > /tmp/script.mjs`, `cat << 'EOF' | python3`), or any inline script in Bash.**
They are banned entirely — no exceptions. Writing a script to a temp file and
running it IS an inline script. Piping a heredoc to an interpreter IS an inline script.

**The only acceptable Bash commands are:**
- `npm create vite@latest` (scaffold project)
- `npm install`, `npm install react-router-dom` (install dependencies)
- `npx vite --port [port]` (serve the clone via Vite dev server)
- `npx serve -l [port]` (serve the clone — fallback for static assets)
- `rm` (delete Vite boilerplate files during scaffold cleanup)
- `ls`, `mkdir`, `cp`, `wc` (file management)
- `git` commands (if committing)

---

## Preflight Check

Before ANY phase, run all 6 checks. If any fails, STOP and report.

1. **Playwright tools** — Use `ToolSearch` to find: `browser_navigate`, `browser_evaluate`, `browser_snapshot`. If ANY tool is missing:
   > "Playwright MCP isn't connected. Run `npx @playwright/mcp@latest` to verify it works, then restart Claude Code with the plugin loaded."

2. **Browser launch** — Run `browser_navigate` to `about:blank`. If this fails, the browser isn't starting — STOP and report the error.

3. **Writable /tmp/** — Run `ls /tmp/` to verify the temp directory is accessible. If it fails, STOP: "/tmp/ is not writable."

4. **Previous run check** — Check if `/tmp/dupe-progress-{domain}.json` already exists from a previous run. If it does, ask the user:
   > "Found progress from a previous run ({currentPhase} phase, {N} retries). Continue from where it left off, or start fresh?"
   - **Continue**: Read the progress file and resume from `currentPhase`
   - **Start fresh**: Delete all `/tmp/dupe-*-{domain}.*` files and proceed normally

5. **Scripts directory** — Glob for `**/scripts/extract-structure.js`. If not found, STOP: "Extraction scripts not found."

6. **Print preflight summary:**
```
PREFLIGHT PASSED:
- Playwright: OK (3 tools loaded)
- Browser: OK (about:blank loaded)
- /tmp/: OK (writable)
- Previous run: [none | resuming from {phase} | starting fresh]
- Scripts: OK ({path})
```

---

## Phase 0 — Scope Definition (MANDATORY, inline)

Before navigating to any URL, ask the user:

> "Which page do you want to clone? I'll clone this one page + the shared layout
> (sidebar, nav, header) with full interaction fidelity. Once it's verified, you
> can add more pages incrementally.
>
> What's the page URL or name?"

**Multi-page is NOT supported.** Clone one page at a time. If the user asks for
multiple pages, respond:

> "Dupe clones one page at a time for maximum fidelity. Which page should I start with?"

### After the user answers, write the PAGE CHECKLIST:

```
## Dupe Page Checklist
- Scope: Single page + shared layout
- Shared layout: [ ] extracted  [ ] interactions
- Page [name/URL]: [ ] extracted  [ ] interactions  [ ] built  [ ] verified
```

Print this checklist to the user.

### Interaction Depth Matrix

Define depth for the page BEFORE extraction begins:

| Page | Content Depth | Interaction Depth | Notes |
|------|--------------|-------------------|-------|
| [page name] | scroll full page | Depth 2 | Every tab, dropdown, form variant |

**Content Depth:** "visible only", "scroll full page", "scroll table fully"
**Interaction Depth:** Depth 0 (static), Depth 1 (click each), Depth 2 (all variants), Depth 3 (multi-step chains)

**Default for single-page clones: Depth 2 + scroll full page.** Since we're only
extracting one page, we can afford maximum depth on every interaction.

### Initialize Progress File

Write progress tracking to `/tmp/dupe-progress-{domain}.json`:

```json
{
  "domain": "{domain}",
  "url": "{url}",
  "startedAt": "{ISO 8601 timestamp}",
  "currentPhase": "scope",
  "phases": {
    "scope": { "status": "complete" },
    "navigate": { "status": "pending" },
    "extract": { "status": "pending", "pages": {} },
    "build": { "status": "pending", "filesWritten": [] },
    "verify": { "status": "pending" }
  },
  "gates": {
    "gate1": { "passed": false },
    "gate2": { "passed": false },
    "gate3": { "passed": false },
    "gate4": { "passed": false }
  },
  "retries": {
    "extract": 0,
    "build": 0,
    "verify": 0
  }
}
```

Update `phases.scope.status = "complete"` immediately since scope is done.

### Resolve Scripts Path

Find the absolute path to the extraction/verification scripts:

```
Glob: **/scripts/extract-structure.js
```

Store the resolved directory path. Subagents will use this to find scripts.

### Write Scope File

Parse the domain from the URL: `{domain}` = hostname without `www.` prefix.

Write scope to `/tmp/dupe-scope-{domain}.json`:

```json
{
  "domain": "{domain}",
  "url": "{url}",
  "scriptsDirectory": "{resolved_scripts_path}",
  "extractionJson": "/tmp/dupe-extraction-{domain}.json",
  "outputDirectory": "/tmp/dupe-test-{domain}/",
  "progressFile": "/tmp/dupe-progress-{domain}.json",
  "pages": [
    { "name": "{name}", "urlPath": "{url_path}", "interactionDepth": 2, "contentDepth": "scroll full page", "notes": "" }
  ]
}
```

**Why JSON?** Models are less likely to corrupt structured JSON than free-form
Markdown. The scope file is the single source of truth for every subagent —
structural integrity matters.

---

## Phase 1 — Navigate & Auth (inline)

### Step 1.1: Open the URL

Navigate Playwright to `$ARGUMENTS` (the URL the user provided):

```
browser_navigate → $ARGUMENTS
```

**Do NOT resize the viewport.** Use whatever size the browser opens at.

Take a screenshot for reference. This screenshot orients YOU — do NOT build from it.

### Step 1.2: Handle Authentication

Pause and ask:

> "The browser is open at [URL]. If this page requires authentication, sign in
> now in the browser window. Tell me when you're ready to proceed."

Wait for user confirmation.

### Step 1.3: Trigger Lazy Loading (Incremental Scroll)

1. **Glob** for `**/scripts/extract-scroll-to-bottom.js`
2. **Read** the script
3. **Execute** via `browser_evaluate`

The script returns `{ iterations, initialHeight, finalHeight, stable, grew }`.
Log: "Scroll: {iterations} iterations, {initialHeight}px → {finalHeight}px"

If script not found, fall back to:
```js
window.scrollTo(0, document.body.scrollHeight);
// wait 2 seconds
window.scrollTo(0, 0);
```

### Step 1.4: Wait for Network Idle

Check for loading indicators via `browser_evaluate`. If skeletons exist, wait 3
seconds and re-check. After 2 retries, proceed.

---

## GATE 1: Pre-Extraction Check

Take a screenshot to confirm the page loaded correctly. If the page shows an error,
auth wall, or CAPTCHA, handle it before proceeding.

**Content check:** Run `browser_evaluate(() => document.title)` — verify the title
is not blank, not "Error", not "404", and not a generic browser error page. A blank
or error title means the page didn't load correctly.

**Update progress file:**
- Set `phases.navigate.status = "complete"`
- Set `currentPhase = "extract"`
- Set `gates.gate1.passed = true`

---

## Subagent 1: Extraction (Phases 2–3)

Delegate extraction to a subagent with a fresh context window.

1. **Glob** for `**/phases/extract.md`
2. **Read** the phase file
3. Construct the subagent prompt:

```
Domain: {domain}
Scope file: /tmp/dupe-scope-{domain}.json
Progress file: /tmp/dupe-progress-{domain}.json
Scripts directory: {resolved_scripts_path}
Extraction JSON: /tmp/dupe-extraction-{domain}.json
Original URL: {url}

Read the scope file (JSON) first to understand pages, interaction depth, and file paths.
Read the progress file to check which pages are already complete — skip them.
Then follow the instructions below to extract all pages.

---

{contents of phases/extract.md}
```

4. Invoke Agent tool:
   - `subagent_type`: `general-purpose`
   - `description`: `Extract DOM data from {domain}`

Wait for the subagent to complete.

---

## GATE 2: Extraction Validation

Lightweight checks — never read the full extraction JSON into main context.

1. `ls -la /tmp/dupe-extraction-{domain}.json` — exists?
2. `wc -c < /tmp/dupe-extraction-{domain}.json` — size > 20KB?
3. **Read** first 50 lines of the extraction JSON — top-level keys present?
   Check that the page count matches scope.
4. **Content integrity:** For each page name in scope, verify it appears in the
   first 50 lines of the JSON. Verify the first page has non-null `structure`
   and `textNodes` keys — a file full of nulls passes size checks but is useless.
5. **Asset arrays:** Read lines containing `svgIcons` and `images` in the extraction
   JSON. Verify both keys exist. If the site has visible UI (not a text-only page),
   `svgIcons` should have > 0 entries. If `svgIcons` is empty or missing, WARN:
   "No SVG icons extracted — visual fidelity will be degraded. Consider re-running extraction."
6. **Size sanity:** If extraction JSON is < 20KB for a single page, WARN:
   "Extraction is unusually small. Verify svgIcons and images arrays."

**If validation fails:**
- Update progress: `phases.extract.lastError = "[error details]"`, increment `retries.extract`
- Read `retries.extract` from progress file — if >= 3, STOP and report to user
- Otherwise retry the extraction subagent with error details appended to the prompt

**If validation passes:** Update progress file:
- Set `phases.extract.status = "complete"`, `currentPhase = "build"`, `gates.gate2.passed = true`

Print:
```
GATE 2 PASSED:
- Extraction file: /tmp/dupe-extraction-{domain}.json
- File size: [N]KB
- Pages found: [list]
- SVG icons: [N] unique
- Images: [N]
```

---

## Subagent 2: Build (Phase 4)

Delegate the build to a subagent with a fresh context window.

1. **Glob** for `**/phases/build.md`
2. **Read** the phase file
3. Construct the subagent prompt:

```
Domain: {domain}
Scope file: /tmp/dupe-scope-{domain}.json
Progress file: /tmp/dupe-progress-{domain}.json
Scripts directory: {resolved_scripts_path}
Extraction JSON: /tmp/dupe-extraction-{domain}.json
Output directory: /tmp/dupe-test-{domain}/
Original URL: {url}

Read the scope file (JSON) first to understand pages and file paths.
Read the progress file to verify extraction is complete before building.
Then read the extraction JSON and follow the instructions below to build the clone.

---

{contents of phases/build.md}
```

4. Invoke Agent tool:
   - `subagent_type`: `general-purpose`
   - `description`: `Build clone for {domain}`

Wait for the subagent to complete.

---

## GATE 3: Build Validation

1. `ls /tmp/dupe-test-{domain}/` — directory exists?
2. `package.json` exists in the output directory?
3. Count `.tsx` files in `src/pages/` — matches page count from scope?
4. `src/App.tsx` exists and is > 500 bytes?
5. `src/main.tsx` exists?
6. Read `src/App.tsx` — verify it imports `react-router-dom`
7. Read `index.html` — verify it contains `<div id="root">`
8. Check for CSS files — total CSS size > 5KB?
9. Run `git log --oneline` in the output directory — verify checkpoint commits exist

**If validation fails:**
- Update progress: `phases.build.lastError = "[error details]"`, increment `retries.build`
- Read `retries.build` from progress file — if >= 3, STOP and report to user
- Otherwise retry the build subagent with: "Check `git log --oneline` in the output directory and continue from the last checkpoint. Error: [details]"

**If validation passes:** Update progress file:
- Set `phases.build.status = "complete"`, `currentPhase = "verify"`, `gates.gate3.passed = true`

Print:
```
GATE 3 PASSED:
- Output directory: /tmp/dupe-test-{domain}/
- Framework: Vite + React + TypeScript
- Page components: [list .tsx files in src/pages/]
- CSS size: [N]KB
- Router: react-router-dom confirmed in App.tsx
```

---

## Subagent 3: Verify (Phase 5)

Delegate verification to a subagent with a fresh context window.

1. **Glob** for `**/phases/verify.md`
2. **Read** the phase file
3. Construct the subagent prompt:

```
Domain: {domain}
Scope file: /tmp/dupe-scope-{domain}.json
Progress file: /tmp/dupe-progress-{domain}.json
Scripts directory: {resolved_scripts_path}
Extraction JSON: /tmp/dupe-extraction-{domain}.json
Clone directory: /tmp/dupe-test-{domain}/
Original URL: {url}

Read the scope file (JSON) first to understand pages and file paths.
Read the progress file to verify extract and build phases are complete.
Then follow the instructions below to verify the clone against the original.

---

{contents of phases/verify.md}
```

4. Invoke Agent tool:
   - `subagent_type`: `general-purpose`
   - `description`: `Verify clone for {domain}`

Wait for the subagent to complete.

---

## GATE 4: Final Report

**Content integrity:** Verify the verification report contains a numeric
`Color grid match: [N]%` value for each page. Reject subjective reports that
say "looks close" or "generally matches" without quantitative metrics — the
verify phase must produce numbers.

**Update progress file:**
- Set `phases.verify.status = "complete"`, `currentPhase = "done"`, `gates.gate4.passed = true`

Read the subagent's output (the verification report). Print the final checklist
to the user:

```
## Dupe Complete — {domain}

### Clone Location
/tmp/dupe-test-{domain}/

### Serve
cd /tmp/dupe-test-{domain}/ && npx vite --port 8787

### Verification Summary
[paste verification report from subagent]

### Page Checklist
- Shared layout: ✓ extracted  ✓ interactions  ✓ built
- [page name]: ✓ all phases complete (grid: [N]%, interactions: [N]/[N])

### Add More Pages
To add another page to this clone, run:
/dupe:dupe {domain}/next-page
```

---

## Error Handling

| Error | Action |
|-------|--------|
| Navigation 4xx/5xx | Tell user, suggest checking URL |
| Redirect to login | Invoke auth flow (Phase 1.2) |
| Navigation timeout (>30s) | Retry once, then warn about bot blocking |
| Anti-scraping challenge | Tell user to solve manually in browser |
| Subagent returns incomplete output | Increment `retries` in progress file, retry with error details |
| Gate validation fails | Read `retries` from progress file — if >= 3, STOP and report to user |
| Port already in use | Try a different port |
| Any phase fails 3 times | `retries.{phase} >= 3` in progress file → STOP and ask user for guidance |

---

## Token Intensity & Model Recommendation

Dupe is intentionally token-intensive. Each subagent may use 50-100K+ tokens.
The orchestrator stays lean — under 50% context through all phases.

**Use your strongest model.** Opus-level reasoning produces pixel-perfect results.

Extraction results are cached to `/tmp/dupe-extraction-*.json` — iterate on the
build without re-extracting.

---

## Quick Reference

```
/dupe:dupe https://example.com          # Clone one page + shared layout
/dupe:dupe https://example.com/pricing  # Clone a specific page
```

**Adding pages:** After the first page is verified, run dupe again with the next
page URL. The existing clone directory, extraction cache, and shared layout are
reused — only the new page is extracted and added.
