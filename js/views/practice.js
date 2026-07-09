/* R&W practice: hub with skill filter grid + question player with instant per-choice
 * explanations and a pacing chip. Hard difficulty only. */
(function (S) {
  'use strict';
  S.views = S.views || {};

  function accuracyFor(qids) {
    var state = S.state.get();
    var attempted = 0, correct = 0;
    qids.forEach(function (id) {
      var h = state.qhist[id];
      if (h && h.attempts.length) {
        attempted += 1;
        if (h.attempts[h.attempts.length - 1].correct) correct += 1;
      }
    });
    return { attempted: attempted, correct: correct };
  }

  // ---------- hub ----------
  function renderHub(main) {
    var el = S.util.el;
    main.appendChild(el('h1', null, ['Reading & Writing Practice']));
    main.appendChild(el('p', { 'class': 'muted' }, [
      'Hard-difficulty questions only — the level that decides an 800. Every answer choice has an explanation, and every miss goes to your error log.'
    ]));

    var mixedIds = S.data.bank().map(function (q) { return q.id; });
    var mixedAcc = accuracyFor(mixedIds);
    main.appendChild(el('div', { 'class': 'card' }, [
      el('div', { 'class': 'row-between wrap' }, [
        el('div', null, [
          el('h2', { 'class': 'mb-0' }, ['Mixed hard set']),
          el('p', { 'class': 'small muted mb-0' }, ['All 11 question types interleaved — the way the real test feels. ' + mixedAcc.attempted + '/' + mixedIds.length + ' attempted.'])
        ]),
        el('a', { 'class': 'btn btn-primary', href: '#/practice/mixed' }, ['Start mixed practice'])
      ])
    ]));

    Object.keys(S.data.DOMAINS).forEach(function (dk) {
      var dom = S.data.DOMAINS[dk];
      main.appendChild(el('h2', { 'class': 'mt-5' }, [dom.label]));
      main.appendChild(el('div', { 'class': 'grid grid-3 skill-grid' }, dom.skills.map(function (skill) {
        var qs = S.data.bankBySkill(skill);
        var acc = accuracyFor(qs.map(function (q) { return q.id; }));
        return el('a', { 'class': 'card card-link', href: '#/practice/' + skill }, [
          el('h3', null, [S.data.SKILL_LABELS[skill]]),
          el('div', { 'class': 'count' }, [
            qs.length + ' questions · ' + acc.attempted + ' attempted' +
            (acc.attempted ? ' · ' + Math.round(acc.correct / acc.attempted * 100) + '%' : '')
          ]),
          S.ui.bar(qs.length ? acc.attempted / qs.length : 0)
        ]);
      })));
    });
  }

  // ---------- runner ----------
  function renderRun(main, params) {
    var el = S.util.el;
    var skill = params.skill;
    var state = S.state.get();
    var pool;
    var title;
    if (skill === 'mixed') {
      pool = S.util.shuffle(S.data.bank());
      title = 'Mixed hard set';
    } else {
      pool = S.data.bankBySkill(skill).slice();
      title = S.data.SKILL_LABELS[skill] || skill;
    }
    if (!pool.length) {
      main.appendChild(el('h1', null, [title]));
      main.appendChild(el('div', { 'class': 'empty' }, [
        el('div', { 'class': 'big' }, ['⏳']),
        el('p', null, ['Questions for this skill have not been loaded yet.'])
      ]));
      return;
    }
    // unattempted first, then wrong-last-attempt, then rest
    pool.sort(function (a, b) { return orderKey(a) - orderKey(b); });
    function orderKey(q) {
      var h = state.qhist[q.id];
      if (!h || !h.attempts.length) return 0;
      return h.attempts[h.attempts.length - 1].correct ? 2 : 1;
    }

    var idx = 0, selected = null, revealed = false, eliminated = [];
    var sessionCorrect = 0, sessionTotal = 0;
    var watch = S.timer.Stopwatch();
    var pacingTimer = null;

    main.appendChild(el('h1', null, [title]));
    var stage = el('div');
    main.appendChild(stage);

    function draw() {
      S.util.clear(stage);
      if (pacingTimer) { clearInterval(pacingTimer); pacingTimer = null; }
      var q = pool[idx % pool.length];

      var pacingChip = el('span', { 'class': 'chip pacing-chip' }, ['0s / ' + q.targetSeconds + 's']);
      if (S.state.get().settings.pacingIndicator && !revealed) {
        pacingTimer = setInterval(function () {
          var s = Math.round(watch.seconds());
          pacingChip.textContent = s + 's / ' + q.targetSeconds + 's';
          pacingChip.classList.toggle('pacing-over', s > q.targetSeconds);
        }, 1000);
      }

      stage.appendChild(el('div', { 'class': 'q-meta' }, [
        el('span', { 'class': 'chip chip-accent' }, [S.data.SKILL_LABELS[q.skill] || q.skill]),
        el('span', { 'class': 'chip chip-bad' }, ['Hard']),
        S.state.get().settings.pacingIndicator ? pacingChip : null,
        el('span', { 'class': 'chip', style: 'margin-left:auto' }, [sessionCorrect + ' / ' + sessionTotal + ' this session'])
      ]));

      stage.appendChild(S.question.render(q, {
        selected: selected,
        revealed: revealed,
        eliminated: eliminated,
        eliminator: true,
        onEliminate: function (i, on) {
          if (on) eliminated.push(i);
          else eliminated = eliminated.filter(function (x) { return x !== i; });
          draw();
        },
        onSelect: function (i) {
          if (revealed) return;
          selected = i;
          revealed = true;
          if (pacingTimer) { clearInterval(pacingTimer); pacingTimer = null; }
          sessionTotal += 1;
          var correct = i === q.answer;
          if (correct) sessionCorrect += 1;
          S.state.recordAttempt(q.id, { correct: correct, choice: i, seconds: watch.seconds(), mode: 'practice' });
          S.state.checkGoal();
          if (!correct) S.flows.missDialog(q, i, 'practice', draw);
          draw();
        }
      }));

      if (revealed) {
        var spent = Math.round(watch.seconds());
        stage.appendChild(el('div', { 'class': 'row-between mt-4' }, [
          el('span', { 'class': 'small muted' }, [
            'Time: ' + spent + 's (target ' + q.targetSeconds + 's)' + (spent > q.targetSeconds ? ' — over pace' : ' — on pace')
          ]),
          el('button', {
            'class': 'btn btn-primary', type: 'button',
            onclick: function () {
              idx += 1; selected = null; revealed = false; eliminated = [];
              watch.restart(); draw();
            }
          }, ['Next question →'])
        ]));
      }
    }

    draw();
    return function unmount() { if (pacingTimer) clearInterval(pacingTimer); };
  }

  S.views.practiceHub = { render: renderHub };
  S.views.practiceRun = { render: renderRun };
})(window.SATPrep = window.SATPrep || {});
