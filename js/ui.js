/* UI primitives: modal (focus-trapped), toast, theme, goal ring, header rendering. */
(function (S) {
  'use strict';

  function toast(msg, ms) {
    var el = S.util.el;
    var root = document.getElementById('toast-root');
    var t = el('div', { 'class': 'toast' }, [msg]);
    root.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, ms || 3200);
  }

  var activeModal = null;
  function modal(opts) {
    // opts: {title, body: node|node[], actions: [{label, class, onClick, keepOpen}], dismissible}
    var el = S.util.el;
    close();
    var root = document.getElementById('modal-root');
    var dismissible = opts.dismissible !== false;
    var previouslyFocused = document.activeElement;

    var box = el('div', { 'class': 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title || 'Dialog' });
    if (opts.title) box.appendChild(el('h2', null, [opts.title]));
    S.util.appendChildren(box, opts.body);
    if (opts.actions && opts.actions.length) {
      box.appendChild(el('div', { 'class': 'row mt-4', style: 'justify-content:flex-end' },
        opts.actions.map(function (a) {
          return el('button', {
            'class': 'btn ' + (a.class || ''), type: 'button',
            onclick: function () {
              var result = a.onClick ? a.onClick() : undefined;
              if (result !== false && !a.keepOpen) close();
            }
          }, [a.label]);
        })
      ));
    }
    var backdrop = el('div', {
      'class': 'modal-backdrop',
      onclick: function (e) { if (dismissible && e.target === backdrop) close(); }
    }, [box]);
    root.appendChild(backdrop);
    activeModal = { backdrop: backdrop, previouslyFocused: previouslyFocused, keyHandler: keyHandler };
    document.addEventListener('keydown', keyHandler, true);
    var focusables = box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusables.length) focusables[0].focus(); else box.setAttribute('tabindex', '-1'), box.focus();

    function keyHandler(e) {
      if (e.key === 'Escape' && dismissible) { e.stopPropagation(); close(); }
      if (e.key === 'Tab') {
        var f = box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    return { close: close };
  }
  function close() {
    if (!activeModal) return;
    document.removeEventListener('keydown', activeModal.keyHandler, true);
    if (activeModal.backdrop.parentNode) activeModal.backdrop.parentNode.removeChild(activeModal.backdrop);
    if (activeModal.previouslyFocused && activeModal.previouslyFocused.focus) activeModal.previouslyFocused.focus();
    activeModal = null;
  }

  // ---- theme ----
  function applyTheme() {
    var pref = S.state.get().settings.theme;
    var dark = pref === 'dark' || (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
  function cycleTheme() {
    var order = ['auto', 'light', 'dark'];
    var cur = S.state.get().settings.theme;
    var next = order[(order.indexOf(cur) + 1) % order.length];
    S.state.updateSettings({ theme: next });
    applyTheme();
    toast('Theme: ' + next);
  }

  // ---- goal ring ----
  function goalRing(fraction, labelTop, labelBottom) {
    var el = S.util.el;
    var r = 52, c = 2 * Math.PI * r;
    var off = c * (1 - Math.min(1, Math.max(0, fraction)));
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.setAttribute('width', '120'); svg.setAttribute('height', '120');
    var bg = document.createElementNS(svgNS, 'circle');
    bg.setAttribute('cx', '60'); bg.setAttribute('cy', '60'); bg.setAttribute('r', String(r));
    bg.setAttribute('fill', 'none'); bg.setAttribute('stroke', 'var(--bg-sunken)'); bg.setAttribute('stroke-width', '10');
    var fg = document.createElementNS(svgNS, 'circle');
    fg.setAttribute('cx', '60'); fg.setAttribute('cy', '60'); fg.setAttribute('r', String(r));
    fg.setAttribute('fill', 'none'); fg.setAttribute('stroke', fraction >= 1 ? 'var(--good)' : 'var(--accent)');
    fg.setAttribute('stroke-width', '10'); fg.setAttribute('stroke-linecap', 'round');
    fg.setAttribute('stroke-dasharray', String(c)); fg.setAttribute('stroke-dashoffset', String(off));
    svg.appendChild(bg); svg.appendChild(fg);
    return el('div', { 'class': 'goal-ring', role: 'img', 'aria-label': 'Daily goal ' + Math.round(fraction * 100) + '% complete' }, [
      svg,
      el('div', { 'class': 'ring-label' }, [labelTop, el('span', { 'class': 'small muted' }, [labelBottom || ''])])
    ]);
  }

  function bar(fraction, cls) {
    var el = S.util.el;
    var span = el('span', { style: 'width:' + Math.round(Math.min(1, Math.max(0, fraction)) * 100) + '%' });
    return el('div', { 'class': 'bar ' + (cls || '') }, [span]);
  }

  // ---- header ----
  var NAV = [
    { hash: '#/dashboard', label: 'Dashboard' },
    { hash: '#/vocab', label: 'Vocabulary' },
    { hash: '#/practice', label: 'R&W Practice' },
    { hash: '#/mock', label: 'Timed Module' },
    { hash: '#/review', label: 'Review' },
    { hash: '#/settings', label: 'Settings' }
  ];
  function renderHeader() {
    var el = S.util.el;
    var header = document.getElementById('app-header');
    S.util.clear(header);
    var current = location.hash || '#/dashboard';
    var streak = S.state.effectiveStreak();
    header.appendChild(el('div', { 'class': 'header-inner' }, [
      el('a', { 'class': 'brand', href: '#/dashboard' }, ['SAT ', el('span', { 'class': 'accent' }, ['1600'])]),
      el('nav', { 'class': 'main-nav', 'aria-label': 'Main' }, NAV.map(function (n) {
        return el('a', {
          href: n.hash,
          'aria-current': current.indexOf(n.hash) === 0 ? 'page' : null
        }, [n.label]);
      })),
      el('span', { 'class': 'streak-chip', title: 'Daily-goal streak' }, ['🔥 ', String(streak)]),
      el('button', {
        'class': 'icon-btn', type: 'button', title: 'Toggle theme (auto/light/dark)',
        'aria-label': 'Toggle color theme', onclick: cycleTheme
      }, ['◐'])
    ]));
  }

  S.ui = {
    toast: toast, modal: modal, closeModal: close,
    applyTheme: applyTheme, renderHeader: renderHeader,
    goalRing: goalRing, bar: bar
  };
})(window.SATPrep = window.SATPrep || {});
