// extract-scroll-to-bottom.js — Incremental scroll for progressive-load pages
// Returns: { iterations, finalHeight, initialHeight, stable }
// Replaces single-shot scrollTo for pages like Airbnb that lazy-load content
// as you scroll (swimlanes, footer, category bar appear progressively).
//
// Pattern: scroll by viewport height, wait 1.5s for new content to load,
// check if document.body.scrollHeight grew, repeat until stable (max 20 iterations).
// Then scroll back to top.
//
// NOTE: Returns a Promise — Playwright's page.evaluate awaits it automatically.
// NOTE: No IIFE wrapper — Playwright MCP wraps this in () => { ... } automatically.

var maxIterations = 20;
var waitMs = 1500;
var initialHeight = document.body.scrollHeight;

return new Promise(function(resolve) {
  var iteration = 0;
  var lastHeight = initialHeight;

  function scrollStep() {
    window.scrollBy(0, window.innerHeight);
    iteration++;

    setTimeout(function() {
      var newHeight = document.body.scrollHeight;
      if (newHeight === lastHeight || iteration >= maxIterations) {
        // Stable or max reached — scroll back to top
        window.scrollTo(0, 0);
        resolve({
          iterations: iteration,
          initialHeight: initialHeight,
          finalHeight: newHeight,
          stable: newHeight === lastHeight,
          grew: newHeight > initialHeight
        });
      } else {
        lastHeight = newHeight;
        scrollStep();
      }
    }, waitMs);
  }

  scrollStep();
});
