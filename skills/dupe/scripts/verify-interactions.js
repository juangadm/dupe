// verify-interactions.js — Extracts testable interaction inventory for Phase 5 verification
// Returns: { interactions: [{ index, type, selector, text, expectedBehavior, rect }], count }
// Phase 5 uses this to browser_click each element and report pass/fail
// NOTE: No IIFE wrapper — Playwright MCP wraps this in () => { ... } automatically

// --- Interaction type classifiers ---
function classifyElement(el) {
  var tag = el.tagName.toLowerCase();
  var role = el.getAttribute('role');
  var ariaExpanded = el.getAttribute('aria-expanded');
  var ariaHaspopup = el.getAttribute('aria-haspopup');
  var text = (el.innerText || '').trim().slice(0, 50);

  // Tab
  if (role === 'tab' || tag === 'tab') {
    return { type: 'tab', expectedBehavior: 'Active class changes, associated panel becomes visible' };
  }

  // Dropdown / Menu trigger
  if (ariaHaspopup || ariaExpanded !== null ||
      el.closest('[data-dropdown]') ||
      role === 'combobox' || role === 'listbox') {
    return { type: 'dropdown', expectedBehavior: 'Menu/panel opens on click, aria-expanded toggles' };
  }

  // Accordion / Details
  if (tag === 'summary' || tag === 'details' ||
      el.closest('details') ||
      (role === 'button' && ariaExpanded !== null)) {
    return { type: 'accordion', expectedBehavior: 'Content panel expands/collapses' };
  }

  // Select
  if (tag === 'select') {
    var optionCount = el.querySelectorAll('option').length;
    return { type: 'select', expectedBehavior: 'Dropdown opens with ' + optionCount + ' options' };
  }

  // Text input
  if (tag === 'input' || tag === 'textarea') {
    var inputType = el.getAttribute('type') || 'text';
    if (inputType === 'checkbox' || inputType === 'radio') {
      return { type: inputType, expectedBehavior: 'Toggle checked state on click' };
    }
    return { type: 'input', expectedBehavior: 'Focus and accept text input' };
  }

  // Navigation link
  if (tag === 'a' && el.getAttribute('href')) {
    var href = el.getAttribute('href');
    if (href.startsWith('#') || href.startsWith('javascript:')) {
      return { type: 'anchor-link', expectedBehavior: 'Scrolls to section or triggers JS action' };
    }
    return { type: 'nav-link', expectedBehavior: 'Navigates to ' + href };
  }

  // Generic button
  if (tag === 'button' || role === 'button') {
    return { type: 'button', expectedBehavior: 'Click triggers visual feedback or action' };
  }

  // Menu item
  if (role === 'menuitem') {
    return { type: 'menuitem', expectedBehavior: 'Click selects or navigates' };
  }

  return { type: 'unknown', expectedBehavior: 'Click and observe DOM changes' };
}

function buildSelector(el) {
  // Try ID first
  if (el.id) return '#' + el.id;

  // Try unique class combination
  if (el.className && typeof el.className === 'string') {
    var classes = el.className.trim().split(/\s+/).filter(Boolean);
    if (classes.length > 0) {
      var candidate = el.tagName.toLowerCase() + '.' + classes.slice(0, 3).join('.');
      if (document.querySelectorAll(candidate).length === 1) return candidate;
    }
  }

  // Try role + text combination
  var role = el.getAttribute('role');
  if (role) {
    var text = (el.innerText || '').trim().slice(0, 30);
    if (text) return '[role="' + role + '"]';
  }

  // Try aria-label
  var ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) {
    return '[aria-label="' + ariaLabel.replace(/"/g, '\\"') + '"]';
  }

  // Try data attributes
  var dataAttrs = Array.from(el.attributes).filter(function(a) {
    return a.name.startsWith('data-') && a.name !== 'data-dupe-annotation';
  });
  if (dataAttrs.length > 0) {
    return '[' + dataAttrs[0].name + '="' + dataAttrs[0].value + '"]';
  }

  // Fallback: tag + nth-of-type
  var parent = el.parentElement;
  if (parent) {
    var siblings = Array.from(parent.querySelectorAll(':scope > ' + el.tagName.toLowerCase()));
    var idx = siblings.indexOf(el);
    if (idx >= 0) {
      return el.tagName.toLowerCase() + ':nth-of-type(' + (idx + 1) + ')';
    }
  }

  return el.tagName.toLowerCase();
}

// --- Find all testable elements ---
var testableSelectors = [
  '[role="tab"]',
  'button', '[role="button"]',
  '[aria-expanded]', '[aria-haspopup]',
  'details > summary',
  'select',
  'input[type="checkbox"]', 'input[type="radio"]',
  'a[href^="#"]',
  '[role="menuitem"]'
];

var seen = new Set();
var interactions = [];

testableSelectors.forEach(function(sel) {
  Array.from(document.querySelectorAll(sel)).forEach(function(el) {
    if (seen.has(el)) return;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    // Skip offscreen elements
    if (rect.bottom < 0 || rect.top > window.innerHeight * 2) return;
    seen.add(el);

    var classification = classifyElement(el);
    var selector = buildSelector(el);

    interactions.push({
      index: interactions.length + 1,
      type: classification.type,
      selector: selector,
      text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 50),
      expectedBehavior: classification.expectedBehavior,
      rect: {
        x: Math.round(rect.x), y: Math.round(rect.y),
        w: Math.round(rect.width), h: Math.round(rect.height)
      },
      ariaExpanded: el.getAttribute('aria-expanded') || undefined,
      ariaHaspopup: el.getAttribute('aria-haspopup') || undefined
    });
  });
});

// --- Sort by visual position ---
interactions.sort(function(a, b) {
  var rowA = Math.floor(a.rect.y / 50);
  var rowB = Math.floor(b.rect.y / 50);
  if (rowA !== rowB) return rowA - rowB;
  return a.rect.x - b.rect.x;
});

// Re-index after sort
interactions.forEach(function(item, i) {
  item.index = i + 1;
});

// --- Size Guard ---
var result = { interactions: interactions, count: interactions.length };
var serialized = JSON.stringify(result);
if (serialized.length > 20000) {
  result.interactions = interactions.slice(0, 40);
  result._truncated = true;
  result._originalCount = interactions.length;
}

return result;
