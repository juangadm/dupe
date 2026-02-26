# Contributing to Dupe

Thanks for your interest in contributing to Dupe.

## How to Contribute

### Improving the Skill

The core product is `skills/dupe/SKILL.md`. If you've found that Dupe produces better results with different extraction scripts, style whitelists, or build instructions, open a PR with:

1. The change to `SKILL.md`
2. A before/after comparison showing the improvement
3. Which site(s) you tested against

### Bug Reports

If Dupe produces broken output for a specific site:

1. Open an issue with the URL (if publicly accessible)
2. Include the scope you selected (component, page, interactions, multi-page)
3. Describe what went wrong (missing elements, wrong styles, broken layout)
4. Include the cached extraction JSON from `/tmp/dupe-extraction-*.json` if possible

### Adding Framework Support

Dupe currently supports HTML/CSS, React/Next.js, Vue, Svelte, and Tailwind. To add a new framework:

1. Add detection logic in Phase 4, Step 4.1 of `SKILL.md`
2. Add build instructions specific to the framework's conventions
3. Test against at least 2 sites with the new framework

## Development Setup

1. Fork this repo
2. Clone your fork
3. Load the plugin locally:
   ```
   claude --plugin-dir ./dupe
   ```
4. Test with `/dupe:dupe <url>`

## Code of Conduct

Be kind. Be constructive. Focus on making Dupe better.
