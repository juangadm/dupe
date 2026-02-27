// verify-structure.js — Extracts structural fingerprint for comparison between original and clone
// Returns: { elementCounts, headings, interactiveInventory, textDigest, ariaRoles, forms, navStructure, images }
// Run on both original and clone, diff the two results for quantitative comparison
// NOTE: No IIFE wrapper — Playwright MCP wraps this in () => { ... } automatically

// --- 1. Element Counts by Tag ---
var tags = ['div', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'button', 'img', 'svg',
  'input', 'select', 'textarea', 'form', 'table', 'ul', 'ol', 'li', 'video', 'iframe'];

var elementCounts = {};
tags.forEach(function(tag) {
  var count = document.querySelectorAll(tag).length;
  if (count > 0) elementCounts[tag] = count;
});
elementCounts._total = document.querySelectorAll('*').length;

// --- 2. Heading Hierarchy ---
var headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  .filter(function(el) {
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  })
  .map(function(el) {
    return {
      level: parseInt(el.tagName.charAt(1)),
      text: el.textContent.trim().slice(0, 80)
    };
  });

// --- 3. Interactive Element Inventory ---
var interactiveSelectors = [
  'a[href]', 'button', '[role="button"]', '[role="tab"]', '[role="menuitem"]',
  'input', 'select', 'textarea', '[role="combobox"]', '[role="listbox"]',
  '[aria-haspopup]', '[aria-expanded]', 'details > summary'
];

var interactiveSeen = new Set();
var interactiveInventory = [];

interactiveSelectors.forEach(function(sel) {
  Array.from(document.querySelectorAll(sel)).forEach(function(el) {
    if (interactiveSeen.has(el)) return;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    interactiveSeen.add(el);
    interactiveInventory.push({
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') || undefined,
      text: (el.innerText || '').trim().slice(0, 50),
      href: el.getAttribute('href') || undefined,
      type: el.getAttribute('type') || undefined
    });
  });
});

// --- 4. Text Digest (first 100 visible text nodes) ---
var textDigest = [];
var textWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
  acceptNode: function(node) {
    if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
    var range = document.createRange();
    range.selectNodeContents(node);
    var r = range.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return NodeFilter.FILTER_ACCEPT;
    return NodeFilter.FILTER_REJECT;
  }
});

while (textWalker.nextNode() && textDigest.length < 100) {
  var text = textWalker.currentNode.textContent.trim();
  if (text.length > 2) {
    textDigest.push(text.slice(0, 80));
  }
}

// --- 5. ARIA Roles ---
var ariaRoles = {};
Array.from(document.querySelectorAll('[role]')).forEach(function(el) {
  var role = el.getAttribute('role');
  ariaRoles[role] = (ariaRoles[role] || 0) + 1;
});

// --- 6. Form Structure ---
var forms = Array.from(document.querySelectorAll('form, [role="form"]')).map(function(form) {
  var fields = Array.from(form.querySelectorAll('input, select, textarea, [role="combobox"]'));
  return {
    action: form.getAttribute('action') || undefined,
    method: form.getAttribute('method') || undefined,
    fieldCount: fields.length,
    fields: fields.map(function(f) {
      return {
        tag: f.tagName.toLowerCase(),
        type: f.getAttribute('type') || undefined,
        name: f.getAttribute('name') || undefined,
        placeholder: f.getAttribute('placeholder') || undefined
      };
    })
  };
});

// --- 7. Nav Structure ---
var navStructure = Array.from(document.querySelectorAll('nav, [role="navigation"]')).map(function(nav) {
  var links = Array.from(nav.querySelectorAll('a[href]'));
  return {
    linkCount: links.length,
    links: links.map(function(a) {
      return {
        text: a.textContent.trim().slice(0, 40),
        href: a.getAttribute('href')
      };
    })
  };
});

// --- 8. Image Inventory ---
var imageInventory = Array.from(document.querySelectorAll('img'))
  .filter(function(el) {
    var rect = el.getBoundingClientRect();
    return rect.width > 5 && rect.height > 5;
  })
  .map(function(el) {
    var rect = el.getBoundingClientRect();
    return {
      alt: el.getAttribute('alt') || '',
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      src: el.src ? el.src.slice(0, 100) : ''
    };
  });

// --- Size Guard ---
var result = {
  elementCounts: elementCounts,
  headings: headings,
  interactiveInventory: interactiveInventory,
  textDigest: textDigest,
  ariaRoles: ariaRoles,
  forms: forms,
  navStructure: navStructure,
  images: imageInventory
};

var serialized = JSON.stringify(result);
if (serialized.length > 20000) {
  // Phase 1: Trim text digest
  result.textDigest = textDigest.slice(0, 50);
  serialized = JSON.stringify(result);
}
if (serialized.length > 20000) {
  // Phase 2: Trim interactive inventory
  result.interactiveInventory = interactiveInventory.slice(0, 50);
  result._truncated = true;
  result._originalInteractiveCount = interactiveInventory.length;
}

return result;
