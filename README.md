# Dupe

**Clone any website. Pixel-perfect. No screenshots, no Figma — real DOM, real code.**

Dupe is a Claude Code plugin that extracts live DOM structure, computed styles, and exact dimensions from any website using Playwright, then rebuilds it as clean, editable HTML/CSS. One command. Real markup. Pixel-perfect output.

## Why Dupe?

Screenshot-based cloning gives you a flat image. You can't edit it, it doesn't respond to different viewports, and a single 4K screenshot weighs more than the entire clone Dupe produces.

Dupe reads the DOM like a developer would — inspecting elements, measuring boxes, computing styles. The result is real, editable code with real data.

**Use cases:**

- **PM interviews** — Clone Airbnb's search results, add your feature on top, demo a working prototype
- **Rapid prototyping** — Skip the Figma-to-code step. Clone the production UI, iterate directly
- **Design systems** — Extract a company's actual design tokens, typography, and spacing
- **Competitive analysis** — Understand exactly how a competitor's UI is built

## Install

```
claude plugin install juangadm/dupe
```

Or add to your project's `.claude/plugins.json`:

```json
{
  "plugins": ["juangadm/dupe"]
}
```

## Requirements

- [Claude Code](https://claude.ai/claude-code) CLI
- Playwright MCP server (auto-configured via `.mcp.json`)

The plugin ships with an `.mcp.json` that auto-starts Playwright when loaded. No manual setup required.

## Usage

```
/dupe:dupe https://try.ramp.com
```

Dupe will:

1. **Ask your scope** — Single component, full page, or page with interactions
2. **Navigate** — Opens the URL in a real browser via Playwright
3. **Handle auth** — Pauses so you can sign in if needed
4. **Extract** — Reads DOM structure, styles, dimensions, typography, colors
5. **Build** — Generates clean HTML/CSS (or your framework) with real data
6. **Verify** — Screenshots both original and clone, fixes top discrepancies

## How It Works

Dupe runs a series of `browser_evaluate` calls that extract:

| What | How |
|------|-----|
| **Structure** | Tag names, classes, IDs, parent-child relationships |
| **Dimensions** | `getBoundingClientRect()` for every element |
| **Styles** | Computed values for 45+ CSS properties (whitelist, not wildcard) |
| **Typography** | Font families, sizes, weights, line heights, letter spacing |
| **Colors** | Full palette with usage frequency |
| **Content** | Real text, labels, numbers — never placeholder data |
| **Interactions** | Dropdowns, modals, tabs, accordions (if scope includes them) |

The extraction is cached to `/tmp/dupe-extraction-*.json` so you can iterate on the build without re-extracting.

## Model Recommendation

Dupe is intentionally token-intensive. A full page clone can use 50-100k+ tokens. This is by design — tokens are cheap, rework is expensive.

**Use your strongest model.** The extraction-to-build pipeline requires strong reasoning about layout structure, component decomposition, and style inheritance. Opus-level models produce pixel-perfect results. Cheaper models cut corners.

## Scope Options

| Scope | What You Get | Token Estimate |
|-------|-------------|----------------|
| Single component | One element (navbar, hero, footer) | 10-20k |
| Single page | Full page, static | 30-60k |
| Page with interactions | Page + dropdowns, modals, tabs | 50-100k |
| Multi-page shell | Layout + nav across 2-3 pages | 80-150k |

## Framework Support

Dupe detects your project's framework automatically:

- **No project** → standalone HTML + CSS (most portable)
- **Next.js / React** → JSX components
- **Tailwind CSS** → utility classes instead of inline styles
- **Vue / Svelte** → SFC components
- **TypeScript** → typed props and interfaces

## Examples

### Clone Airbnb's search results

```
/dupe:dupe https://www.airbnb.com/s/new-york
```

### Clone Ramp's bills dashboard

```
/dupe:dupe https://try.ramp.com
```

### Clone a single component

```
/dupe:dupe https://linear.app
# When prompted for scope, choose "Single component"
# When asked which area, say "the navbar"
```

## Limitations

- Cannot access cross-origin iframes (noted as placeholders)
- Cannot download proprietary fonts (uses closest Google Font match)
- Cannot bypass CAPTCHAs or anti-scraping challenges (you solve them manually)
- Cannot clone server-side functionality or API behavior
- CSS animations are captured as transitions only, not keyframe-by-keyframe

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
