/* Dashboard: today panel, streak calendar, vocab mastery tiers, per-skill readiness. */
(function (S) {
  'use strict';
  S.views = S.views || {};

  function render(main) {
    var el = S.util.el;
    var state = S.state.get();
    var today = S.util.todayLocal();
    var d = S.state.day(today);
    var targets = S.state.goalTargets();
    var due = S.state.dueCountToday();
    var streak = S.state.effectiveStreak();

    // goal fraction: due cleared + new words + questions
    var dueDone = due === 0 ? 1 : 0;
    var parts = [
      dueDone,
      Math.min(1, targets.newWords ? d.newWords / targets.newWords : 1),
      Math.min(1, targets.questions ? d.questions / targets.questions : 1)
    ];
    var fraction = (parts[0] + parts[1] + parts[2]) / 3;

    main.appendChild(el('h1', null, ['Dashboard']));

    // Today / goal hero
    var hero = el('div', { 'class': 'card dash-hero' }, [
      S.ui.goalRing(fraction, Math.round(fraction * 100) + '%', 'daily goal'),
      el('div', null, [
        el('div', { 'class': 'row wrap' }, [
          statCard(due, 'reviews due'),
          statCard(d.newWords + ' / ' + targets.newWords, 'new words today'),
          statCard(d.questions + ' / ' + targets.questions, 'questions today'),
          statCard('🔥 ' + streak, 'day streak (best ' + state.streak.best + ')')
        ]),
        el('div', { 'class': 'row wrap mt-3' }, [
          el('a', { 'class': 'btn btn-primary', href: '#/vocab/flashcards' }, [due > 0 ? ('Review ' + due + ' due words') : 'Learn new words']),
          el('a', { 'class': 'btn', href: '#/practice' }, ['Practice R&W']),
          redoDueCount() > 0 ? el('a', { 'class': 'btn', href: '#/review' }, ['Redo ' + redoDueCount() + ' missed']) : null
        ]),
        state.streak.freezes ? el('p', { 'class': 'small faint mt-2 mb-0' }, ['❄️ ' + state.streak.freezes + ' streak freeze' + (state.streak.freezes > 1 ? 's' : '') + ' banked']) : null
      ])
    ]);
    main.appendChild(hero);

    // Streak calendar (last 28 days)
    var cal = el('div', { 'class': 'streak-cal mt-3', role: 'img', 'aria-label': 'Activity for the last 28 days' });
    for (var i = 27; i >= 0; i--) {
      var dayStr = S.util.addDays(today, -i);
      var rec = state.days[dayStr];
      var cls = 'day' + (rec && rec.goalMet ? ' met' : (rec && rec.frozen ? ' frozen' : ''));
      cal.appendChild(el('span', { 'class': cls, title: dayStr }));
    }
    main.appendChild(el('div', { 'class': 'card mt-4' }, [
      el('h2', null, ['Consistency']),
      el('p', { 'class': 'small muted mb-0' }, ['Green = daily goal met. Spaced repetition only works if you show up on the days reviews are due.']),
      cal
    ]));

    // Vocab tiers
    var dist = S.srs.tierDistribution();
    var total = S.data.vocab().length;
    var tierBar = el('div', { 'class': 'tier-bar mt-3', role: 'img', 'aria-label': tierAria(dist, total) });
    S.srs.TIERS.forEach(function (t) {
      var n = dist[t.id];
      if (!n) return;
      tierBar.appendChild(el('span', { style: 'width:' + (n / total * 100) + '%;background:' + t.color, title: t.label + ': ' + n }));
    });
    main.appendChild(el('div', { 'class': 'card mt-4' }, [
      el('div', { 'class': 'row-between' }, [
        el('h2', { 'class': 'mb-0' }, ['Vocabulary mastery']),
        el('span', { 'class': 'chip chip-good' }, [dist.mastered + ' / ' + total + ' mastered'])
      ]),
      tierBar,
      el('div', { 'class': 'tier-legend mt-2' }, S.srs.TIERS.map(function (t) {
        return el('span', null, [el('span', { 'class': 'tier-dot', style: 'background:' + t.color }), ' ', t.label, ' (' + dist[t.id] + ')']);
      })),
      S.srs.leeches().length ? el('p', { 'class': 'small mt-3 mb-0' }, [
        el('span', { 'class': 'chip chip-warn' }, ['🐛 ' + S.srs.leeches().length + ' stubborn words']),
        ' — words you keep missing; they now always show their example sentence first.'
      ]) : null
    ]));

    // Skill readiness
    var stats = S.state.skillStats();
    var rows = S.data.SKILLS.map(function (skill) {
      var st = stats[skill];
      var acc = st && st.attempts ? st.correct / st.attempts : null;
      var avg = st && st.attempts ? Math.round(st.seconds / st.attempts) : null;
      return el('div', { 'class': 'skill-row' }, [
        el('a', { href: '#/practice/' + skill }, [S.data.SKILL_LABELS[skill]]),
        S.ui.bar(acc === null ? 0 : acc, acc !== null && acc < 0.7 ? 'bar-bad' : 'bar-good'),
        el('span', { 'class': 'small muted' }, [
          acc === null ? 'no data' : (Math.round(acc * 100) + '% · ' + avg + 's')
        ])
      ]);
    });
    // weakest skill call-to-action
    var weakest = null, weakestAcc = 1;
    S.data.SKILLS.forEach(function (skill) {
      var st = stats[skill];
      if (st && st.attempts >= 3) {
        var acc = st.correct / st.attempts;
        if (acc < weakestAcc) { weakestAcc = acc; weakest = skill; }
      }
    });
    main.appendChild(el('div', { 'class': 'card mt-4' }, [
      el('h2', null, ['Reading & Writing readiness']),
      el('p', { 'class': 'small muted' }, ['Accuracy and average time per question type. For an 800 you can miss at most ~1 question across both modules.']),
      weakest && weakestAcc < 0.8 ? el('p', null, [
        el('a', { 'class': 'btn btn-sm', href: '#/practice/' + weakest }, ['Drill your weakest skill: ' + S.data.SKILL_LABELS[weakest]])
      ]) : null,
      el('div', null, rows)
    ]));

    // Mock summary
    var mocks = S.data.mocks();
    var attempts = state.mockAttempts;
    main.appendChild(el('div', { 'class': 'card mt-4' }, [
      el('h2', null, ['Timed modules']),
      el('div', { 'class': 'row wrap' }, mocks.map(function (m) {
        var at = attempts[m.id] || [];
        var best = at.reduce(function (mx, a) { return Math.max(mx, a.raw); }, -1);
        return el('a', { 'class': 'btn', href: '#/mock' }, [
          m.title + (best >= 0 ? ' — best ' + best + '/27' : ' — not taken')
        ]);
      }))
    ]));

    function statCard(value, label) {
      return el('div', null, [
        el('div', { 'class': 'stat-value' }, [String(value)]),
        el('div', { 'class': 'stat-label' }, [label])
      ]);
    }
  }

  function redoDueCount() {
    var today = S.util.todayLocal();
    return S.state.get().errorLog.filter(function (e) {
      return !e.resolved && e.redo.nextAt <= today;
    }).length;
  }

  function tierAria(dist, total) {
    return 'Vocabulary mastery: ' + S.srs.TIERS.map(function (t) { return dist[t.id] + ' ' + t.label; }).join(', ') + ' of ' + total + ' words.';
  }

  S.views.dashboard = { render: render };
})(window.SATPrep = window.SATPrep || {});
