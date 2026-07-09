/* SM-2 style spaced repetition scheduler with mastery tiers and leech detection. */
(function (S) {
  'use strict';
  var EF_FLOOR = 1.3, EF_START = 2.5, IVL_CAP = 365, LEECH_LAPSES = 4;

  // rec: {ef, ivl, reps, lapses, due, last} or undefined for a new card
  function rate(rec, rating) {
    var today = S.util.todayLocal();
    var r = rec ? {
      ef: rec.ef, ivl: rec.ivl, reps: rec.reps, lapses: rec.lapses, due: rec.due, last: rec.last
    } : { ef: EF_START, ivl: 0, reps: 0, lapses: 0, due: today, last: null };

    if (rating === 'again') {
      r.lapses += 1;
      r.reps = 0;
      r.ivl = 1;
      r.ef = Math.max(EF_FLOOR, r.ef - 0.2);
    } else if (rating === 'hard') {
      r.ef = Math.max(EF_FLOOR, r.ef - 0.15);
      r.ivl = r.reps === 0 ? 1 : Math.max(r.ivl + 1, Math.round(r.ivl * 1.2));
      r.reps += 1;
    } else if (rating === 'good') {
      if (r.reps === 0) r.ivl = 1;
      else if (r.reps === 1) r.ivl = 6;
      else r.ivl = Math.round(r.ivl * r.ef);
      r.reps += 1;
    } else { // easy
      r.ef = r.ef + 0.15;
      if (r.reps === 0) r.ivl = 4;
      else if (r.reps === 1) r.ivl = 8;
      else r.ivl = Math.round(r.ivl * r.ef * 1.3);
      r.reps += 1;
    }
    r.ivl = Math.min(IVL_CAP, Math.max(1, r.ivl));
    r.due = S.util.addDays(today, r.ivl);
    r.last = Date.now();
    return r;
  }

  var TIERS = [
    { id: 'new', label: 'New', color: 'var(--tier-new)' },
    { id: 'learning', label: 'Learning', color: 'var(--tier-learning)' },
    { id: 'familiar', label: 'Familiar', color: 'var(--tier-familiar)' },
    { id: 'strong', label: 'Strong', color: 'var(--tier-strong)' },
    { id: 'mastered', label: 'Mastered', color: 'var(--tier-mastered)' }
  ];

  function tierOf(rec) {
    if (!rec) return 'new';
    if (rec.ivl < 7) return 'learning';
    if (rec.ivl < 21) return 'familiar';
    if (rec.ivl < 60) return 'strong';
    return 'mastered';
  }
  function isLeech(rec) { return !!rec && rec.lapses >= LEECH_LAPSES; }

  function dueQueue(today) {
    var srs = S.state.get().srs;
    var due = [];
    Object.keys(srs).forEach(function (wordId) {
      if (srs[wordId].due <= today && S.data.wordById(wordId)) due.push(wordId);
    });
    // leeches first, then most-overdue first
    due.sort(function (a, b) {
      var la = isLeech(srs[a]) ? 0 : 1, lb = isLeech(srs[b]) ? 0 : 1;
      if (la !== lb) return la - lb;
      return srs[a].due < srs[b].due ? -1 : 1;
    });
    return due;
  }

  var LIST_PRIORITY = { mustHave: 0, hard: 1, medium: 2 };
  function newQueue(limit) {
    var srs = S.state.get().srs;
    var fresh = S.data.vocab().filter(function (w) { return !srs[w.id]; });
    fresh.sort(function (a, b) {
      var pa = LIST_PRIORITY[a.list], pb = LIST_PRIORITY[b.list];
      if (pa !== pb) return pa - pb;
      return a.word < b.word ? -1 : 1;
    });
    return fresh.slice(0, limit).map(function (w) { return w.id; });
  }

  function tierDistribution() {
    var srs = S.state.get().srs;
    var dist = { 'new': 0, learning: 0, familiar: 0, strong: 0, mastered: 0 };
    S.data.vocab().forEach(function (w) { dist[tierOf(srs[w.id])] += 1; });
    return dist;
  }

  function leeches() {
    var srs = S.state.get().srs;
    return S.data.vocab().filter(function (w) { return isLeech(srs[w.id]); });
  }

  S.srs = {
    rate: rate, tierOf: tierOf, isLeech: isLeech, TIERS: TIERS,
    dueQueue: dueQueue, newQueue: newQueue, tierDistribution: tierDistribution, leeches: leeches
  };
})(window.SATPrep = window.SATPrep || {});
