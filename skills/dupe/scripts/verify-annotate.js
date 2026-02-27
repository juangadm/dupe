// verify-annotate.js — Injects numbered red circle labels on all interactive elements
// Returns: { elements: [{ index, tag, text, rect, selector }], count }
// Run on a page, take a screenshot, then run verify-annotate-cleanup.js to remove labels
// NOTE: No IIFE wrapper — Playwright MCP wraps this in () => { ... } automatically

// --- 1. Find all interactive/landmark elements ---
var selectors = [
  'a[href]', 'button', '[role="button"]', '[role="tab"]', '[role="menuitem"]',
  'input', 'select', 'textarea', '[role="combobox"]', '[role="listbox"]',
  '[aria-haspopup]', '[aria-expanded]', 'details > summary',
  'nav', 'header', 'footer', 'main', '[role="navigation"]',
  'h1', 'h2', 'h3', 'img[alt]'
];

var seen = new Set();
var elements = [];

selectors.forEach(function(sel) {
  Array.from(document.querySelectorAll(sel)).forEach(function(el) {
    if (seen.has(el)) return;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    // Skip elements scrolled out of the initial viewport vertically
    if (rect.bottom < 0 || rect.top > window.innerHeight * 3) return;
    seen.add(el);
    elements.push(el);
  });
});

// --- 2. Sort by visual position (top-to-bottom, left-to-right) ---
elements.sort(function(a, b) {
  var ra = a.getBoundingClientRect();
  var rb = b.getBoundingClientRect();
  var rowA = Math.floor(ra.top / 50);
  var rowB = Math.floor(rb.top / 50);
  if (rowA !== rowB) return rowA - rowB;
  return ra.left - rb.left;
});

// --- 3. Inject numbered labels ---
var elementMap = [];

elements.forEach(function(el, i) {
  var rect = el.getBoundingClientRect();
  var label = document.createElement('div');
  label.setAttribute('data-dupe-annotation', 'true');
  label.textContent = String(i + 1);
  label.style.cssText = [
    'position: fixed',
    'z-index: 2147483647',
    'top: ' + Math.round(rect.top - 8) + 'px',
    'left: ' + Math.round(rect.left - 8) + 'px',
    'width: 20px',
    'height: 20px',
    'border-radius: 50%',
    'background: rgba(220, 38, 38, 0.9)',
    'color: white',
    'font-size: 11px',
    'font-weight: bold',
    'font-family: monospace',
    'display: flex',
    'align-items: center',
    'justify-content: center',
    'pointer-events: none',
    'line-height: 1',
    'box-shadow: 0 1px 3px rgba(0,0,0,0.3)'
  ].join('; ');
  document.body.appendChild(label);

  // Build a usable CSS selector for this element
  var selector = '';
  if (el.id) {
    selector = '#' + el.id;
  } else if (el.className && typeof el.className === 'string') {
    var classes = el.className.trim().split(/\s+/).slice(0, 3).join('.');
    selector = el.tagName.toLowerCase() + '.' + classes;
  } else {
    selector = el.tagName.toLowerCase();
  }

  elementMap.push({
    index: i + 1,
    tag: el.tagName.toLowerCase(),
    role: el.getAttribute('role') || undefined,
    text: (el.innerText || el.getAttribute('alt') || '').trim().slice(0, 60),
    rect: {
      x: Math.round(rect.x), y: Math.round(rect.y),
      w: Math.round(rect.width), h: Math.round(rect.height)
    },
    selector: selector
  });
});

// --- Size Guard ---
var result = { elements: elementMap, count: elementMap.length };
var serialized = JSON.stringify(result);
if (serialized.length > 20000) {
  result.elements = elementMap.slice(0, 80);
  result._truncated = true;
  result._originalCount = elementMap.length;
}

return result;
