// verify-annotate-cleanup.js — Removes all annotation labels injected by verify-annotate.js
// Returns: { removed: number }
// Idempotent — safe to run multiple times
// NOTE: No IIFE wrapper — Playwright MCP wraps this in () => { ... } automatically

var annotations = document.querySelectorAll('[data-dupe-annotation]');
var count = annotations.length;
Array.from(annotations).forEach(function(el) {
  el.remove();
});

return { removed: count };
