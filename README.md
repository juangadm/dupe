# Dupe

**Clone any website into working code. Then build on top of it.**

Dupe is a Claude Code plugin that reads the live DOM of any website — structure, styles, dimensions, interactions — and rebuilds it as clean, editable HTML/CSS/JS. Not a screenshot. Not a Figma export. Real code you can modify, extend, and present as your own prototype.

## The Problem

You're interviewing for a PM role at Ramp. You have a great idea for improving their expense table — maybe a smarter filtering system, or a new visualization for spending trends. You want to walk in with a **working prototype** that looks exactly like the real product, with your feature built on top.

Your options today:

| Approach | Result |
|----------|--------|
| Screenshot + Figma mockup | Flat image. Can't click anything. Looks like a mockup. |
| Build from scratch | Takes days. Never looks quite right. Spacing is off, fonts are wrong. |
| Record a video walkthrough | Passive. Interviewer can't interact with it. |
| **Dupe the real product** | **Working clone in minutes. Add your feature. Demo a real prototype.** |

Dupe gives you a pixel-perfect starting point that actually works — tabs switch, dropdowns open, navigation navigates. You skip the tedious "make it look like the real thing" phase and go straight to building the feature that shows your product thinking.

## Use Cases

**Job interviews (the primary use case):**
- Clone Ramp's expense dashboard, add your proposed analytics feature
- Clone Airbnb's search results, prototype a new filter system
- Clone Spotify's playlist view, build a collaborative editing concept
- Walk into the interview with a prototype indistinguishable from the real product

**Rapid prototyping:**
- Skip the Figma-to-code step entirely — clone the production UI, iterate directly
- Test feature ideas against the real layout, not a simplified mockup

**Design system extraction:**
- Pull a company's actual design tokens — colors, typography, spacing, component patterns
- Understand how a product is actually built, not how it looks in screenshots

## Install

```
claude plugin install juangadm/dupe
```

Requires [Claude Code](https://claude.ai/claude-code) CLI. Playwright MCP auto-configures when the plugin loads — no manual setup.

## Usage

```
/dupe:dupe https://try.ramp.com
```

Dupe will:

1. **Ask your scope** — Full page or multi-page app (interactions always included)
2. **Navigate** — Opens a real browser via Playwright
3. **Handle auth** — Pauses so you can sign in if needed (e.g., demo accounts)
4. **Extract** — Reads DOM structure, computed styles, dimensions, typography, colors, content
5. **Build** — Generates clean HTML/CSS/JS using exact values from the extraction
6. **Verify** — Tests every interactive element, compares against the original

The output is a static site you can serve locally and modify freely.

## Example: Ramp Clone

We tested Dupe against [try.ramp.com](https://try.ramp.com) — a complex multi-page app with a sidebar, data tables with sticky columns, tab switching, dropdown menus, and form variations.

**What Dupe produced:**
- 3 fully interactive pages (overview, expenses, travel)
- 12-column data table with sticky checkbox, merchant, amount, and action columns
- Tab switching between "All" and "Reimbursements" (different table structures)
- Flights/Hotels tabs that swap the entire search form
- Dropdown menus that open, close, and update labels
- Sidebar navigation between pages

**What you'd do next:** Add your proposed feature on top of this working clone and demo it in your interview.

See the full test output in [`tests/ramp/`](tests/ramp/).

## How It Works

Dupe extracts from the live DOM — not screenshots — using Playwright's `browser_evaluate`:

| What | How |
|------|-----|
| **Structure** | Tag names, parent-child relationships, semantic roles |
| **Dimensions** | `getBoundingClientRect()` for every visible element |
| **Styles** | `getComputedStyle()` for 45+ whitelisted CSS properties |
| **Typography** | Fonts, sizes, weights, line heights, letter spacing |
| **Colors** | Full palette with usage frequency |
| **Content** | Real text, labels, numbers — never lorem ipsum |
| **Interactions** | Tabs, dropdowns, forms — clicked and extracted per state |
| **Icons** | SVG markup extracted verbatim from the DOM |

Extraction data is cached to JSON files so you can iterate on the build without re-extracting.

## Model Recommendation

Dupe is intentionally token-intensive. A multi-page clone can use 150-300k+ tokens. This is by design — tokens are cheap, rebuilding is expensive.

**Use your strongest model.** The extraction-to-build pipeline requires reasoning about layout structure, component decomposition, and style inheritance. Opus produces pixel-perfect results. Cheaper models cut corners.

| Scope | What You Get | Token Estimate |
|-------|-------------|----------------|
| Full page | Complete page with all interactions | 50-100k |
| Multi-page app | Shared layout + multiple pages | 150-300k+ |

## Current Status

**v0.2.0 — works but not production-ready.**

Dupe has been tested against 1 site (Ramp). The core pipeline works — extract, build, verify — and produced a convincing 3-page clone. But the skill needs more test cases across different site architectures before it's reliable for any arbitrary URL.

**What works well:**
- Multi-page extraction with shared layout detection
- Table-heavy pages with sticky columns
- Tab switching, dropdown menus, form interactions
- Extraction-driven CSS (values traced to JSON, not guessed)

**What needs work:**
- Custom web fonts (falls back to system fonts, visually different)
- SVG icon extraction (currently uses approximations)
- Very large pages (300K+ character extractions need pagination)
- Only tested against 1 site — needs 3-5 more diverse test cases

## Limitations

- Cannot download proprietary fonts (compensates with system font size adjustment)
- Cannot access cross-origin iframes
- Cannot bypass CAPTCHAs or anti-scraping (you solve them manually in the browser)
- Cannot clone server-side functionality or API behavior
- CSS animations captured as transitions only

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

The most valuable contribution right now: **test Dupe against a new site and report what breaks.** This directly improves the extraction pipeline for everyone.

## License

MIT — see [LICENSE](LICENSE).
