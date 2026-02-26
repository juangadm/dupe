# Dupe — Claude Code Plugin

## Vision

Dupe lets anyone clone a real website into working code, then build on top of it. The primary audience is **job candidates** — PMs, designers, engineers — who want to walk into an interview with a **working prototype** built on the company's actual product, not a Figma mockup.

The insight: the hardest part of prototyping isn't the new feature — it's recreating the existing product accurately enough that your feature looks native. Dupe eliminates that step entirely. Clone the real thing, add your idea, demo it live.

**This is what we're building towards:** a plugin so reliable that a PM candidate can run `/dupe:dupe https://try.ramp.com`, get a pixel-perfect interactive clone in minutes, add their proposed feature, and present it in an interview the next day.

## Market Position

### Why DOM extraction wins

Every competitor uses screenshots. Dupe reads the actual DOM.

| | Screenshot tools (v0, Bolt, Same.new) | **Dupe** |
|---|---|---|
| CSS values | Guessed from pixels | Exact (`getComputedStyle`) |
| Typography | Approximated | Exact fonts, weights, sizes |
| Interactions | None | Tabs, dropdowns, forms extracted |
| Editable code | Framework-generated | Clean HTML/CSS you control |
| Content | OCR'd or placeholder | Real text from the DOM |

### Competitive landscape

- **Same.new, CopyWeb.ai, CloneUI** — AI website cloners, screenshot-based, no interaction extraction
- **v0, Bolt.new, Lovable** — Screenshot-to-code, great for greenfield but can't match an existing product
- **Alloy.app** — Closest competitor (prototyping on existing products), but visual editor approach, not code-first
- **Claude Code plugins** — No website cloning plugin exists today (searched 270+ plugins, 739 skills)

### Positioning

"The developer's website cloning tool" — for technical PMs, frontend devs, and design engineers who want to prototype on top of existing products, directly in their codebase. Not competing with Figma. Competing with the hours you'd spend manually rebuilding someone else's UI.

## Roadmap

### v0.2.0 (current) — Proof of concept
- Pipeline works end-to-end for 1 site (Ramp)
- 3-page multi-page clone with tables, tabs, dropdowns, forms
- 22 lessons captured and flowed back into SKILL.md
- Known gaps: fonts, SVG extraction, thin extraction JSONs

### v0.3.0 — Reliability across diverse sites
- [ ] Test against 3-5 more sites (Airbnb search, Linear, Stripe docs, Notion)
- [ ] Fix font handling (Google Font matching or size compensation strategy)
- [ ] Automate SVG extraction (currently manual/approximate)
- [ ] Deepen extraction JSONs (every row, every hover state, every scroll position)

### v0.4.0 — Skill quality + DX
- [ ] Split SKILL.md into phases or supporting docs (currently 927 lines)
- [ ] Add regression tests (Playwright scripts that verify test clones still render)
- [ ] Framework output tested (React/Next.js, not just vanilla HTML)
- [ ] Better error recovery (3 failures → guided retry, not hard stop)

### v0.5.0 — Polish for distribution
- [ ] Video demo: clone Ramp → add feature → present prototype (the full story)
- [ ] README with before/after comparisons (real site vs clone side-by-side)
- [ ] Streamlined first-run experience (zero config beyond `claude plugin install`)

### v1.0.0 — Public launch
- [ ] Reliable across 5+ site architectures (SPAs, static, tables, image-heavy, auth-gated)
- [ ] Submitted to Anthropic's official plugin marketplace
- [ ] Applied for Anthropic Verified badge
- [ ] Blog post / tutorial showing the interview prototype workflow
- [ ] Listed on community registries (claudemarketplaces.com, awesome-claude-plugins)

## GTM — Distribution Strategy

### Channels (ranked by impact)

