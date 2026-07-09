/* Utilities: DOM builder, dates, shuffle, misc. All app code hangs off window.SATPrep. */
(function (S) {
  'use strict';

  // DOM builder. el('div', {class:'x', onclick:fn}, ['text', node, ...])
  // Strings become text nodes (auto-escaped by DOM API). Never uses innerHTML.
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k.slice(0, 2) === 'on' && typeof v === 'function') {
          node.addEventListener(k.slice(2), v);
        } else if (k === 'dataset') {
          Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
        } else if (v === true) {
          node.setAttribute(k, '');
        } else {
          node.setAttribute(k, String(v));
        }
      });
    }
    appendChildren(node, children);
    return node;
  }

  function appendChildren(node, children) {
    if (children === null || children === undefined) return;
    if (!Array.isArray(children)) children = [children];
    children.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) { appendChildren(node, c); return; }
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  // ---- dates (all LOCAL date strings YYYY-MM-DD) ----
  function todayLocal() { return dateStr(new Date()); }
  function dateStr(d) {
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function addDays(str, n) {
    var p = str.split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + n);
    return dateStr(d);
  }
  function daysBetween(a, b) { // b - a in days
    var pa = a.split('-'), pb = b.split('-');
    var da = new Date(Number(pa[0]), Number(pa[1]) - 1, Number(pa[2]));
    var db = new Date(Number(pb[0]), Number(pb[1]) - 1, Number(pb[2]));
    return Math.round((db - da) / 86400000);
  }

  // ---- misc ----
  function shuffle(arr, seed) {
    var a = arr.slice();
    var rnd = seed === undefined ? Math.random : mulberry32(seed);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function mulberry32(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function debounce(fn, ms) {
    var t = null;
    var wrapped = function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { t = null; fn.apply(self, args); }, ms);
    };
    wrapped.flush = function () { if (t) { clearTimeout(t); t = null; fn(); } };
    return wrapped;
  }
  function formatClock(totalSeconds) {
    var s = Math.max(0, Math.round(totalSeconds));
    var m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }
  function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }
  function download(filename, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }
  var LETTERS = ['A', 'B', 'C', 'D'];

  S.util = {
    el: el, clear: clear, appendChildren: appendChildren,
    todayLocal: todayLocal, dateStr: dateStr, addDays: addDays, daysBetween: daysBetween,
    shuffle: shuffle, debounce: debounce, formatClock: formatClock, pct: pct,
    download: download, LETTERS: LETTERS
  };
})(window.SATPrep = window.SATPrep || {});
