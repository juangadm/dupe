// extract-interaction.js — Parameterized per-interaction content extraction
// Usage: Call browser_click on the trigger element FIRST, wait 500ms, then run this script
// Replace BOUNDS_PLACEHOLDER with JSON bounds: { xMin, xMax, yMin, yMax }
// If no bounds needed (full page), use: { xMin: 0, xMax: 1920, yMin: 0, yMax: 5000 }
// NOTE: No IIFE wrapper — Playwright MCP wraps this in () => { ... } automatically

var BOUNDS = BOUNDS_PLACEHOLDER;

// --- 1. Interactive Element Inventory (for full-page scan) ---
var interactiveElements = Array.from(document.querySelectorAll(
  'button, [role="button"], [role="tab"], [role="menuitem"], ' +
  '[data-toggle], [data-dropdown], details, [aria-haspopup], ' +
  '[aria-expanded], select, [role="combobox"], [role="listbox"]'
)).filter(function(el) {
  var r = el.getBoundingClientRect();
  return r.width > 0 &&
         r.x >= BOUNDS.xMin && r.x <= BOUNDS.xMax &&
         r.y >= BOUNDS.yMin && r.y <= BOUNDS.yMax;
}).map(function(el) {
  var r = el.getBoundingClientRect();
  return {
    tag: el.tagName.toLowerCase(),
    role: el.getAttribute('role'),
    ariaExpanded: el.getAttribute('aria-expanded'),
    text: el.innerText.trim().slice(0, 50),
    rect: { x: Math.round(r.x), y: Math.round(r.y),
            w: Math.round(r.width), h: Math.round(r.height) },
    selector: el.id ? '#' + el.id : undefined
  };
});

// --- 2. TreeWalker Content of Revealed Region ---
var textNodes = [];
var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
  acceptNode: function(node) {
    if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
    var range = document.createRange();
    range.selectNodeContents(node);
    var r = range.getBoundingClientRect();
    if (r.x >= BOUNDS.xMin && r.x <= BOUNDS.xMax &&
        r.y >= BOUNDS.yMin && r.y <= BOUNDS.yMax && r.width > 0) {
      return NodeFilter.FILTER_ACCEPT;
    }
    return NodeFilter.FILTER_REJECT;
  }
});

while (walker.nextNode()) {
  var node = walker.currentNode;
  var range = document.createRange();
  range.selectNodeContents(node);
  var r = range.getBoundingClientRect();
  var parent = node.parentElement;
  var cs = parent ? getComputedStyle(parent) : null;
  textNodes.push({
    text: node.textContent.trim(),
    rect: { x: Math.round(r.x), y: Math.round(r.y),
            w: Math.round(r.width), h: Math.round(r.height) },
    parentTag: parent ? parent.tagName.toLowerCase() : undefined,
    fontSize: cs ? cs.fontSize : undefined,
    fontWeight: cs ? cs.fontWeight : undefined,
    color: cs ? cs.color : undefined
  });
}

// --- 3. Form Fields in Revealed Region ---
var formFields = Array.from(document.querySelectorAll(
  'input, select, textarea, [role="combobox"], [contenteditable]'
)).filter(function(el) {
  var r = el.getBoundingClientRect();
  return r.width > 0 &&
         r.x >= BOUNDS.xMin && r.x <= BOUNDS.xMax &&
         r.y >= BOUNDS.yMin && r.y <= BOUNDS.yMax;
}).map(function(el) {
  var r = el.getBoundingClientRect();
  var cs = getComputedStyle(el);
  var label = el.labels && el.labels[0] ? el.labels[0].textContent.trim() :
              (el.getAttribute('aria-label') || el.getAttribute('placeholder') || '');
  var options = el.tagName === 'SELECT' ? Array.from(el.options).map(function(o) {
    return { text: o.textContent.trim(), value: o.value, selected: o.selected };
  }) : undefined;
  return {
    tag: el.tagName.toLowerCase(),
    type: el.type || undefined,
    name: el.name || undefined,
    placeholder: el.placeholder || undefined,
    value: el.value || undefined,
    label: label,
    options: options,
    rect: { x: Math.round(r.x), y: Math.round(r.y),
            w: Math.round(r.width), h: Math.round(r.height) },
    styles: {
      backgroundColor: cs.backgroundColor, color: cs.color,
      border: cs.border, borderRadius: cs.borderRadius,
      fontSize: cs.fontSize, fontWeight: cs.fontWeight,
      padding: cs.padding, height: cs.height, width: cs.width
    }
  };
});

// --- 4. Container Spacing (gap between form fields) ---
var formContainers = Array.from(document.querySelectorAll(
  'form, [class*="form"], [class*="Form"], fieldset'
)).filter(function(el) {
  var r = el.getBoundingClientRect();
  return r.width > 0 &&
         r.x >= BOUNDS.xMin && r.x <= BOUNDS.xMax &&
         r.y >= BOUNDS.yMin && r.y <= BOUNDS.yMax;
}).map(function(el) {
  var cs = getComputedStyle(el);
  return {
    display: cs.display, flexDirection: cs.flexDirection,
    gap: cs.gap, rowGap: cs.rowGap, columnGap: cs.columnGap,
    padding: cs.padding, gridTemplateColumns: cs.gridTemplateColumns
  };
});

// --- Size Guard ---
var result = {
  interactiveElements: interactiveElements,
  textNodes: textNodes,
  formFields: formFields,
  formContainers: formContainers
};
var serialized = JSON.stringify(result);
if (serialized.length > 20000) {
  result.textNodes = textNodes.slice(0, 100);
  result._truncated = true;
  result._originalTextNodeCount = textNodes.length;
}

return result;
