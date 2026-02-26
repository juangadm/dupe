// extract-hover.js — Parameterized per-element hover state extraction
// Usage: Call browser_hover on the target element FIRST, then run this script
// Replace SELECTOR_PLACEHOLDER with the actual CSS selector before executing
// NOTE: No IIFE wrapper — Playwright MCP wraps this in () => { ... } automatically

var el = document.querySelector('SELECTOR_PLACEHOLDER');
if (!el) return { error: 'Element not found', selector: 'SELECTOR_PLACEHOLDER' };
var cs = getComputedStyle(el);
return {
  selector: 'SELECTOR_PLACEHOLDER',
  backgroundColor: cs.backgroundColor,
  color: cs.color,
  textDecoration: cs.textDecoration,
  borderColor: cs.borderColor,
  boxShadow: cs.boxShadow,
  opacity: cs.opacity,
  outline: cs.outline,
  transform: cs.transform,
  filter: cs.filter
};
