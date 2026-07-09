/* Boot: load state, index data, register routes, render. */
(function (S) {
  'use strict';

  function boot() {
    S.state.init();
    var integrity = S.data.init();
    S.ui.applyTheme();

    if (integrity.errors.length) {
      // Surface loudly in console; keep the app usable.
      /* eslint-disable no-console */
      console.error('[SAT1600] data errors:', integrity.errors);
    }
    if (integrity.warnings.length) console.warn('[SAT1600] data warnings:', integrity.warnings);
    if (/[?&]debug=1/.test(location.hash) && (integrity.errors.length || integrity.warnings.length)) {
      S.ui.toast('Data issues: ' + integrity.errors.length + ' errors, ' + integrity.warnings.length + ' warnings (see console)');
    }

    var v = S.views;
    S.router.register('dashboard', v.dashboard);
    S.router.register('vocab', v.vocab);
    S.router.register('vocab/flashcards', v.flashcards);
    S.router.register('vocab/quiz', v.vocabQuiz);
    S.router.register('vocab/drill', v.synonymDrill);
    S.router.register('practice', v.practiceHub);
    S.router.register('practice/:skill', v.practiceRun);
    S.router.register('mock', v.mockHub);
    S.router.register('mock/:id', v.mockRun);
    S.router.register('results/:id/:attempt', v.results);
    S.router.register('review', v.review);
    S.router.register('settings', v.settings);

    S.state.on('change:streak', S.ui.renderHeader);
    S.router.navigate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.SATPrep = window.SATPrep || {});
