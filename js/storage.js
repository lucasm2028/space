/* Persistence: single localStorage root key, schema versioning + migrations, export/import. */
(function (S) {
  'use strict';
  var KEY = 'sat1600.v1';
  var CURRENT_VERSION = 1;
  var available = true;

  // Ordered migrations: MIGRATIONS[i] upgrades version i+1 -> i+2 (none yet for v1).
  var MIGRATIONS = [];

  function defaults() {
    return {
      schemaVersion: CURRENT_VERSION,
      settings: {
        theme: 'auto',
        dailyNewWords: 10,
        dailyPracticeQuestions: 5,
        timerVisibleDefault: true,
        pacingIndicator: true
      },
      srs: {},
      qhist: {},
      errorLog: [],
      days: {},
      streak: { current: 0, best: 0, lastActive: null, freezes: 0, goalDays: 0 },
      mockAttempts: {},
      activeMock: null,
      meta: { errorCounter: 0, installedAt: Date.now() }
    };
  }

  function deepMergeDefaults(target, def) {
    Object.keys(def).forEach(function (k) {
      if (target[k] === undefined) {
        target[k] = def[k];
      } else if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k]) &&
                 target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
        deepMergeDefaults(target[k], def[k]);
      }
    });
    return target;
  }

  function migrate(state) {
    var v = state.schemaVersion || 1;
    if (v > CURRENT_VERSION) {
      // From a newer build: use read-only mode to avoid destroying newer data.
      available = false;
      if (S.ui && S.ui.toast) S.ui.toast('Saved data is from a newer version; running read-only.');
      return state;
    }
    while (v < CURRENT_VERSION) {
      state = MIGRATIONS[v - 1](state);
      v = state.schemaVersion = v + 1;
    }
    return deepMergeDefaults(state, defaults());
  }

  function load() {
    var raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {
      available = false;
    }
    if (!raw) return defaults();
    try {
      return migrate(JSON.parse(raw));
    } catch (e) {
      // Corrupt data: preserve it under a backup key, start fresh.
      try { localStorage.setItem(KEY + '.corrupt', raw); } catch (e2) { /* ignore */ }
      return defaults();
    }
  }

  var pendingState = null;
  var writeNow = function () {
    if (!available || !pendingState) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(pendingState));
    } catch (e) {
      available = false;
      if (S.ui && S.ui.toast) S.ui.toast('Could not save progress (storage unavailable).');
    }
  };
  var debouncedWrite = null; // set after util loads

  function save(state) {
    pendingState = state;
    if (!debouncedWrite) debouncedWrite = S.util.debounce(writeNow, 250);
    debouncedWrite();
  }
  function flush() { if (debouncedWrite) debouncedWrite.flush(); else writeNow(); }

  function exportState(state) {
    S.util.download('sat1600-progress-' + S.util.todayLocal() + '.json', {
      app: 'sat1600', schemaVersion: state.schemaVersion,
      exportedAt: new Date().toISOString(), state: state
    });
  }

  function importState(json) {
    var obj = JSON.parse(json);
    if (!obj || obj.app !== 'sat1600' || !obj.state) throw new Error('Not a SAT 1600 progress file.');
    if ((obj.schemaVersion || 1) > CURRENT_VERSION) throw new Error('File is from a newer version of the app.');
    return migrate(obj.state);
  }

  function hardReset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });

  S.storage = {
    KEY: KEY, CURRENT_VERSION: CURRENT_VERSION,
    load: load, save: save, flush: flush,
    exportState: exportState, importState: importState, hardReset: hardReset,
    isAvailable: function () { return available; }
  };
})(window.SATPrep = window.SATPrep || {});
