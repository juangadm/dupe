// extract-structure.js — Consolidates structure map + content inventory + text extraction
// Returns: { structure, contentInventory, textNodes }
// Size guard: truncates textNodes if total return > 20KB
// NOTE: No IIFE wrapper — Playwright MCP wraps this in () => { ... } automatically

// --- 1. Shallow Structure Map (3 levels deep) ---
function extractStructure(el, depth) {
  if (depth > 3) return null;
  var rect = el.getBoundingClientRect();
  var cs = getComputedStyle(el);
  if (rect.width === 0 && rect.height === 0) return null;
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || undefined,
    classes: el.className && typeof el.className === 'string'
      ? el.className.split(/\s+/).filter(Boolean).slice(0, 5)
      : [],
    rect: { x: Math.round(rect.x), y: Math.round(rect.y),
            w: Math.round(rect.width), h: Math.round(rect.height) },
    display: cs.display,
    position: cs.position,
    margin: cs.margin, padding: cs.padding,
    gap: cs.gap, rowGap: cs.rowGap, columnGap: cs.columnGap,
    transition: cs.transition !== 'all 0s ease 0s' ? cs.transition : undefined,
    backgroundColor: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : undefined,
    borderRight: cs.borderRight !== 'none' && cs.borderRight !== '0px none rgb(0, 0, 0)' ? cs.borderRight : undefined,
    borderBottom: cs.borderBottom !== 'none' && cs.borderBottom !== '0px none rgb(0, 0, 0)' ? cs.borderBottom : undefined,
    zIndex: cs.zIndex !== 'auto' ? cs.zIndex : undefined,
    boxShadow: cs.boxShadow !== 'none' ? cs.boxShadow : undefined,
    childCount: el.children.length,
    children: Array.from(el.children).map(function(c) { return extractStructure(c, depth + 1); }).filter(Boolean)
  };
}

var structure = extractStructure(document.body, 0);

// --- 2. Content Inventory ---
var contentInventory = {
  tabGroups: Array.from(document.querySelectorAll('[role="tablist"], [data-tab-group]')).map(function(g) {
    return {
      tabCount: g.querySelectorAll('[role="tab"], [data-tab]').length,
      labels: Array.from(g.querySelectorAll('[role="tab"], [data-tab]')).map(function(t) { return t.textContent.trim(); })
    };
  }),
  hiddenPanels: document.querySelectorAll('[hidden], [aria-hidden="true"], [style*="display: none"]').length,
  dropdowns: Array.from(document.querySelectorAll('[data-dropdown], [aria-haspopup], select')).map(function(d) {
    return {
      text: d.textContent.trim().slice(0, 30),
      optionCount: d.querySelectorAll('option, [role="option"], li').length
    };
  }),
  forms: document.querySelectorAll('form, [role="form"]').length,
  scrollableRegions: Array.from(document.querySelectorAll('*')).filter(function(el) {
    var cs = getComputedStyle(el);
    return cs.overflow === 'auto' || cs.overflow === 'scroll' ||
           cs.overflowX === 'auto' || cs.overflowX === 'scroll' ||
           cs.overflowY === 'auto' || cs.overflowY === 'scroll';
  }).length + document.querySelectorAll('table').length
};

// --- 3. TreeWalker Text Extraction ---
var textNodes = [];
var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
  acceptNode: function(node) {
    if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
    var range = document.createRange();
    range.selectNodeContents(node);
    var r = range.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return NodeFilter.FILTER_ACCEPT;
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
    color: cs ? cs.color : undefined,
    lineHeight: cs ? cs.lineHeight : undefined,
    letterSpacing: cs ? cs.letterSpacing : undefined
  });
}

// --- Size Guard: truncate textNodes if result > 20KB ---
var result = { structure: structure, contentInventory: contentInventory, textNodes: textNodes };
var serialized = JSON.stringify(result);
if (serialized.length > 20000) {
  result.textNodes = textNodes.slice(0, 150);
  result._truncated = true;
  result._originalTextNodeCount = textNodes.length;
}

return result;
