# Dupe — Claude Code Plugin

## What This Is

A Claude Code plugin that clones any website pixel-perfectly using DOM extraction via Playwright. No screenshots, no Figma — reads the real DOM, extracts computed styles, and rebuilds as clean static HTML/CSS/JS.

## Repo Structure

```
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata (name, version, description)
├── .mcp.json                # Playwright MCP server config (auto-starts with plugin)
├── skills/
│   └── dupe/
│       └── SKILL.md         # The skill definition — extraction pipeline, build rules, verification
├── README.md                # Public-facing plugin docs
├── CONTRIBUTING.md
├── CHANGELOG.md
└── LICENSE
```

## The Skill (SKILL.md)

`skills/dupe/SKILL.md` is the core of the plugin — a ~35KB prompt that defines:

1. **Phase 0** — Scope selection (full page vs multi-page app)
2. **Phase 1** — Page checklist + Interaction Depth Matrix
3. **Phase 2** — Extraction via Playwright (DOM structure, computed styles, content inventory, SVG icons)
4. **Phase 3** — Extraction validation (completeness checks before building)
5. **Phase 4** — Build (HTML/CSS/JS from extraction data, never from memory)
6. **Phase 5** — Verification (functional testing via Playwright, visual comparison)

### Key principles baked into the skill:
- Every CSS value must trace to extraction JSON — no guessing
- Every interactive element must have a JS handler — dead buttons are failures
- Every tab must have panel content — empty tabs are worse than no tabs
- Extraction JSON must cover ALL pages — a 3KB JSON for a 3-page app means guesswork
- SVG icons must be extracted verbatim — no feather/lucide substitutions

## Test Artifacts

Clone outputs from testing live at `/tmp/dupe-test-{domain}/`. Current test:

- **Ramp clone**: `/tmp/dupe-test-ramp/` (separate git repo)
  - Has its own CLAUDE.md, README.md, lessons.md
  - Extraction JSONs in `extraction/`
  - 3 pages: overview, expenses, travel

**WARNING**: `/tmp/` is cleared on reboot. If you need to preserve a test clone, copy it somewhere persistent.

## How to Work on This

### Improving the skill:
1. Read `skills/dupe/SKILL.md` — understand the full pipeline
2. Read test clone's `tasks/lessons.md` — these are failures that informed SKILL.md changes
3. Make changes to SKILL.md
4. Test by running the skill against a real site
5. Document new lessons in the test clone's `tasks/lessons.md`
6. Flow proven lessons back into SKILL.md (Lesson 22)

### Testing the skill:
1. Run `/dupe:dupe https://some-site.com`
2. Output goes to `/tmp/dupe-test-{domain}/`
3. Serve with `npx serve -l 8787` from the output directory
4. Verify with Playwright snapshots + visual comparison
5. Iterate: extract missing data → fix CSS → re-verify

### The feedback loop:
```
SKILL.md defines the pipeline
    → Run skill against a site
        → Clone has issues
            → Document in lessons.md
                → Fix SKILL.md to prevent recurrence
                    → Re-test
```

## Development Notes

- Plugin uses Playwright MCP server (configured in `.mcp.json`)
- The skill is invoked as `/dupe:dupe <url>`
- Extraction data is cached to `/tmp/dupe-extraction-{domain}.json` for iterative builds
- The skill supports scope options: full page or multi-page app
- Framework detection (React, Vue, Tailwind) is documented in SKILL.md but the current test used vanilla HTML/CSS/JS