1. **Anthropic's official plugin marketplace** — primary discovery channel for Claude Code users
2. **`anthropics/claude-plugins-official`** — submit for inclusion in curated list
3. **GitHub** (`juangadm/dupe`) — open source, MIT, stars = social proof
4. **Content marketing** — demo video showing the interview use case end-to-end
5. **Community seeding** — share in PM communities (Lenny's, Blind, r/ProductManagement)
6. **Curated lists** — awesome-claude-plugins, awesome-claude-skills
7. **claudemarketplaces.com** — third-party plugin directory
8. **Composability** — integrate with Frontend-Design skill (clone → enhance with AI design)

### Distribution checklist (pre-launch)
- [ ] Submit to `anthropics/claude-plugins-official`
- [ ] Apply for Anthropic Verified badge
- [ ] Create `marketplace.json` so Dupe can host its own marketplace entry
- [ ] Record 2-minute demo video (clone → add feature → demo)
- [ ] Write blog post: "How I Built My PM Interview Prototype in 15 Minutes"
- [ ] List on claudemarketplaces.com
- [ ] Add GitHub topics: `claude-code`, `claude-plugin`, `website-clone`, `prototyping`

### Success metrics
- GitHub stars (target: 100+ within first month)
- Plugin installs (tracked via marketplace if available)
- Test coverage: 5+ successful site clones in `tests/`

## Why This Matters for JuanGa

This is both a useful tool and a portfolio piece. It demonstrates:
- **Product thinking** — identified a real pain point (interview prototyping), validated the market, built the solution
- **Technical depth** — DOM extraction pipeline, Playwright automation, CSS precision
- **Iterative craft** — 22 lessons learned, every failure fed back into the system
- **Builder instinct** — saw a gap in the Claude Code plugin ecosystem and filled it

The plugin itself IS the interview artifact. "I built a Claude Code plugin that clones websites so PMs can prototype for interviews — and I used it to build this prototype for YOUR product."

---

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
│       └── home/                # Page files (mirrors Ramp URL structure)
├── CLAUDE.md                    # YOU ARE HERE
├── README.md                    # Public plugin docs (interview prototyping story)
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

## The Feedback Loop

```
SKILL.md → run against site → clone has issues → lessons.md → fix SKILL.md → re-test
```

Every fix must flow back to SKILL.md (Lesson 22). A lesson that stays in lessons.md but doesn't become a SKILL.md rule will repeat on the next clone.

## What's Not Ready (honest assessment)

1. **SKILL.md is 927 lines** — too long for a single file. Should split into phases or supporting docs.
2. **Only 1 test case** (Ramp). Need 3-5 diverse sites to validate the pipeline.
3. **Font handling is weak** — custom web fonts break visual fidelity.
4. **SVG extraction not automated** — still using approximations.
5. **No automated regression testing** — can't verify tests still pass after SKILL.md changes.
6. **Extraction JSONs are thin** — ~15KB for a 3-page app isn't enough.

## How to Continue

### To improve the skill:
1. Read `skills/dupe/lessons.md` first
2. Pick a gap from "What's Not Ready" or a roadmap item
3. Modify `skills/dupe/SKILL.md`
4. Test against a real site
5. Add lessons to `lessons.md` and test output to `tests/`

### To test against a new site:
1. Run `/dupe:dupe <url>` — extraction data caches to `/tmp/dupe-extraction-{domain}.json`
2. Clone output goes to `/tmp/dupe-test-{domain}/`
3. Serve with `npx serve -l 8787` and verify
4. When satisfied, copy into `tests/{domain}/`

### To work on GTM:
1. Pick items from the distribution checklist above
2. Video demo is highest-impact — shows the full story in 2 minutes
3. Don't submit to marketplace until v0.5.0+ (need reliability first)

## Development Notes

- Invoked as: `/dupe:dupe <url>`
- Requires Playwright MCP (auto-configured via `.mcp.json`)
- Extraction cached to `/tmp/dupe-extraction-*.json` for iterative builds
- Framework detection exists in SKILL.md (React, Vue, Tailwind) but only vanilla HTML/CSS tested
- Plugin loaded locally with: `claude --plugin-dir ./dupe`
