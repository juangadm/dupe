# Dupe — Claude Code Plugin

## What This Is

A Claude Code plugin that clones any website pixel-perfectly using DOM extraction via Playwright. No screenshots, no Figma — reads the real DOM, extracts computed styles, and rebuilds as clean static HTML/CSS/JS.

**Status: v0.2.0 — works but not production-ready.** The extraction pipeline needs more test cases beyond Ramp to be reliable across different site architectures.

## Repo Structure

```
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest (name, version, MCP + skill paths)
├── .mcp.json                    # Playwright MCP — auto-starts when plugin loads
├── skills/
│   └── dupe/
│       ├── SKILL.md             # The skill definition (927 lines, 5-phase pipeline)
│       └── lessons.md           # 22 lessons from testing — shapes SKILL.md rules
├── tests/
│   └── ramp/                    # Ramp clone — first multi-page test case
│       ├── README.md            # What this test covers + how to run
│       ├── extraction/          # Computed styles from real Ramp
│       ├── index.html           # Root redirect → /home/
│       ├── variables.css        # Design tokens
│       ├── styles.css           # All component styles
│       ├── main.js              # All interactions
│       └── home/                # Page files (mirrors Ramp URL structure)
├── CLAUDE.md                    # YOU ARE HERE
├── README.md                    # Public plugin docs
├── CONTRIBUTING.md
├── CHANGELOG.md
└── LICENSE
```

## The Skill (SKILL.md)

`skills/dupe/SKILL.md` is the brain — a prompt that drives the entire pipeline:

1. **Phase 0** — Scope definition + Interaction Depth Matrix
2. **Phase 1** — Navigate + auth (user signs in manually if needed)
3. **Phase 2** — Extraction (DOM structure, computed styles, content inventory, SVG icons)
4. **Phase 3** — Extraction validation (completeness checks before building)
5. **Phase 4** — Build (HTML/CSS/JS strictly from extraction data)
6. **Phase 5** — Verification (Playwright functional testing + visual comparison)

### Key rules:
- Every CSS value must trace to extraction JSON — never guess
- Every interactive element must have a JS handler
- Every tab must have panel content
- Extract ALL pages before building ANY page
- SVG icons extracted verbatim, never substituted

## Lessons (lessons.md)

`skills/dupe/lessons.md` contains 22 lessons discovered from the Ramp test. Every lesson maps to a SKILL.md rule or extraction step. Read this before modifying SKILL.md — it explains WHY each rule exists.

## Tests

`tests/` contains clone outputs that validate the skill works.

### Running the Ramp test:
```bash
cd tests/ramp
npx serve -l 8787
# Open http://localhost:8787
```

### Adding a new test:
1. Run `/dupe:dupe https://some-site.com` — output goes to `/tmp/dupe-test-{domain}/`
2. Iterate until the clone is acceptable
3. Copy into `tests/{domain}/` with extraction data
4. Document what was learned

## The Feedback Loop

```
SKILL.md → run against site → clone has issues → lessons.md → fix SKILL.md → re-test
```

Every fix must flow back to SKILL.md (Lesson 22). A lesson that stays in lessons.md but doesn't become a SKILL.md rule will repeat on the next clone.

## What's Not Ready (honest assessment)

1. **SKILL.md is 927 lines** — too long for a single file. Should split into phases or supporting docs.
2. **Only 1 test case** (Ramp). Need 3-5 diverse sites to validate the pipeline handles different architectures (SPAs, static sites, complex tables, image-heavy layouts).
3. **Font handling is weak** — if the site uses a custom web font we can't load, the clone looks visibly different. Need a font-matching strategy.
4. **SVG extraction not automated** — SKILL.md says to extract SVGs but the Ramp clone still uses approximations.
5. **No automated regression testing** — should be able to run `tests/ramp/` through Playwright and verify it still renders correctly after SKILL.md changes.
6. **Extraction JSONs are thin** — the Ramp extraction is ~15KB for a 3-page app. Needs deeper extraction (all 28 table rows, all hover states, all scroll positions).

## How to Continue

### To improve the skill:
1. Read `skills/dupe/lessons.md` first
2. Pick a gap from the "What's Not Ready" list above
3. Modify `skills/dupe/SKILL.md`
4. Test against a real site
5. Add lessons to `lessons.md` and the test output to `tests/`

### To test against a new site:
1. Run `/dupe:dupe <url>` — extraction data caches to `/tmp/dupe-extraction-{domain}.json`
2. Clone output goes to `/tmp/dupe-test-{domain}/`
3. Serve with `npx serve -l 8787` and verify
4. When satisfied, copy into `tests/{domain}/`

## Development Notes

- Invoked as: `/dupe:dupe <url>`
- Requires Playwright MCP (auto-configured via `.mcp.json`)
- Extraction cached to `/tmp/dupe-extraction-*.json` for iterative builds
- Framework detection exists in SKILL.md (React, Vue, Tailwind) but only vanilla HTML/CSS has been tested
