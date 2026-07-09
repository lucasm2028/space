/* Timed module player (Bluebook-style): 27 questions / 32:00, hideable deadline-based
 * timer, flag for review, answer eliminator, navigator grid, review screen, auto-submit,
 * and reload-resume against the original deadline. */
(function (S) {
  'use strict';
  S.views = S.views || {};

  // ---------- hub ----------
  function renderHub(main) {
    var el = S.util.el;
    var state = S.state.get();
    main.appendChild(el('h1', null, ['Timed Modules']));
    main.appendChild(el('p', { 'class': 'muted' }, [
      'Full 27-question, 32-minute Reading & Writing modules at hard (Module 2) difficulty — the module you must reach and beat for an 800. Average pace: ~71 seconds per question.'
    ]));

    if (state.activeMock) {
      var m = S.data.mockById(state.activeMock.mockId);
      if (m) {
        var remaining = Math.max(0, state.activeMock.deadlineEpochMs - Date.now());
        main.appendChild(el('div', { 'class': 'card', style: 'border-color:var(--warn)' }, [
          el('h2', null, ['⏸ Module in progress']),
          el('p', { 'class': 'muted' }, [m.title + ' — the clock has kept running (like the real test). ' +
            (remaining > 0 ? S.util.formatClock(remaining / 1000) + ' remaining.' : 'Time has expired; it will be submitted as-is.')]),
          el('div', { 'class': 'row' }, [
            el('a', { 'class': 'btn btn-primary', href: '#/mock/' + m.id }, [remaining > 0 ? 'Resume module' : 'View result']),
            el('button', {
              'class': 'btn btn-danger', type: 'button', onclick: function () {
                if (window.confirm('Abandon this attempt? It will not be scored.')) {
                  S.state.abandonMock();
                  S.router.navigate();
                }
              }
            }, ['Abandon'])
          ])
        ]));
      }
    }

    S.data.mocks().forEach(function (m) {
      var attempts = state.mockAttempts[m.id] || [];
      main.appendChild(el('div', { 'class': 'card mt-4' }, [
        el('div', { 'class': 'row-between wrap' }, [
          el('div', null, [
            el('h2', { 'class': 'mb-0' }, [m.title]),
            el('p', { 'class': 'small muted mb-0' }, [
              (m.questions ? m.questions.length : 0) + ' questions · ' + S.util.formatClock(m.timeLimitSeconds) + ' · ' + (m.subtitle || 'Hard difficulty')
            ])
          ]),
          el('a', { 'class': 'btn btn-primary', href: '#/mock/' + m.id }, [attempts.length ? 'Retake' : 'Start'])
        ]),
        attempts.length ? el('div', { 'class': 'mt-3' }, attempts.map(function (a, i) {
          return el('div', { 'class': 'row-between small', style: 'padding:4px 0;border-top:1px solid var(--border)' }, [
            el('span', { 'class': 'muted' }, ['Attempt ' + (i + 1) + ' — ' + new Date(a.ts).toLocaleDateString()]),
            el('span', null, [
              el('strong', null, [a.raw + ' / ' + a.answers.length]), ' ',
              el('a', { href: '#/results/' + m.id + '/' + i }, ['report'])
            ])
          ]);
        })) : null
      ]));
    });
  }

  // ---------- player ----------
  function renderRun(main, params) {
    var el = S.util.el;
    var mock = S.data.mockById(params.id);
    if (!mock || !mock.questions || !mock.questions.length) {
      main.appendChild(el('div', { 'class': 'empty' }, [
        el('div', { 'class': 'big' }, ['⏳']),
        el('p', null, ['This module has not been loaded yet.']),
        el('a', { 'class': 'btn', href: '#/mock' }, ['Back'])
      ]));
      return;
    }
    var state = S.state.get();
    var am = state.activeMock && state.activeMock.mockId === mock.id ? state.activeMock : null;
    var countdown = null;
    var qStart = Date.now();
    var mode = am ? 'player' : 'intro'; // intro | player | review
    var timerEl = null, liveRegion = null;
    var submitted = false;

    var stage = el('div');
    main.appendChild(stage);

    function elapsedTrack() {
      if (!am) return;
      var i = am.currentIndex;
      am.seconds[i] = (am.seconds[i] || 0) + (Date.now() - qStart) / 1000;
      qStart = Date.now();
    }

    // ---- intro ----
    function drawIntro() {
      S.util.clear(stage);
      stage.appendChild(el('div', { 'class': 'mock-intro card' }, [
        el('h1', null, [mock.title]),
        el('p', { 'class': 'muted' }, [mock.subtitle || '']),
        el('div', { 'class': 'passage-text', style: 'white-space:normal' }, [
          el('p', null, [el('strong', null, ['DIRECTIONS'])]),
          el('p', null, ['The questions in this section address a number of important reading and writing skills. Each question includes one or more passages, which may include a table or graph. Read each passage and question carefully, and then choose the best answer to the question based on the passage(s).']),
          el('p', null, ['All questions in this section are multiple-choice with four answer choices. Each question has a single best answer.'])
        ]),
        el('ul', { 'class': 'small muted' }, [
          el('li', null, [mock.questions.length + ' questions — ' + S.util.formatClock(mock.timeLimitSeconds) + '. The timer keeps running even if you close the tab, exactly like the real test.']),
          el('li', null, ['Flag questions to revisit them; cross out choices with the ⊘ eliminator.']),
          el('li', null, ['You will see a review screen before submitting. Unanswered questions score 0 — never leave blanks.'])
        ]),
        el('div', { 'class': 'center mt-4' }, [
          el('button', {
            'class': 'btn btn-primary btn-lg', type: 'button',
            onclick: function () {
              am = S.state.startMock(mock.id, mock.timeLimitSeconds);
              qStart = Date.now();
              mode = 'player';
              startClock();
              draw();
            }
          }, ['Begin module'])
        ])
      ]));
    }

    // ---- clock ----
    function startClock() {
      if (countdown) countdown.stop();
      countdown = S.timer.Countdown(am.deadlineEpochMs, {
        onTick: function (sec) {
          if (timerEl) {
            timerEl.textContent = am.timerVisible ? S.util.formatClock(sec) : '••:••';
            timerEl.classList.toggle('low', sec <= 300);
          }
        },
        onFiveMinutes: function () {
          if (liveRegion) liveRegion.textContent = '5 minutes remaining';
          S.ui.toast('5 minutes remaining');
        },
        onExpire: function () {
          if (!submitted) {
            S.ui.toast('Time expired — module submitted.');
            submit();
          }
        }
      }).start();
    }

    // ---- player ----
    function drawPlayer() {
      S.util.clear(stage);
      var i = am.currentIndex;
      var q = mock.questions[i];
      var flagged = am.flagged.indexOf(i) !== -1;
      var elim = am.eliminated[i] || [];

      liveRegion = el('span', { 'class': 'visually-hidden', 'aria-live': 'assertive' });
      timerEl = el('span', { 'class': 'mock-timer', role: 'timer', 'aria-label': 'time remaining' },
        [am.timerVisible ? S.util.formatClock(countdown ? countdown.remainingSec() : 0) : '••:••']);

      var header = el('div', { 'class': 'mock-header' }, [
        el('div', { 'class': 'mock-header-inner' }, [
          el('span', { 'class': 'chip' }, ['Question ' + (i + 1) + ' of ' + mock.questions.length]),
          el('span', null, [timerEl, ' ', el('button', {
            'class': 'btn btn-ghost btn-sm', type: 'button',
            'aria-label': am.timerVisible ? 'Hide timer' : 'Show timer',
            onclick: function () { am.timerVisible = !am.timerVisible; persist(); draw(); }
          }, [am.timerVisible ? 'Hide' : 'Show'])]),
          el('span', null, [
            el('button', {
              'class': 'btn btn-sm flag-btn', type: 'button', 'aria-pressed': flagged ? 'true' : 'false',
              onclick: function () {
                if (flagged) am.flagged = am.flagged.filter(function (x) { return x !== i; });
                else am.flagged.push(i);
                persist(); draw();
              }
            }, [flagged ? '🚩 Flagged' : '⚐ Flag']),
            ' ',
            el('button', { 'class': 'btn btn-sm', type: 'button', onclick: function () { drawNavPopover(); } }, ['☰ ' + answeredCount() + '/' + mock.questions.length])
          ]),
          liveRegion
        ])
      ]);
      stage.appendChild(header);

      stage.appendChild(S.question.render(q, {
        selected: am.answers[i] === undefined ? null : am.answers[i],
        eliminated: elim,
        eliminator: true,
        revealed: false,
        onSelect: function (c) {
          am.answers[i] = c;
          persist(); draw();
        },
        onEliminate: function (c, on) {
          var arr = am.eliminated[i] || (am.eliminated[i] = []);
          if (on) { if (arr.indexOf(c) === -1) arr.push(c); }
          else am.eliminated[i] = arr.filter(function (x) { return x !== c; });
          persist(); draw();
        }
      }));

      stage.appendChild(el('div', { 'class': 'mock-footer q-frame' }, [
        el('button', {
          'class': 'btn', type: 'button', disabled: i === 0 ? true : null,
          onclick: function () { goTo(i - 1); }
        }, ['← Back']),
        i === mock.questions.length - 1
          ? el('button', { 'class': 'btn btn-primary', type: 'button', onclick: function () { elapsedTrack(); mode = 'review'; draw(); } }, ['Review & submit'])
          : el('button', { 'class': 'btn btn-primary', type: 'button', onclick: function () { goTo(i + 1); } }, ['Next →'])
      ]));
    }

    function answeredCount() {
      var n = 0;
      for (var j = 0; j < mock.questions.length; j++) if (am.answers[j] !== undefined && am.answers[j] !== null) n += 1;
      return n;
    }

    function goTo(i) {
      elapsedTrack();
      am.currentIndex = Math.max(0, Math.min(mock.questions.length - 1, i));
      persist();
      draw();
    }

    function persist() { S.state.saveMockProgress(); }

    function drawNavPopover() {
      var el2 = S.util.el;
      S.ui.modal({
        title: 'Question navigator',
        body: [
          el2('div', { 'class': 'review-legend' }, [
            el2('span', null, ['⬜ unanswered']), el2('span', null, ['🟦 answered']), el2('span', null, ['🚩 flagged'])
          ]),
          el2('div', { 'class': 'nav-grid mt-3' }, mock.questions.map(function (_, j) {
            var answered = am.answers[j] !== undefined && am.answers[j] !== null;
            var flagged = am.flagged.indexOf(j) !== -1;
            return el2('button', {
              'class': 'nav-cell' + (answered ? ' answered' : '') + (j === am.currentIndex ? ' current' : ''),
              type: 'button',
              'aria-label': 'Question ' + (j + 1) + (answered ? ', answered' : ', unanswered') + (flagged ? ', flagged' : ''),
              onclick: function () { S.ui.closeModal(); goTo(j); }
            }, [String(j + 1), flagged ? el2('span', { 'class': 'flag-dot' }, ['🚩']) : null]);
          }))
        ],
        actions: [{ label: 'Close' }]
      });
    }

    // ---- review screen ----
    function drawReview() {
      S.util.clear(stage);
      var unanswered = [];
      for (var j = 0; j < mock.questions.length; j++) {
        if (am.answers[j] === undefined || am.answers[j] === null) unanswered.push(j + 1);
      }
      stage.appendChild(el('div', { 'class': 'mock-intro card' }, [
        el('h1', null, ['Check your work']),
        el('p', { 'class': 'muted' }, ['You can return to any question while time remains. On the real test there is no penalty for guessing — answer everything.']),
        unanswered.length ? el('p', null, [el('span', { 'class': 'chip chip-bad' }, [unanswered.length + ' unanswered: ' + unanswered.join(', ')])]) : el('p', null, [el('span', { 'class': 'chip chip-good' }, ['All questions answered'])]),
        el('div', { 'class': 'nav-grid mt-3' }, mock.questions.map(function (_, j) {
          var answered = am.answers[j] !== undefined && am.answers[j] !== null;
          var flagged = am.flagged.indexOf(j) !== -1;
          return el('button', {
            'class': 'nav-cell' + (answered ? ' answered' : ''), type: 'button',
            'aria-label': 'Go to question ' + (j + 1),
            onclick: function () { mode = 'player'; goTo(j); }
          }, [String(j + 1), flagged ? el('span', { 'class': 'flag-dot' }, ['🚩']) : null]);
        })),
        el('div', { 'class': 'row mt-4', style: 'justify-content:space-between' }, [
          el('button', { 'class': 'btn', type: 'button', onclick: function () { mode = 'player'; draw(); } }, ['← Keep working']),
          el('button', { 'class': 'btn btn-primary btn-lg', type: 'button', onclick: submit }, ['Submit module'])
        ])
      ]));
    }

    function submit() {
      if (submitted) return;
      submitted = true;
      elapsedTrack();
      if (countdown) { countdown.stop(); countdown = null; }
      S.router.clearGuard();
      var attempt = S.state.finishMock(mock, am.seconds);
      var attemptIdx = S.state.get().mockAttempts[mock.id].length - 1;
      // log misses in bulk (untagged; user can categorize in Review)
      mock.questions.forEach(function (q, j) {
        if (attempt.answers[j] !== q.answer) {
          S.state.logMiss({
            source: 'mock', qid: q.id, gist: S.question.gistOf(q),
            yourAnswer: attempt.answers[j], correctAnswer: q.answer, missTag: 'other',
            note: attempt.answers[j] === null ? 'omitted' : ''
          });
        }
      });
      location.hash = '#/results/' + mock.id + '/' + attemptIdx;
    }

    function draw() {
      if (mode === 'intro') drawIntro();
      else if (mode === 'review') drawReview();
      else drawPlayer();
    }

    // navigation guard while a mock is live
    S.router.setGuard(function (nextHash) {
      if (submitted || !am) return null;
      if (nextHash.indexOf('#/results/') === 0) return null;
      return 'Leave the timed module? The clock will KEEP RUNNING (like the real test). You can resume from the Timed Modules page.';
    });

    if (am) {
      // resuming: check expiry
      if (Date.now() >= am.deadlineEpochMs) {
        mode = 'player';
        startClock(); // will fire onExpire -> submit
      } else {
        S.ui.toast('Resumed — the clock kept running while you were away.');
        startClock();
      }
    }
    draw();

    return function unmount() {
      if (countdown) countdown.stop();
      if (am && !submitted) { elapsedTrack(); persist(); S.storage.flush(); }
      S.router.clearGuard();
    };
  }

  S.views.mockHub = { render: renderHub };
  S.views.mockRun = { render: renderRun };
})(window.SATPrep = window.SATPrep || {});
