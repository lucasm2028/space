/* SAT-style vocab quiz: fill-in-blank Words in Context, one question per word.
 * Priority: stubborn words -> due words -> started words -> unseen. Also defines the
 * shared miss dialog used by every practice surface. */
(function (S) {
  'use strict';
  S.views = S.views || {};
  S.flows = S.flows || {};

  // Shared: after a wrong answer, require a "why did I miss it" tag, then log it.
  S.flows.missDialog = function (q, chosenIdx, source, onDone) {
    var el = S.util.el;
    var picked = null;
    var noteInput = el('input', { type: 'text', placeholder: 'Optional note to future you…', style: 'width:100%;padding:8px 10px;border:1px solid var(--border-strong);border-radius:6px;background:var(--bg-elevated);color:var(--text);font:inherit' });
    var warning = el('p', { 'class': 'small', style: 'color:var(--bad);display:none' }, ['Pick a reason — naming the miss is what makes the error log work.']);
    var options = el('div', { role: 'radiogroup', 'aria-label': 'Why did you miss it?', 'class': 'grid', style: 'gap:8px' },
      S.data.MISS_TAGS.map(function (t) {
        var b = el('button', {
          'class': 'btn', type: 'button', dataset: { tag: t.id },
          onclick: function () {
            picked = t.id;
            Array.prototype.forEach.call(options.children, function (c) {
              c.classList.toggle('btn-primary', c.dataset.tag === picked);
            });
          }
        }, [t.label]);
        return b;
      }));
    S.ui.modal({
      title: 'Why did you miss it?',
      dismissible: false,
      body: [
        el('p', { 'class': 'small muted' }, ['Top scorers keep an error log: the reason, not just the miss. This question will come back tomorrow for a redo.']),
        options, el('div', { 'class': 'mt-3' }, [noteInput]), warning
      ],
      actions: [{
        label: 'Log it', class: 'btn-primary', keepOpen: false,
        onClick: function () {
          if (!picked) { warning.style.display = 'block'; return false; }
          S.state.logMiss({
            source: source, qid: q.id, gist: S.question.gistOf(q),
            yourAnswer: chosenIdx, correctAnswer: q.answer,
            missTag: picked, note: noteInput.value.trim()
          });
          if (onDone) onDone();
        }
      }]
    });
  };

  function buildQueue() {
    var state = S.state.get();
    var today = S.util.todayLocal();
    var qs = S.data.vocabQuestions();
    if (!qs.length) return [];
    var scored = [];
    qs.forEach(function (q) {
      var rec = state.srs[q.wordId];
      var hist = state.qhist[q.id];
      var lastCorrect = hist && hist.attempts.length ? hist.attempts[hist.attempts.length - 1].correct : null;
      var priority;
      if (rec && S.srs.isLeech(rec)) priority = 0;
      else if (lastCorrect === false) priority = 1;
      else if (rec && rec.due <= today && !hist) priority = 2;
      else if (rec && !hist) priority = 3;
      else if (!hist) priority = 4;
      else priority = 5 + (lastCorrect ? 1 : 0);
      scored.push({ q: q, p: priority, r: Math.random() });
    });
    scored.sort(function (a, b) { return a.p - b.p || a.r - b.r; });
    return scored.map(function (s) { return s.q; });
  }

  function render(main) {
    var el = S.util.el;
    var queue = buildQueue();
    var idx = 0, selected = null, revealed = false;
    var sessionCorrect = 0, sessionTotal = 0;
    var watch = S.timer.Stopwatch();

    main.appendChild(el('h1', null, ['SAT-Style Vocab Questions']));
    if (!queue.length) {
      main.appendChild(el('div', { 'class': 'empty' }, [
        el('div', { 'class': 'big' }, ['⏳']),
        el('p', null, ['Vocab questions have not been loaded yet.'])
      ]));
      return;
    }
    var stage = el('div');
    main.appendChild(stage);

    function draw() {
      S.util.clear(stage);
      var q = queue[idx % queue.length];
      var w = S.data.wordById(q.wordId);

      stage.appendChild(el('div', { 'class': 'q-meta' }, [
        el('span', { 'class': 'chip chip-accent' }, ['Words in Context']),
        el('span', { 'class': 'chip' }, [S.data.LIST_LABELS[w.list]]),
        S.srs.isLeech(S.state.get().srs[q.wordId]) ? el('span', { 'class': 'chip chip-warn' }, ['🐛 stubborn word']) : null,
        el('span', { 'class': 'chip', style: 'margin-left:auto' }, [sessionCorrect + ' / ' + sessionTotal + ' this session'])
      ]));

      stage.appendChild(S.question.render(q, {
        selected: selected,
        revealed: revealed,
        onSelect: function (i) {
          if (revealed) return;
          selected = i;
          revealed = true;
          sessionTotal += 1;
          var correct = i === q.answer;
          if (correct) sessionCorrect += 1;
          S.state.recordAttempt(q.id, { correct: correct, choice: i, seconds: watch.seconds(), mode: 'vocabQuiz' });
          S.state.checkGoal();
          if (!correct) {
            S.flows.missDialog(q, i, 'vocabQuiz', draw);
          }
          draw();
        }
      }));

      if (revealed) {
        var wordCard = el('div', { 'class': 'card mt-4' }, [
          el('h3', null, ['📖 ' + w.word]),
          w.definition ? el('p', { 'class': 'mb-0' }, [w.definition]) : null,
          w.synonyms && w.synonyms.length ? el('p', { 'class': 'small muted mb-0' }, ['Synonyms: ' + w.synonyms.join(', ')]) : null
        ]);
        stage.appendChild(wordCard);
        stage.appendChild(el('div', { 'class': 'row mt-4', style: 'justify-content:flex-end' }, [
          el('button', {
            'class': 'btn btn-primary', type: 'button',
            onclick: function () { idx += 1; selected = null; revealed = false; watch.restart(); draw(); }
          }, ['Next question →'])
        ]));
      }
    }

    draw();
  }

  S.views.vocabQuiz = { render: render };
})(window.SATPrep = window.SATPrep || {});
