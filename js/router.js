/* Hash router with params and navigation guards (used by the mock player). */
(function (S) {
  'use strict';
  var routes = []; // {pattern: ['mock', ':id'], view}
  var guard = null; // function returning string message if navigation should confirm
  var currentUnmount = null;
  var lastHash = null;

  function register(path, view) {
    routes.push({ parts: path.replace(/^#?\//, '').split('/'), view: view });
  }

  function setGuard(fn) { guard = fn; }
  function clearGuard() { guard = null; }

  function match(hash) {
    var clean = (hash || '').replace(/^#\/?/, '').split('?')[0];
    var segs = clean === '' ? ['dashboard'] : clean.split('/');
    for (var i = 0; i < routes.length; i++) {
      var r = routes[i];
      if (r.parts.length !== segs.length) continue;
      var params = {}, ok = true;
      for (var j = 0; j < segs.length; j++) {
        if (r.parts[j].charAt(0) === ':') params[r.parts[j].slice(1)] = decodeURIComponent(segs[j]);
        else if (r.parts[j] !== segs[j]) { ok = false; break; }
      }
      if (ok) return { view: r.view, params: params };
    }
    return null;
  }

  function navigate() {
    var hash = location.hash || '#/dashboard';
    if (guard && lastHash !== null && hash !== lastHash) {
      var msg = guard(hash);
      if (msg && !window.confirm(msg)) {
        // revert without retriggering the guard
        var g = guard; guard = null;
        location.hash = lastHash;
        setTimeout(function () { guard = g; }, 0);
        return;
      }
      clearGuard();
    }
    lastHash = hash;
    var main = document.getElementById('main');
    if (currentUnmount) { try { currentUnmount(); } catch (e) { /* non-fatal */ } currentUnmount = null; }
    S.util.clear(main);
    var m = match(hash);
    if (!m) {
      main.appendChild(S.util.el('div', { 'class': 'empty' }, [
        S.util.el('div', { 'class': 'big' }, ['🤔']),
        S.util.el('p', null, ['Page not found.']),
        S.util.el('a', { 'class': 'btn', href: '#/dashboard' }, ['Go to dashboard'])
      ]));
    } else {
      var result = m.view.render(main, m.params);
      if (typeof result === 'function') currentUnmount = result;
    }
    S.ui.renderHeader();
    window.scrollTo(0, 0);
    var h1 = main.querySelector('h1');
    if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }

  window.addEventListener('hashchange', navigate);

  S.router = { register: register, navigate: navigate, setGuard: setGuard, clearGuard: clearGuard };
})(window.SATPrep = window.SATPrep || {});
