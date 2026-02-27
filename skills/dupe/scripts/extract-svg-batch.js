// extract-svg-batch.js — Fallback: retrieves full outerHTML for overflow SVGs
// Only needed when extract-visual.js sets _svgOverflow: true
// Replace INDICES_PLACEHOLDER with array of indices from _svgOverflowIndices
// Uses same querySelectorAll('svg') + visibility filter for ordering stability
// NOTE: No IIFE wrapper — Playwright MCP wraps this in () => { ... } automatically

var targetIndices = INDICES_PLACEHOLDER;

// Rebuild the same deduplicated SVG list as extract-visual.js
var svgMap = {};
var svgOrder = [];
Array.from(document.querySelectorAll('svg'))
  .filter(function(el) {
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  })
  .forEach(function(el) {
    var html = el.outerHTML;
    var hash = html.length + '|' + html.slice(0, 200);
    if (!svgMap[hash]) {
      svgMap[hash] = html;
      svgOrder.push(hash);
    }
  });

var result = {};
targetIndices.forEach(function(i) {
  if (i < svgOrder.length) {
    result[i] = svgMap[svgOrder[i]];
  }
});

return result;
