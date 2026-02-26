// extract-visual.js — Consolidates sidebar, buttons, tables, images, SVGs, typography
// Returns: { sidebar, buttons, tables, images, svgIcons, typography }
(function() {
  // --- 1. Sidebar / Navigation Items ---
  var sidebarEl = document.querySelector('aside, nav, [class*="sidebar"], [class*="Sidebar"]');
  var sidebar = { items: [], containerRect: null };
  if (sidebarEl) {
    sidebar.containerRect = sidebarEl.getBoundingClientRect();
    sidebarEl.querySelectorAll('a, button, [role="button"]').forEach(function(el) {
      var rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      var cs = getComputedStyle(el);
      var svg = el.querySelector('svg');
      sidebar.items.push({
        tag: el.tagName.toLowerCase(),
        href: el.href || undefined,
        innerText: el.innerText.trim().split('\n')[0],
        rect: { x: Math.round(rect.x), y: Math.round(rect.y),
                w: Math.round(rect.width), h: Math.round(rect.height) },
        styles: {
          color: cs.color, backgroundColor: cs.backgroundColor,
          fontSize: cs.fontSize, fontWeight: cs.fontWeight,
          fontFamily: cs.fontFamily, padding: cs.padding,
          borderRadius: cs.borderRadius, gap: cs.gap,
          display: cs.display, alignItems: cs.alignItems
        },
        svg: svg ? svg.outerHTML.slice(0, 1500) : undefined,
        isActive: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
                  cs.fontWeight === '600' || cs.fontWeight === '700'
      });
    });
  }

  // --- 2. Buttons and CTAs ---
  var buttons = Array.from(document.querySelectorAll('a[role="button"], button'))
    .filter(function(el) { return el.getBoundingClientRect().width > 80; })
    .map(function(el) {
      var r = el.getBoundingClientRect();
      var cs = getComputedStyle(el);
      return {
        text: el.innerText.trim(),
        rect: { x: Math.round(r.x), y: Math.round(r.y),
                w: Math.round(r.width), h: Math.round(r.height) },
        backgroundColor: cs.backgroundColor, color: cs.color,
        border: cs.border, borderRadius: cs.borderRadius,
        fontSize: cs.fontSize, fontWeight: cs.fontWeight,
        padding: cs.padding, href: el.href || undefined
      };
    });

  // --- 3. Tables ---
  var tables = Array.from(document.querySelectorAll('table')).map(function(table) {
    var cs = getComputedStyle(table);
    var headers = Array.from(table.querySelectorAll('th')).map(function(th) {
      var thCs = getComputedStyle(th);
      return {
        text: th.textContent.trim(),
        backgroundColor: thCs.backgroundColor, padding: thCs.padding,
        fontSize: thCs.fontSize, fontWeight: thCs.fontWeight,
        position: thCs.position, left: thCs.left, right: thCs.right,
        zIndex: thCs.zIndex, width: thCs.width, borderBottom: thCs.borderBottom
      };
    });
    var firstRow = table.querySelector('tbody tr');
    var cells = firstRow ? Array.from(firstRow.querySelectorAll('td')).map(function(td) {
      var tdCs = getComputedStyle(td);
      return {
        backgroundColor: tdCs.backgroundColor, padding: tdCs.padding,
        fontSize: tdCs.fontSize, fontWeight: tdCs.fontWeight,
        position: tdCs.position, left: tdCs.left, right: tdCs.right,
        zIndex: tdCs.zIndex, width: tdCs.width, borderBottom: tdCs.borderBottom
      };
    }) : [];
    return {
      display: cs.display, tableLayout: cs.tableLayout,
      borderCollapse: cs.borderCollapse,
      headers: headers, sampleCells: cells
    };
  });

  // --- 4. Images ---
  var images = Array.from(document.querySelectorAll('img'))
    .filter(function(el) {
      var r = el.getBoundingClientRect();
      return r.width > 5 && r.height > 5;
    })
    .map(function(el) {
      var rect = el.getBoundingClientRect();
      return {
        src: el.src, alt: el.alt,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y),
                w: Math.round(rect.width), h: Math.round(rect.height) },
        borderRadius: getComputedStyle(el).borderRadius
      };
    });

  // --- 5. SVG Icons ---
  var svgIcons = Array.from(document.querySelectorAll('svg'))
    .filter(function(el) {
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    })
    .map(function(el) {
      var r = el.getBoundingClientRect();
      var parent = el.closest('a, button, [role="button"], li, div');
      return {
        outerHTML: el.outerHTML.slice(0, 2000),
        rect: { x: Math.round(r.x), y: Math.round(r.y),
                w: Math.round(r.width), h: Math.round(r.height) },
        parentSelector: parent ? (parent.className || parent.tagName) : 'unknown',
        parentText: parent ? parent.textContent.trim().slice(0, 50) : ''
      };
    });

  // --- 6. Typography + Color Palette ---
  var fonts = new Set();
  var typeScale = [];
  var seen = new Set();
  document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,span,li,td,th,label,button,input').forEach(function(el) {
    var cs = getComputedStyle(el);
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    fonts.add(cs.fontFamily);
    var key = cs.fontSize + '|' + cs.fontWeight + '|' + cs.lineHeight;
    if (!seen.has(key)) {
      seen.add(key);
      typeScale.push({
        tag: el.tagName.toLowerCase(),
        sample: el.textContent.trim().slice(0, 40),
        fontSize: cs.fontSize, fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing,
        fontFamily: cs.fontFamily, color: cs.color
      });
    }
  });

  var colors = new Map();
  document.querySelectorAll('*').forEach(function(el) {
    var cs = getComputedStyle(el);
    [cs.color, cs.backgroundColor, cs.borderColor].forEach(function(c) {
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent')
        colors.set(c, (colors.get(c) || 0) + 1);
    });
  });

  var typography = {
    fontFamilies: Array.from(fonts),
    typeScale: typeScale.sort(function(a, b) { return parseFloat(b.fontSize) - parseFloat(a.fontSize); }).slice(0, 15),
    colorPalette: Array.from(colors.entries()).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 20).map(function(entry) { return { color: entry[0], count: entry[1] }; })
  };

  return {
    sidebar: sidebar,
    buttons: buttons,
    tables: tables,
    images: images,
    svgIcons: svgIcons,
    typography: typography
  };
})()
