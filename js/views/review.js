/* Review: error log with filters, redo-before-reveal queue, miss-tag analytics. */
(function (S) {
  'use strict';
  S.views = S.views || {};

  function render(main) {
    var el = S.util.el;
    var today = S.util.todayLocal();
    var state = S.state.get();

    main.appendChild(el('h1', null, ['Review & Error Log']));

    var dueRedos = state.errorLog.filter(function (e) {
      return !e.resolved && e.redo.nextAt <= today && S.data.questionById(e.qid);
    });

    // ---- redo queue ----
    var redoCard = el('div', { 'class': 'card' });
    main.appendChild(redoCard);
    drawRedoIntro();

    function drawRedoIntro() {
      S.util.clear(redoCard);
      redoCard.appendChild(el('h2', null, ['Redo queue']));
      if (!dueRedos.length) {
        redoCard.appendChild(el('p', { 'class': 'muted mb-0' }, ['Nothing due for redo. Misses come back on a 1 → 4 → 10 day ladder; two consecutive correct redos resolve them.']));
        return;
      }
      redoCard.appendChild(el('p', { 'class': 'muted' }, [
        dueRedos.length + ' missed question' + (dueRedos.length > 1 ? 's' : '') + ' due for redo. You answer FIRST, then see your original mistake — re-solving before rereading is what makes it stick.'
      ]));
      redoCard.appendChild(el('button', { 'class': 'btn btn-primary', type: 'button', onclick: function () { startRedo(0); } }, ['Start redos']));
    }

    function startRedo(k) {
      if (k >= dueRedos.length) {
        dueRedos = state.errorLog.filter(function (e) {
          return !e.resolved && e.redo.nextAt <= today && S.data.questionById(e.qid);
        });
        drawRedoIntro();
        drawLog();
        return;
      }
      var entry = dueRedos[k];
      var q = S.data.questionById(entry.qid);
      var watch = S.timer.Stopwatch();
      S.util.clear(redoCard);
      redoCard.appendChild(el('h2', null, ['Redo ' + (k + 1) + ' of ' + dueRedos.length]));
      redoCard.appendChild(el('p', { 'class': 'small muted' }, ['Missed on ' + new Date(entry.ts).toLocaleDateString() + ' (' + missLabel(entry.missTag) + '). Solve it fresh:']));
      var holder = el('div');
      redoCard.appendChild(holder);
      holder.appendChild(S.question.render(q, {
        selected: null, revealed: false, eliminator: true, eliminated: [],
        onSelect: function (i) {
          var correct = i === q.answer;
          S.state.recordAttempt(q.id, { correct: correct, choice: i, seconds: watch.seconds(), mode: 'redo' });
          S.state.recordRedo(entry.id, correct);
          S.util.clear(holder);
          holder.appendChild(S.question.render(q, { selected: i, revealed: true }));
          holder.appendChild(el('div', { 'class': 'card mt-3' }, [
            el('p', { 'class': 'mb-0' }, [
              correct
                ? (entry.redo.streak >= 2 || entry.resolved ? '✅ Resolved — two clean redos in a row.' : '✔ Correct. One more clean redo (in ' + entry.redo.schedule[entry.redo.step] + ' days) resolves it.')
                : '✘ Missed again — the ladder resets; it will return tomorrow. Original miss: you chose ' + fmtAns(entry.yourAnswer) + '.'
            ])
          ]));
          holder.appendChild(el('div', { 'class': 'row mt-3', style: 'justify-content:flex-end' }, [
            el('button', { 'class': 'btn btn-primary', type: 'button', onclick: function () { startRedo(k + 1); } }, [k + 1 >= dueRedos.length ? 'Finish' : 'Next redo →'])
          ]));
        }
      }));
    }

    // ---- miss-tag analytics ----
    var tagCounts = {};
    state.errorLog.forEach(function (e) { tagCounts[e.missTag] = (tagCounts[e.missTag] || 0) + 1; });
    if (state.errorLog.length) {
      var totalMisses = state.errorLog.length;
      main.appendChild(el('div', { 'class': 'card mt-4' }, [
        el('h2', null, ['Why you miss']),
        el('div', null, S.data.MISS_TAGS.filter(function (t) { return tagCounts[t.id]; }).map(function (t) {
          return el('div', { 'class': 'skill-row' }, [
            el('span', null, [t.label]),
            S.ui.bar(tagCounts[t.id] / totalMisses),
            el('span', { 'class': 'small muted' }, [String(tagCounts[t.id])])
          ]);
        }))
      ]));
    }

    // ---- log list ----
    var filterSource = 'all', filterResolved = 'open';
    var logWrap = el('div', { 'class': 'mt-4' });
    var filters = el('div', { 'class': 'filter-row mt-4' }, [
      sel([['all', 'All sources'], ['practice', 'Practice'], ['mock', 'Timed module'], ['vocabQuiz', 'Vocab quiz'], ['drill', 'Drill']], function (v) { filterSource = v; drawLog(); }),
      sel([['open', 'Unresolved'], ['resolved', 'Resolved'], ['all', 'All']], function (v) { filterResolved = v; drawLog(); })
    ]);
    main.appendChild(el('h2', { 'class': 'mt-5' }, ['Error log (' + state.errorLog.length + ')']));
    main.appendChild(filters);
    main.appendChild(logWrap);
    drawLog();

    function drawLog() {
      S.util.clear(logWrap);
      var items = state.errorLog.slice().reverse().filter(function (e) {
        if (filterSource !== 'all' && e.source !== filterSource) return false;
        if (filterResolved === 'open' && e.resolved) return false;
        if (filterResolved === 'resolved' && !e.resolved) return false;
        return true;
      });
      if (!items.length) {
        logWrap.appendChild(el('p', { 'class': 'muted' }, ['No entries match. Misses from any practice mode land here automatically.']));
        return;
      }
      items.slice(0, 100).forEach(function (e) {
        var q = S.data.questionById(e.qid);
        var item = el('div', { 'class': 'card mt-3 log-item' + (e.resolved ? ' resolved' : '') }, [
          el('div', { 'class': 'row-between wrap' }, [
            el('strong', null, [e.gist || e.qid]),
            el('span', { 'class': 'row' }, [
              el('span', { 'class': 'chip' }, [new Date(e.ts).toLocaleDateString()]),
              el('span', { 'class': 'chip chip-warn' }, [missLabel(e.missTag)]),
              e.resolved ? el('span', { 'class': 'chip chip-good' }, ['resolved']) : el('span', { 'class': 'chip' }, ['redo ' + e.redo.nextAt])
            ])
          ]),
          e.note ? el('p', { 'class': 'small muted mb-0' }, ['📝 ' + e.note]) : null
        ]);
        if (q) {
          var btn = el('button', { 'class': 'btn btn-sm mt-2', type: 'button' }, ['Show question']);
          var holder = el('div');
          btn.addEventListener('click', function () {
            if (holder.childNodes.length) { S.util.clear(holder); btn.textContent = 'Show question'; return; }
            holder.appendChild(S.question.render(q, { selected: e.yourAnswer === null ? undefined : e.yourAnswer, revealed: true }));
            btn.textContent = 'Hide';
          });
          item.appendChild(btn);
          item.appendChild(holder);
        }
        logWrap.appendChild(item);
      });
      if (items.length > 100) logWrap.appendChild(el('p', { 'class': 'small faint mt-2' }, ['Showing latest 100.']));
    }

    function sel(pairs, onChange) {
      var s = el('select', { onchange: function () { onChange(s.value); } },
        pairs.map(function (p) { return el('option', { value: p[0] }, [p[1]]); }));
      return s;
    }
  }

  function missLabel(tag) {
    var found = tag;
    S.data.MISS_TAGS.forEach(function (t) { if (t.id === tag) found = t.label; });
    return found;
  }
  function fmtAns(a) { return a === null || a === undefined ? 'nothing (omitted)' : S.util.LETTERS[a]; }

  S.views.review = { render: render };
})(window.SATPrep = window.SATPrep || {});
