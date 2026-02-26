/* main.js — Vanilla JS interactions for Ramp clone */

(function() {
  'use strict';

  // ============================================
  // Tab Switching
  // ============================================
  var formPanels = document.querySelectorAll('.travel-form-panel');
  var expensePanels = document.querySelectorAll('[data-panel]');

  document.querySelectorAll('[data-tab-group]').forEach(function(group) {
    var tabs = group.querySelectorAll('[data-tab]');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.forEach(function(t) {
          t.classList.remove('tab--active', 'travel-tab--active');
        });
        if (tab.classList.contains('travel-tab')) {
          tab.classList.add('travel-tab--active');
        } else {
          tab.classList.add('tab--active');
        }

        // Update search button text for travel tabs
        var searchBtn = document.querySelector('.travel-search-btn');
        if (searchBtn && tab.closest('[data-tab-group="travel"]')) {
          var tabName = tab.dataset.tab;
          var icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
          searchBtn.innerHTML = icon + ' Search ' + tabName;
        }

        // Travel form panel switching
        if (tab.closest('[data-tab-group="travel"]')) {
          var tabName = tab.dataset.tab;
          formPanels.forEach(function(panel) {
            panel.classList.remove('travel-form-panel--active');
            if (panel.dataset.form === tabName) {
              panel.classList.add('travel-form-panel--active');
            }
          });
        }

        // Expenses tab panel switching
        if (tab.closest('[data-tab-group="expenses"]')) {
          expensePanels.forEach(function(panel) {
            panel.classList.remove('panel--active');
            if (panel.dataset.panel === tab.dataset.tab) {
              panel.classList.add('panel--active');
            }
          });
        }
      });
    });
  });

  // ============================================
  // Sidebar Navigation Active State
  // ============================================
  var path = window.location.pathname;

  // Determine which page we're on based on URL path
  var currentRoute = '/home/';
  if (path.indexOf('/home/travel/bookings') !== -1) {
    currentRoute = '/home/travel/bookings/';
  } else if (path.indexOf('/home/personal-expenses/all') !== -1) {
    currentRoute = '/home/personal-expenses/all/';
  } else if (path.indexOf('/home') !== -1) {
    currentRoute = '/home/';
  }

  document.querySelectorAll('.sidebar-nav .nav-item--sub').forEach(function(link) {
    var href = link.getAttribute('href');
    link.classList.remove('nav-item--sub-active');
    if (href === currentRoute) {
      link.classList.add('nav-item--sub-active');
    }
  });

  // ============================================
  // Dropdown Toggles
  // ============================================
  document.querySelectorAll('[data-dropdown-trigger]').forEach(function(trigger) {
    var menu = trigger.querySelector('.dropdown-menu');
    if (!menu) return;

    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      document.querySelectorAll('.dropdown-menu.dropdown--open').forEach(function(d) {
        if (d !== menu) d.classList.remove('dropdown--open');
      });
      menu.classList.toggle('dropdown--open');
    });
  });

  document.addEventListener('click', function() {
    document.querySelectorAll('.dropdown-menu.dropdown--open').forEach(function(d) {
      d.classList.remove('dropdown--open');
    });
  });

  document.querySelectorAll('.dropdown-menu .dropdown-item').forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      var trigger = item.closest('[data-dropdown-trigger]');
      var label = trigger.querySelector('.dropdown-label');
      if (label) label.textContent = item.textContent;
      item.closest('.dropdown-menu').classList.remove('dropdown--open');
    });
  });

  // ============================================
  // Search Button Feedback
  // ============================================
  var searchBtn = document.querySelector('.travel-search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', function() {
      searchBtn.style.opacity = '0.6';
      searchBtn.style.pointerEvents = 'none';
      setTimeout(function() {
        searchBtn.style.opacity = '';
        searchBtn.style.pointerEvents = '';
      }, 800);
    });
  }

  // ============================================
  // Table Checkbox Toggle
  // ============================================
  var headerCheckbox = document.querySelector('.data-table thead .checkbox');
  var rowCheckboxes = document.querySelectorAll('.data-table tbody .checkbox');

  if (headerCheckbox) {
    headerCheckbox.addEventListener('change', function() {
      var checked = headerCheckbox.checked;
      rowCheckboxes.forEach(function(cb) {
        cb.checked = checked;
        cb.closest('tr').classList.toggle('row--selected', checked);
      });
    });
  }

  rowCheckboxes.forEach(function(cb) {
    cb.addEventListener('change', function() {
      cb.closest('tr').classList.toggle('row--selected', cb.checked);
      if (headerCheckbox) {
        var allChecked = Array.from(rowCheckboxes).every(function(c) { return c.checked; });
        var someChecked = Array.from(rowCheckboxes).some(function(c) { return c.checked; });
        headerCheckbox.checked = allChecked;
        headerCheckbox.indeterminate = someChecked && !allChecked;
      }
    });
  });

  // ============================================
  // Table Footer Select Dropdown
  // ============================================
  var tableFooterLeft = document.querySelector('.table-footer-left');
  if (tableFooterLeft) {
    tableFooterLeft.addEventListener('click', function(e) {
      e.stopPropagation();
      var menu = tableFooterLeft.querySelector('.dropdown-menu');
      if (menu) menu.classList.toggle('dropdown--open');
    });
  }

  // ============================================
  // Action Card Click Feedback
  // ============================================
  document.querySelectorAll('.travel-action-card').forEach(function(card) {
    card.addEventListener('click', function(e) {
      e.preventDefault();
      card.style.background = 'var(--color-bg-card)';
      setTimeout(function() {
        card.style.background = '';
      }, 200);
    });
  });

})();
