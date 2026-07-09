/* Mock score report: raw score, routing verdict, per-skill breakdown, pacing, full review. */
(function (S) {
  'use strict';
  S.views = S.views || {};

  function render(main, params) {
    var el = S.util.el;
    var mock = S.data.mockById(params.id);
    var attempts = S.state.get().mockAttempts[params.id] || [];
    var attempt = attempts[Number(params.attempt)];
    if (!mock || !attempt) {
      main.appendChild(el('div', { 'class': 'empty' }, [
        el('p', null, ['Report not found.']),
        el('a', { 'class': 'btn', href: '#/mock' }, ['Back to modules'])
      ]));
      return;
    }
    var total = mock.questions.length;
    var pctScore = Math.round(attempt.raw / total * 100);

    main.appendChild(el('h1', null, ['Score Report — ' + mock.title]));

    main.appendChild(el('div', { 'class': 'card score-hero' }, [
      el('div', { 'class': 'score-big' }, [attempt.raw + ' / ' + total]),
      el('p', { 'class': 'muted' }, [pctScore + '% correct']),
      attempt.routedHigher
        ? el('p', null, [el('span', { 'class': 'chip chip-good' }, ['✔ On the real test, this Module 1 performance routes you to the harder Module 2 — the only path to 800'])])
        : el('p', null, [el('span', { 'class': 'chip chip-bad' }, ['✘ Below the ~65% routing bar — on the real test you would get the easier Module 2, capping your score'])]),
      el('p', { 'class': 'small muted mb-0' }, [
        attempt.raw === total ? 'Perfect module. This is 800 pace — keep it up under full-test fatigue.' :
        total - attempt.raw <= 1 ? 'One away from perfect. At the top of the scale, each miss costs 10–20 scaled points; review it until the reason is airtight.' :
        'Every miss below is in your error log. Redo them until they are resolved — precision beats volume at this level.'
      ])
    ]));

    // pacing
    var totalSec = (attempt.seconds || []).reduce(function (a, b) { return a + (b || 0); }, 0);
    main.appendChild(el('div', { 'class': 'card mt-4' }, [
      el('h2', null, ['Pacing']),
      el('p', { 'class': 'small muted mb-0' }, [
        'Total: ' + S.util.formatClock(totalSec) + ' of ' + S.util.formatClock(mock.timeLimitSeconds) +
        ' · average ' + (attempt.answers.length ? Math.round(totalSec / attempt.answers.length) : 0) + 's per question (target ~71s).'
      ])
    ]));

    // by skill
    var rows = Object.keys(attempt.bySkill).map(function (skill) {
      var st = attempt.bySkill[skill];
      return el('div', { 'class': 'skill-row' }, [
        el('a', { href: '#/practice/' + skill }, [S.data.SKILL_LABELS[skill] || skill]),
        S.ui.bar(st.t ? st.c / st.t : 0, st.c === st.t ? 'bar-good' : 'bar-bad'),
        el('span', { 'class': 'small muted' }, [st.c + ' / ' + st.t])
      ]);
    });
    main.appendChild(el('div', { 'class': 'card mt-4' }, [
      el('h2', null, ['By question type']),
      el('div', null, rows),
      el('p', { 'class': 'small muted mt-3 mb-0' }, ['Click a type to drill it in the practice bank.'])
    ]));

    // full question review
    main.appendChild(el('h2', { 'class': 'mt-5' }, ['Question-by-question review']));
    var list = el('div', { 'class': 'result-q-list' });
    mock.questions.forEach(function (q, i) {
      var chosen = attempt.answers[i];
      var correct = chosen === q.answer;
      var item = el('div', { 'class': 'card result-q ' + (correct ? 'correct' : 'wrong') }, [
        el('div', { 'class': 'row-between wrap' }, [
          el('strong', null, ['Q' + (i + 1) + ' — ' + (S.data.SKILL_LABELS[q.skill] || q.skill)]),
          el('span', { 'class': 'row' }, [
            el('span', { 'class': 'chip' }, [Math.round(attempt.seconds[i] || 0) + 's']),
            el('span', { 'class': 'chip ' + (correct ? 'chip-good' : 'chip-bad') }, [
              correct ? 'Correct' : (chosen === null || chosen === undefined ? 'Omitted' : 'Your answer: ' + S.util.LETTERS[chosen])
            ])
          ])
        ])
      ]);
      var expandBtn = el('button', { 'class': 'btn btn-sm mt-2', type: 'button' }, ['Show question & explanations']);
      var holder = el('div');
      expandBtn.addEventListener('click', function () {
        if (holder.childNodes.length) { S.util.clear(holder); expandBtn.textContent = 'Show question & explanations'; return; }
        holder.appendChild(S.question.render(q, { selected: chosen === null ? undefined : chosen, revealed: true }));
        expandBtn.textContent = 'Hide';
      });
      item.appendChild(expandBtn);
      item.appendChild(holder);
      list.appendChild(item);
    });
    main.appendChild(list);

    main.appendChild(el('div', { 'class': 'row mt-5' }, [
      el('a', { 'class': 'btn btn-primary', href: '#/review' }, ['Categorize your misses in the error log']),
      el('a', { 'class': 'btn', href: '#/mock' }, ['Back to modules'])
    ]));
  }

  S.views.results = { render: render };
})(window.SATPrep = window.SATPrep || {});
