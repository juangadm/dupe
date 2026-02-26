# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-02-26

### Added

- Initial release
- Core `dupe` skill with 5-phase extraction and build pipeline
- Unified DOM extraction (structure + dimensions + styles in single pass)
- Typography and color palette extraction
- Interactive element extraction (dropdowns, modals, tabs)
- Automatic framework detection (HTML/CSS, React, Next.js, Vue, Svelte, Tailwind)
- Playwright-based visual verification (screenshot comparison)
- Extraction caching to `/tmp/dupe-extraction-*.json`
- Scope-based phase selection (component, page, interactions, multi-page)
- Auth flow support (manual sign-in via browser window)
- Shadow DOM traversal
- Playwright MCP auto-configuration via `.mcp.json`
