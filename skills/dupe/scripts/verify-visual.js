// verify-visual.js — Extracts visual fingerprint for comparison between original and clone
// Returns: { colorGrid, landmarks, largestElements }
// Run on both original and clone, compare grid match % and landmark positions
// NOTE: No IIFE wrapper — Playwright MCP wraps this in () => { ... } automatically

// --- 1. 16x12 Color Grid (sampled via elementFromPoint) ---
var gridCols = 16;
var gridRows = 12;
var viewW = window.innerWidth;
var viewH = window.innerHeight;
var cellW = viewW / gridCols;
var cellH = viewH / gridRows;
var colorGrid = [];

for (var row = 0; row < gridRows; row++) {
  var gridRow = [];
  for (var col = 0; col < gridCols; col++) {
    var x = Math.round(cellW * col + cellW / 2);
    var y = Math.round(cellH * row + cellH / 2);
    var el = document.elementFromPoint(x, y);
    var color = 'transparent';
    if (el) {
      var cs = getComputedStyle(el);
      // Walk up until we find a non-transparent background
      var current = el;
      while (current && current !== document.documentElement) {
        var bg = getComputedStyle(current).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          color = bg;
          break;
        }
        current = current.parentElement;
      }
      if (color === 'transparent') {
        // Fall back to body/html background
        color = getComputedStyle(document.body).backgroundColor || 'rgb(255, 255, 255)';
      }
    }
    gridRow.push(color);
  }
  colorGrid.push(gridRow);
}

// --- 2. Landmark Elements (positioned by semantic role) ---
var landmarkSelectors = [
  { name: 'header', sel: 'header, [role="banner"]' },
  { name: 'nav', sel: 'nav, [role="navigation"]' },
  { name: 'main', sel: 'main, [role="main"]' },
  { name: 'footer', sel: 'footer, [role="contentinfo"]' },
  { name: 'sidebar', sel: 'aside, [role="complementary"], [class*="sidebar"], [class*="Sidebar"]' },
  { name: 'hero', sel: '[class*="hero"], [class*="Hero"], [class*="banner"], [class*="Banner"]' },
  { name: 'search', sel: '[role="search"], [class*="search"], [class*="Search"]' }
];

var landmarks = [];
landmarkSelectors.forEach(function(lm) {
  var el = document.querySelector(lm.sel);
  if (!el) return;
  var rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  var cs = getComputedStyle(el);
  landmarks.push({
    name: lm.name,
    rect: {
      x: Math.round(rect.x), y: Math.round(rect.y),
      w: Math.round(rect.width), h: Math.round(rect.height)
    },
    backgroundColor: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : undefined,
    borderBottom: cs.borderBottom !== 'none' && cs.borderBottom !== '0px none rgb(0, 0, 0)' ? cs.borderBottom : undefined,
    position: cs.position,
    zIndex: cs.zIndex !== 'auto' ? cs.zIndex : undefined
  });
});

// --- 3. Top 20 Elements by Area ---
var allVisible = Array.from(document.querySelectorAll('body *'))
  .filter(function(el) {
    var rect = el.getBoundingClientRect();
    return rect.width > 20 && rect.height > 20 &&
           rect.top < viewH && rect.bottom > 0;
  })
  .map(function(el) {
    var rect = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      classes: el.className && typeof el.className === 'string'
        ? el.className.split(/\s+/).filter(Boolean).slice(0, 3).join(' ')
        : '',
      area: Math.round(rect.width * rect.height),
      rect: {
        x: Math.round(rect.x), y: Math.round(rect.y),
        w: Math.round(rect.width), h: Math.round(rect.height)
      },
      backgroundColor: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : undefined,
      color: cs.color
    };
  });

allVisible.sort(function(a, b) { return b.area - a.area; });
var largestElements = allVisible.slice(0, 20);

// --- Size Guard ---
var result = {
  colorGrid: colorGrid,
  landmarks: landmarks,
  largestElements: largestElements,
  viewport: { width: viewW, height: viewH }
};

var serialized = JSON.stringify(result);
if (serialized.length > 20000) {
  result.largestElements = largestElements.slice(0, 10);
  result._truncated = true;
}

return result;
