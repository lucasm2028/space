/* Settings: daily goals, theme, pacing indicator, export/import, reset. */
(function (S) {
  'use strict';
  S.views = S.views || {};

  function render(main) {
    var el = S.util.el;
    var st = S.state.get();

    main.appendChild(el('h1', null, ['Settings']));
    var grid = el('div', { 'class': 'settings-grid' });
    main.appendChild(grid);

    // goals
    var newWords = numInput(st.settings.dailyNewWords, 0, 1000);
    var questions = numInput(st.settings.dailyPracticeQuestions, 0, 50);
    grid.appendChild(el('div', { 'class': 'card' }, [
      el('h2', null, ['Daily goal']),
      el('p', { 'class': 'small muted' }, ['The goal = clear all due reviews + learn N new words + answer M practice questions. Small and consistent beats cramming — spaced repetition needs you on the days reviews come due.']),
      el('div', { 'class': 'row wrap' }, [
        el('div', null, [el('label', { 'for': 'set-new' }, ['New words / day']), newWords]),
        el('div', null, [el('label', { 'for': 'set-q' }, ['Questions / day']), questions])
      ]),
      el('button', {
        'class': 'btn btn-primary mt-3', type: 'button',
        onclick: function () {
          S.state.updateSettings({
            dailyNewWords: clamp(newWords.value, 0, 1000, 10),
            dailyPracticeQuestions: clamp(questions.value, 0, 50, 5)
          });
          S.ui.toast('Goals saved');
        }
      }, ['Save goals'])
    ]));

    // appearance / behavior
    var themeSel = el('select', { onchange: function () { S.state.updateSettings({ theme: themeSel.value }); S.ui.applyTheme(); } }, [
      opt('auto', 'Auto (system)', st.settings.theme), opt('light', 'Light', st.settings.theme), opt('dark', 'Dark', st.settings.theme)
    ]);
    var paceSel = el('select', { onchange: function () { S.state.updateSettings({ pacingIndicator: paceSel.value === 'on' }); } }, [
      opt('on', 'Show pacing timer', st.settings.pacingIndicator ? 'on' : 'off'), opt('off', 'Hide pacing timer', st.settings.pacingIndicator ? 'on' : 'off')
    ]);
    var timerSel = el('select', { onchange: function () { S.state.updateSettings({ timerVisibleDefault: timerSel.value === 'on' }); } }, [
      opt('on', 'Timer visible', st.settings.timerVisibleDefault ? 'on' : 'off'), opt('off', 'Timer hidden', st.settings.timerVisibleDefault ? 'on' : 'off')
    ]);
    grid.appendChild(el('div', { 'class': 'card mt-4' }, [
      el('h2', null, ['Preferences']),
      el('div', { 'class': 'row wrap' }, [
        el('div', null, [el('label', null, ['Theme']), themeSel]),
        el('div', null, [el('label', null, ['Practice pacing']), paceSel]),
        el('div', null, [el('label', null, ['Mock timer default']), timerSel])
      ])
    ]));

    // streak
    grid.appendChild(el('div', { 'class': 'card mt-4' }, [
      el('h2', null, ['Streak']),
      el('p', { 'class': 'small muted mb-0' }, [
        'Current: ' + S.state.effectiveStreak() + ' days · best: ' + st.streak.best +
        ' · ❄️ freezes banked: ' + st.streak.freezes + ' (earn 1 per 7 goal-met days, max 3; a freeze auto-bridges one missed day).'
      ])
    ]));

    // data
    var fileInput = el('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var newState = S.storage.importState(String(reader.result));
          S.ui.modal({
            title: 'Replace progress?',
            body: [el('p', null, ['This replaces ALL current progress (SRS schedule, error log, streak, mock attempts) with the file’s contents. This cannot be undone.'])],
            actions: [
              { label: 'Cancel' },
              {
                label: 'Replace', class: 'btn-danger',
                onClick: function () { S.state.replaceState(newState); S.ui.toast('Progress imported'); S.router.navigate(); }
              }
            ]
          });
        } catch (e) {
          S.ui.toast('Import failed: ' + e.message);
        }
        fileInput.value = '';
      };
      reader.readAsText(f);
    });
    grid.appendChild(el('div', { 'class': 'card mt-4' }, [
      el('h2', null, ['Your data']),
      el('p', { 'class': 'small muted' }, ['Progress lives in this browser only (opening the site from disk and from GitHub Pages are separate stores). Use export/import to move or back up your progress.']),
      el('div', { 'class': 'row wrap' }, [
        el('button', { 'class': 'btn', type: 'button', onclick: function () { S.storage.exportState(S.state.get()); } }, ['⬇ Export progress']),
        el('button', { 'class': 'btn', type: 'button', onclick: function () { fileInput.click(); } }, ['⬆ Import progress']),
        fileInput
      ])
    ]));

    // danger zone
    grid.appendChild(el('div', { 'class': 'card mt-4 danger-zone' }, [
      el('h2', null, ['Danger zone']),
      el('button', {
        'class': 'btn btn-danger', type: 'button',
        onclick: function () {
          var typed = window.prompt('Type RESET to erase all progress (words, streak, error log, mock attempts).');
          if (typed === 'RESET') {
            S.storage.hardReset();
            location.reload();
          }
        }
      }, ['Erase all progress'])
    ]));

    function numInput(value, min, max) {
      return el('input', { type: 'number', value: String(value), min: String(min), max: String(max) });
    }
    function clamp(v, min, max, dflt) {
      var n = parseInt(v, 10);
      if (isNaN(n)) return dflt;
      return Math.max(min, Math.min(max, n));
    }
    function opt(v, label, current) {
      return el('option', { value: v, selected: v === current ? true : null }, [label]);
    }
  }

  S.views.settings = { render: render };
})(window.SATPrep = window.SATPrep || {});
