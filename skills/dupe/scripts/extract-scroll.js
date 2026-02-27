// extract-scroll.js — Scroll behavior extraction
// Returns: { scrollBehaviors: [...] }
// Detects scroll-driven UI: headers that hide/show, search bars that collapse,
// elements that change class/style based on scroll position.
//
// Strategy: start at top, scroll down in 200px increments, at each position
// snapshot key elements (header, nav, search bar) — capture classes, transform,
// opacity, height, position, top. Report which elements changed and at what
// scroll threshold.
//
// MUST be run AFTER extract-scroll-to-bottom.js (full page loaded) and after
// scrolling back to top. The page should be at scrollY=0 when this runs.
//
// NOTE: Returns a Promise — Playwright's page.evaluate awaits it automatically.
// NOTE: No IIFE wrapper — Playwright MCP wraps this in () => { ... } automatically.

// --- Identify candidate elements for scroll behavior ---
var candidates = [];

// Headers
var headerSels = ['header', '[role="banner"]', 'nav', '[class*="header" i]',
  '[class*="Header"]', '[class*="navbar" i]', '[class*="Navbar"]',
  '[class*="topbar" i]', '[class*="Topbar"]'];
headerSels.forEach(function(sel) {
  var els = document.querySelectorAll(sel);
  els.forEach(function(el) {
    var rect = el.getBoundingClientRect();
    if (rect.height > 0 && rect.y < 200) {
      candidates.push({ el: el, role: 'header', selector: sel });
    }
  });
});

// Search bars
var searchSels = ['[class*="search" i]', '[class*="Search"]',
  'form[role="search"]', 'input[type="search"]',
  '[class*="SearchBar"]', '[class*="search-bar"]'];
searchSels.forEach(function(sel) {
  var els = document.querySelectorAll(sel);
  els.forEach(function(el) {
    var rect = el.getBoundingClientRect();
    if (rect.height > 0 && rect.y < 300) {
      candidates.push({ el: el, role: 'searchBar', selector: sel });
    }
  });
});

// Category / filter bars
var filterSels = ['[class*="category" i]', '[class*="Category"]',
  '[class*="filter" i]', '[class*="Filter"]',
  '[class*="chip" i]', '[class*="Chip"]',
  '[role="tablist"]'];
filterSels.forEach(function(sel) {
  var els = document.querySelectorAll(sel);
  els.forEach(function(el) {
    var rect = el.getBoundingClientRect();
    if (rect.height > 0 && rect.y < 500) {
      candidates.push({ el: el, role: 'filterBar', selector: sel });
    }
  });
});

// Deduplicate by element reference
var seen = new Set();
var uniqueCandidates = [];
candidates.forEach(function(c) {
  if (!seen.has(c.el)) {
    seen.add(c.el);
    uniqueCandidates.push(c);
  }
});

// --- Snapshot function: capture current state of each candidate ---
function snapshot(scrollY) {
  return uniqueCandidates.map(function(c) {
    var rect = c.el.getBoundingClientRect();
    var cs = getComputedStyle(c.el);
    return {
      role: c.role,
      selector: c.selector,
      scrollY: scrollY,
      classes: c.el.className && typeof c.el.className === 'string'
        ? c.el.className.split(/\s+/).filter(Boolean).slice(0, 10)
        : [],
      rect: { x: Math.round(rect.x), y: Math.round(rect.y),
              w: Math.round(rect.width), h: Math.round(rect.height) },
      transform: cs.transform !== 'none' ? cs.transform : undefined,
      opacity: cs.opacity !== '1' ? cs.opacity : undefined,
      visibility: cs.visibility !== 'visible' ? cs.visibility : undefined,
      display: cs.display,
      position: cs.position,
      top: cs.top,
      height: cs.height,
      maxHeight: cs.maxHeight !== 'none' ? cs.maxHeight : undefined,
      transition: cs.transition !== 'all 0s ease 0s' ? cs.transition : undefined,
      overflow: cs.overflow !== 'visible' ? cs.overflow : undefined,
      zIndex: cs.zIndex !== 'auto' ? cs.zIndex : undefined,
      backgroundColor: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : undefined,
      boxShadow: cs.boxShadow !== 'none' ? cs.boxShadow : undefined
    };
  });
}

// --- Scroll through the page in increments, capturing snapshots ---
var scrollStep = 200;
var maxScroll = Math.min(document.body.scrollHeight, 3000); // only need top ~3000px
var waitMs = 300;

return new Promise(function(resolve) {
  var snapshots = [];
  var currentScroll = 0;

  // Capture initial state at scrollY=0
  window.scrollTo(0, 0);
  snapshots.push({ scrollY: 0, elements: snapshot(0) });

  function step() {
    currentScroll += scrollStep;
    if (currentScroll > maxScroll) {
      // Done — scroll back to top
      window.scrollTo(0, 0);

      // Analyze: find elements whose properties changed across scroll positions
      var behaviors = [];
      if (snapshots.length > 1) {
        var initial = snapshots[0].elements;
        initial.forEach(function(initEl, idx) {
          var changes = [];
          snapshots.forEach(function(snap) {
            var el = snap.elements[idx];
            if (!el) return;
            var diffs = {};
            var changed = false;
            // Compare key properties
            if (el.transform !== initEl.transform) { diffs.transform = el.transform; changed = true; }
            if (el.opacity !== initEl.opacity) { diffs.opacity = el.opacity; changed = true; }
            if (el.visibility !== initEl.visibility) { diffs.visibility = el.visibility; changed = true; }
            if (el.display !== initEl.display) { diffs.display = el.display; changed = true; }
            if (el.height !== initEl.height) { diffs.height = el.height; changed = true; }
            if (el.top !== initEl.top) { diffs.top = el.top; changed = true; }
            if (el.boxShadow !== initEl.boxShadow) { diffs.boxShadow = el.boxShadow; changed = true; }
            if (el.rect.y !== initEl.rect.y) { diffs.rectY = el.rect.y; changed = true; }
            if (el.rect.h !== initEl.rect.h) { diffs.rectH = el.rect.h; changed = true; }
            if (JSON.stringify(el.classes) !== JSON.stringify(initEl.classes)) { diffs.classes = el.classes; changed = true; }
            if (changed) {
              changes.push({ scrollY: snap.scrollY, diffs: diffs });
            }
          });
          if (changes.length > 0) {
            behaviors.push({
              role: initEl.role,
              selector: initEl.selector,
              initialState: {
                rect: initEl.rect,
                classes: initEl.classes,
                transform: initEl.transform,
                position: initEl.position,
                top: initEl.top,
                height: initEl.height,
                opacity: initEl.opacity,
                transition: initEl.transition,
                backgroundColor: initEl.backgroundColor,
                zIndex: initEl.zIndex
              },
              changes: changes
            });
          }
        });
      }

      resolve({
        candidateCount: uniqueCandidates.length,
        snapshotCount: snapshots.length,
        scrollBehaviors: behaviors
      });
      return;
    }

    window.scrollTo(0, currentScroll);
    setTimeout(function() {
      snapshots.push({ scrollY: currentScroll, elements: snapshot(currentScroll) });
      step();
    }, waitMs);
  }

  step();
});
