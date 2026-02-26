# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-02-26

### Added

- Ramp clone test case (`tests/ramp/`) — first multi-page validation
- 22 lessons learned (`skills/dupe/lessons.md`) — patterns that prevent repeat failures
- `.gitignore` for OS files, editors, and test screenshots
- `CLAUDE.md` with full project context for session continuity
- Explicit `skills` and `mcpServers` paths in plugin manifest

### Changed

- SKILL.md: added Interaction Depth Matrix (define extraction depth before starting)
- SKILL.md: added Content Inventory step (find all tabs, dropdowns, forms before extracting)
- SKILL.md: added SVG Icon Extraction step (extract verbatim, never substitute)
- SKILL.md: added Extraction Validation Checklist (block build until extraction is complete)
- SKILL.md: added Extraction-Build Reconciliation (every CSS value must trace to JSON)
- SKILL.md: added root entry point rule (restructured URLs must handle `/`)
- SKILL.md: strengthened build rules (scope-aware styles, math verification, tab content)
- SKILL.md: replaced spot-check verification with systematic functional + visual testing
- README.md: rewritten around the primary use case (interview prototyping)

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
