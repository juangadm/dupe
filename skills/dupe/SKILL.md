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

**Why subagents?** A 3-page clone produces 200-400KB of extraction data. Loading
this into a single context window repeatedly across 5 phases exhausts context by
Phase 2. Subagents isolate each phase with a fresh ~200K context window.

---

## ABSOLUTE RULE: No Inline Scripts via Bash

**NEVER use `python3 -c`, `node -e`, `cat | python3`, heredoc scripts (`cat << 'EOF' > /tmp/script.mjs`, `cat << 'EOF' | python3`), or any inline script in Bash.**
They are banned entirely — no exceptions. Writing a script to a temp file and
running it IS an inline script. Piping a heredoc to an interpreter IS an inline script.

**The only acceptable Bash commands are:**
- `npx serve -l [port]` (serve the clone)
- `ls`, `mkdir`, `cp`, `wc` (file management)
- `git` commands (if committing)

---

## Prerequisites Check

Before ANY phase, verify Playwright MCP tools are available:

1. Use `ToolSearch` to find: `browser_navigate`, `browser_evaluate`, `browser_snapshot`
2. If ANY tool is missing, stop immediately and tell the user:

> "Playwright MCP isn't connected. Run `npx @playwright/mcp@latest` to verify
> it works, then restart Claude Code with the plugin loaded."

3. Do NOT proceed without Playwright. There is no graceful degradation.

---

## Phase 0 — Scope Definition (MANDATORY, inline)

Before navigating to any URL, ask the user:

> "What do you want to clone?
>
> 1. **Full page** — One complete page with all interactions (dropdowns, modals, tabs)
> 2. **Multi-page app** — Sidebar/nav + multiple pages with all interactions
>
> Which pages and sections should I include?"

### After the user answers, write the PAGE CHECKLIST:

```
## Dupe Page Checklist
- Scope: [Full page / Multi-page app]
- Shared layout: [ ] extracted  [ ] interactions
- Page 1 [name/URL]: [ ] extracted  [ ] interactions  [ ] built  [ ] verified
- Page 2 [name/URL]: [ ] extracted  [ ] interactions  [ ] built  [ ] verified
- Page 3 [name/URL]: [ ] extracted  [ ] interactions  [ ] built  [ ] verified
```

Print this checklist to the user.

### Interaction Depth Matrix

For each page, define depth BEFORE extraction begins:

| Page | Content Depth | Interaction Depth | Notes |
|------|--------------|-------------------|-------|
| Example | Scroll full page | Depth 2 | Each tab shows different content |

**Content Depth:** "visible only", "scroll full page", "scroll table fully"
**Interaction Depth:** Depth 0 (static), Depth 1 (click each), Depth 2 (all variants), Depth 3 (multi-step chains)

### Resolve Scripts Path

Find the absolute path to the extraction/verification scripts:

```
Glob: **/scripts/extract-structure.js
```

Store the resolved directory path. Subagents will use this to find scripts.

### Write Scope File

Parse the domain from the URL: `{domain}` = hostname without `www.` prefix.

Write scope to `/tmp/dupe-scope-{domain}.md`:

```markdown
# Dupe Scope — {domain}

## Target URL
{url}

## Domain
{domain}

## Scripts Directory
{resolved_scripts_path}

## Extraction JSON
/tmp/dupe-extraction-{domain}.json

## Output Directory
/tmp/dupe-test-{domain}/

## Pages
- Page 1: {name} — {url_path}
- Page 2: {name} — {url_path}
- Page 3: {name} — {url_path}

## Interaction Depth Matrix
| Page | Content Depth | Interaction Depth | Notes |
|------|--------------|-------------------|-------|
| ... | ... | ... | ... |
```

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

---

## Subagent 1: Extraction (Phases 2–3)

Delegate extraction to a subagent with a fresh context window.

1. **Glob** for `**/phases/extract.md`
2. **Read** the phase file
3. Construct the subagent prompt:

```
Domain: {domain}
Scope file: /tmp/dupe-scope-{domain}.md
Scripts directory: {resolved_scripts_path}
Extraction JSON: /tmp/dupe-extraction-{domain}.json
Original URL: {url}

Read the scope file first to understand pages, interaction depth, and file paths.
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

**If validation fails:** Retry the extraction subagent once with error details
appended to the prompt. If it fails again, STOP and report to user.

**If validation passes:** Print:
```
GATE 2 PASSED:
- Extraction file: /tmp/dupe-extraction-{domain}.json
- File size: [N]KB
- Pages found: [list]
```

---

## Subagent 2: Build (Phase 4)

Delegate the build to a subagent with a fresh context window.

1. **Glob** for `**/phases/build.md`
2. **Read** the phase file
3. Construct the subagent prompt:

```
Domain: {domain}
Scope file: /tmp/dupe-scope-{domain}.md
Scripts directory: {resolved_scripts_path}
Extraction JSON: /tmp/dupe-extraction-{domain}.json
Output directory: /tmp/dupe-test-{domain}/
Original URL: {url}

Read the scope file first to understand pages and file paths.
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
2. Count HTML files — matches page count from scope?
3. Check for CSS files — total CSS size > 5KB?
4. Check for JS files — `main.js` exists and > 1KB?

**If validation fails:** Retry the build subagent once with error details.
If it fails again, STOP and report to user.

**If validation passes:** Print:
```
GATE 3 PASSED:
- Output directory: /tmp/dupe-test-{domain}/
- HTML files: [list]
- CSS size: [N]KB
- JS size: [N]KB
```

---

## Subagent 3: Verify (Phase 5)

Delegate verification to a subagent with a fresh context window.

1. **Glob** for `**/phases/verify.md`
2. **Read** the phase file
3. Construct the subagent prompt:

```
Domain: {domain}
Scope file: /tmp/dupe-scope-{domain}.md
Scripts directory: {resolved_scripts_path}
Extraction JSON: /tmp/dupe-extraction-{domain}.json
Clone directory: /tmp/dupe-test-{domain}/
Original URL: {url}

Read the scope file first to understand pages and file paths.
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

Read the subagent's output (the verification report). Print the final checklist
to the user:

```
## Dupe Complete — {domain}

### Clone Location
/tmp/dupe-test-{domain}/

### Serve
npx serve -l 8787 /tmp/dupe-test-{domain}/

### Verification Summary
[paste verification report from subagent]

### Page Checklist
- Shared layout: ✓ extracted  ✓ interactions  ✓ built
- Page 1 [name]: ✓ all phases complete (grid: [N]%, interactions: [N]/[N])
- Page 2 [name]: ✓ all phases complete (grid: [N]%, interactions: [N]/[N])
- Page 3 [name]: ✓ all phases complete (grid: [N]%, interactions: [N]/[N])
```

---

## Error Handling

| Error | Action |
|-------|--------|
| Navigation 4xx/5xx | Tell user, suggest checking URL |
| Redirect to login | Invoke auth flow (Phase 1.2) |
| Navigation timeout (>30s) | Retry once, then warn about bot blocking |
| Anti-scraping challenge | Tell user to solve manually in browser |
| Subagent returns incomplete output | Retry once with error details |
| Gate validation fails twice | STOP and report to user |
| Port already in use | Try a different port |
| 3 failed attempts at same step | STOP and ask user for guidance |

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
/dupe:dupe https://example.com          # Clone a page
/dupe:dupe https://example.com/pricing  # Clone a specific page
```
