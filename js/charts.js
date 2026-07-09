/* Declarative SVG chart renderer (bar / groupedBar / line) — no libraries, theme-aware,
 * with generated aria-label and a data-table fallback. */
(function (S) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var W = 640, H = 400;

  function svgEl(tag, attrs, children) {
    var node = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v !== null && v !== undefined) node.setAttribute(k, String(v));
    });
    (children || []).forEach(function (c) {
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var candidates = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] * mag >= v) return candidates[i] * mag;
    }
    return 10 * mag;
  }

  function fmt(v, yFormat) {
    var s = (Math.round(v * 100) / 100).toString();
    if (yFormat === 'percent') return s + '%';
    if (yFormat && yFormat !== 'number') return s + ' ' + yFormat;
    return s;
  }

  function render(spec) {
    var el = S.util.el;
    var margin = { top: 44, right: 24, bottom: spec.series.length > 1 ? 92 : 64, left: 68 };
    var iw = W - margin.left - margin.right;
    var ih = H - margin.top - margin.bottom;

    var allVals = [];
    spec.series.forEach(function (s) { allVals = allVals.concat(s.values); });
    var yMin = spec.yMin !== undefined ? spec.yMin : 0;
    var yMax = spec.yMax !== undefined ? spec.yMax : niceMax(Math.max.apply(null, allVals));
    if (yMax <= yMin) yMax = yMin + 1;
    var tickStep = spec.yTickStep || niceMax((yMax - yMin) / 5);
    function yPos(v) { return margin.top + ih - ((v - yMin) / (yMax - yMin)) * ih; }

    var n = spec.categories.length;
    var band = iw / n;
    var inner = band * 0.7;

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': (spec.type === 'line' ? 'Line' : 'Bar') + ' chart: ' + spec.title + '. ' +
        (spec.xLabel || 'Category') + ' versus ' + (spec.yLabel || 'value') + ', ' +
        n + ' categories, ' + spec.series.length + ' series. Data table available below the chart.'
    });
    svg.style.width = '100%';
    svg.style.height = 'auto';

    // defs: hatch patterns for series 1 and 2 (redundant encoding)
    var defs = svgEl('defs');
    var p1 = svgEl('pattern', { id: 'hatch1', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    p1.appendChild(svgEl('rect', { width: 6, height: 6, fill: 'var(--chart-s1)' }));
    p1.appendChild(svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'var(--bg-elevated)', 'stroke-width': 2.5 }));
    var p2 = svgEl('pattern', { id: 'hatch2', width: 7, height: 7, patternUnits: 'userSpaceOnUse' });
    p2.appendChild(svgEl('rect', { width: 7, height: 7, fill: 'var(--chart-s2)' }));
    p2.appendChild(svgEl('circle', { cx: 3.5, cy: 3.5, r: 1.4, fill: 'var(--bg-elevated)' }));
    defs.appendChild(p1); defs.appendChild(p2);
    svg.appendChild(defs);

    // title
    svg.appendChild(svgEl('text', { x: W / 2, y: 22, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 600, 'class': 'chart-title' }, [spec.title || '']));

    // y grid + ticks
    for (var t = yMin; t <= yMax + 1e-9; t += tickStep) {
      var y = yPos(t);
      svg.appendChild(svgEl('line', { x1: margin.left, y1: y, x2: W - margin.right, y2: y, 'class': 'grid-line' }));
      svg.appendChild(svgEl('text', { x: margin.left - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 12 }, [fmt(t, spec.yFormat)]));
    }
    // axes labels
    if (spec.yLabel) {
      var yl = svgEl('text', { x: 16, y: margin.top + ih / 2, 'font-size': 13, 'text-anchor': 'middle', transform: 'rotate(-90 16 ' + (margin.top + ih / 2) + ')' }, [spec.yLabel]);
      svg.appendChild(yl);
    }
    if (spec.xLabel) {
      svg.appendChild(svgEl('text', { x: margin.left + iw / 2, y: H - (spec.series.length > 1 ? 34 : 10), 'font-size': 13, 'text-anchor': 'middle' }, [spec.xLabel]));
    }
    // axis line
    svg.appendChild(svgEl('line', { x1: margin.left, y1: margin.top + ih, x2: W - margin.right, y2: margin.top + ih, 'class': 'axis-line' }));

    var seriesFill = ['var(--chart-s0)', 'url(#hatch1)', 'url(#hatch2)'];

    if (spec.type === 'line') {
      spec.series.forEach(function (s, si) {
        var pts = s.values.map(function (v, i) {
          return (margin.left + band * i + band / 2) + ',' + yPos(v);
        }).join(' ');
        svg.appendChild(svgEl('polyline', {
          points: pts, fill: 'none', 'class': 'series-' + si,
          'stroke-width': 2.5, 'stroke-dasharray': si === 1 ? '7 4' : (si === 2 ? '2 4' : null)
        }));
        s.values.forEach(function (v, i) {
          svg.appendChild(svgEl('circle', { cx: margin.left + band * i + band / 2, cy: yPos(v), r: 4, 'class': 'series-' + si }));
          if (spec.valueLabels) {
            svg.appendChild(svgEl('text', { x: margin.left + band * i + band / 2, y: yPos(v) - 9, 'text-anchor': 'middle', 'font-size': 11 }, [fmt(v, spec.yFormat)]));
          }
        });
      });
    } else {
      var groups = spec.series.length;
      var bw = inner / groups;
      spec.series.forEach(function (s, si) {
        s.values.forEach(function (v, i) {
          var x = margin.left + band * i + (band - inner) / 2 + bw * si;
          var y = yPos(v);
          svg.appendChild(svgEl('rect', {
            x: x, y: y, width: Math.max(2, bw - 3), height: Math.max(0, margin.top + ih - y),
            fill: seriesFill[si], 'class': si === 0 ? 'series-0' : null, rx: 2
          }));
          if (spec.valueLabels) {
            svg.appendChild(svgEl('text', { x: x + bw / 2 - 1.5, y: y - 5, 'text-anchor': 'middle', 'font-size': 11 }, [fmt(v, spec.yFormat)]));
          }
        });
      });
    }

    // x category labels (wrap long ones onto two lines)
    spec.categories.forEach(function (cat, i) {
      var cx = margin.left + band * i + band / 2;
      var label = String(cat);
      var text = svgEl('text', { x: cx, y: margin.top + ih + 18, 'text-anchor': 'middle', 'font-size': 12 });
      if (label.length > 11 && label.indexOf(' ') !== -1) {
        var half = Math.ceil(label.split(' ').length / 2);
        var words = label.split(' ');
        var l1 = words.slice(0, half).join(' '), l2 = words.slice(half).join(' ');
        text.appendChild(svgEl('tspan', { x: cx, dy: 0 }, [l1]));
        text.appendChild(svgEl('tspan', { x: cx, dy: 14 }, [l2]));
      } else {
        text.appendChild(document.createTextNode(label));
      }
      svg.appendChild(text);
    });

    // legend
    if (spec.series.length > 1 || spec.legend) {
      var lx = margin.left, ly = H - 12;
      spec.series.forEach(function (s, si) {
        svg.appendChild(svgEl('rect', { x: lx, y: ly - 11, width: 14, height: 12, fill: seriesFill[si], rx: 2, 'class': si === 0 ? 'series-0' : null }));
        var lt = svgEl('text', { x: lx + 20, y: ly, 'font-size': 12 }, [s.name || ('Series ' + (si + 1))]);
        svg.appendChild(lt);
        lx += 20 + 12 + (s.name || 'Series X').length * 6.6 + 22;
      });
    }

    // wrapper with data-table fallback
    var wrap = el('div', { 'class': 'chart-wrap' });
    wrap.appendChild(svg);
    if (spec.note) wrap.appendChild(el('div', { 'class': 'chart-note' }, [spec.note]));
    var table = el('table', { 'class': 'data-table' }, [
      el('thead', null, [el('tr', null, [el('th', null, [spec.xLabel || 'Category'])].concat(
        spec.series.map(function (s) { return el('th', null, [s.name || 'Value']); })
      ))]),
      el('tbody', null, spec.categories.map(function (cat, i) {
        return el('tr', null, [el('td', null, [String(cat)])].concat(
          spec.series.map(function (s) { return el('td', null, [fmt(s.values[i], spec.yFormat)]); })
        ));
      }))
    ]);
    wrap.appendChild(el('details', { 'class': 'chart-data-details' }, [
      el('summary', null, ['View data table']), table
    ]));
    return wrap;
  }

  S.charts = { render: render };
})(window.SATPrep = window.SATPrep || {});
