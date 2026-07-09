/* State: single owner of the persistent state object. Views mutate ONLY through these
 * mutators; each mutator persists and emits change events. */
(function (S) {
  'use strict';
  var state = null;
  var listeners = {};

  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); }
  function emit(evt) {
    (listeners[evt] || []).forEach(function (fn) { try { fn(); } catch (e) { /* listener errors are non-fatal */ } });
  }
  function persist() { S.storage.save(state); }

  function init() { state = S.storage.load(); return state; }
  function get() { return state; }

  // ---- day ledger / goals / streak ----
  function day(dateStr) {
    var d = dateStr || S.util.todayLocal();
    if (!state.days[d]) {
      state.days[d] = { reviews: 0, newWords: 0, questions: 0, goalMet: false, frozen: false };
    }
    return state.days[d];
  }

  function goalTargets() {
    return {
      newWords: state.settings.dailyNewWords,
      questions: state.settings.dailyPracticeQuestions
    };
  }

  function dueCountToday() {
    return S.srs.dueQueue(S.util.todayLocal()).length;
  }

  function checkGoal() {
    var t = goalTargets();
    var d = day();
    var dueLeft = dueCountToday();
    var met = dueLeft === 0 && d.newWords >= t.newWords && d.questions >= t.questions;
    if (met && !d.goalMet) {
      d.goalMet = true;
      bumpStreak();
    }
    persist();
    emit('change:day');
  }

  function bumpStreak() {
    var today = S.util.todayLocal();
    var st = state.streak;
    if (st.lastActive === today) { /* already counted */ }
    else {
      var gap = st.lastActive ? S.util.daysBetween(st.lastActive, today) : null;
      if (gap === 1 || st.lastActive === null) {
        st.current += 1;
      } else if (gap === 2 && st.freezes > 0) {
        st.freezes -= 1;
        var missed = S.util.addDays(today, -1);
        day(missed).frozen = true;
        st.current += 1;
      } else {
        st.current = 1;
      }
      st.lastActive = today;
      st.goalDays = (st.goalDays || 0) + 1;
      if (st.goalDays % 7 === 0 && st.freezes < 3) st.freezes += 1;
      if (st.current > st.best) st.best = st.current;
    }
    emit('change:streak');
  }

  // Streak display should not count a broken chain: if the last goal-met day is
  // more than 1 day ago (and yesterday wasn't frozen), current streak is stale.
  function effectiveStreak() {
    var st = state.streak;
    if (!st.lastActive) return 0;
    var gap = S.util.daysBetween(st.lastActive, S.util.todayLocal());
    if (gap <= 1) return st.current;
    if (gap === 2 && st.freezes > 0) return st.current; // bridgeable
    return 0;
  }

  // ---- SRS ----
  function rateCard(wordId, rating) {
    var rec = state.srs[wordId];
    var isNew = !rec;
    state.srs[wordId] = S.srs.rate(rec, rating);
    var d = day();
    d.reviews += 1;
    if (isNew) d.newWords += 1;
    persist();
    emit('change:srs');
    return state.srs[wordId];
  }

  // ---- question history / error log ----
  function recordAttempt(qid, info) {
    // info: {correct, choice, seconds, mode}
    var h = state.qhist[qid] || (state.qhist[qid] = { attempts: [] });
    h.attempts.push({
      ts: Date.now(), correct: !!info.correct, choice: info.choice,
      seconds: Math.round(info.seconds || 0), mode: info.mode || 'practice'
    });
    if (info.countsTowardGoal !== false && info.mode !== 'redo') {
      day().questions += 1;
    }
    persist();
    emit('change:qhist');
  }

  function logMiss(entry) {
    // entry: {source, qid, gist, yourAnswer, correctAnswer, missTag, note}
    state.meta.errorCounter += 1;
    var e = {
      id: 'el-' + String(state.meta.errorCounter).padStart(4, '0'),
      ts: Date.now(),
      source: entry.source || 'practice',
      qid: entry.qid,
      gist: entry.gist || '',
      yourAnswer: entry.yourAnswer,
      correctAnswer: entry.correctAnswer,
      missTag: entry.missTag || 'other',
      note: entry.note || '',
      redo: { schedule: [1, 4, 10], nextAt: S.util.addDays(S.util.todayLocal(), 1), step: 0, streak: 0 },
      resolved: false
    };
    state.errorLog.push(e);
    persist();
    emit('change:errors');
    return e;
  }

  function recordRedo(entryId, correct) {
    var e = null;
    for (var i = 0; i < state.errorLog.length; i++) {
      if (state.errorLog[i].id === entryId) { e = state.errorLog[i]; break; }
    }
    if (!e) return;
    if (correct) {
      e.redo.streak += 1;
      if (e.redo.streak >= 2) {
        e.resolved = true;
      } else {
        e.redo.step = Math.min(e.redo.step + 1, e.redo.schedule.length - 1);
        e.redo.nextAt = S.util.addDays(S.util.todayLocal(), e.redo.schedule[e.redo.step]);
      }
    } else {
      e.redo.streak = 0;
      e.redo.step = 0;
      e.redo.nextAt = S.util.addDays(S.util.todayLocal(), e.redo.schedule[0]);
    }
    persist();
    emit('change:errors');
  }

  // ---- mocks ----
  function startMock(mockId, timeLimitSeconds) {
    state.activeMock = {
      mockId: mockId,
      startedEpochMs: Date.now(),
      deadlineEpochMs: Date.now() + timeLimitSeconds * 1000,
      answers: [], flagged: [], eliminated: {}, seconds: [],
      currentIndex: 0,
      timerVisible: state.settings.timerVisibleDefault
    };
    persist();
    return state.activeMock;
  }
  function saveMockProgress() { persist(); }
  function abandonMock() { state.activeMock = null; persist(); }

  function finishMock(mock, elapsedByQ) {
    var am = state.activeMock;
    if (!am) return null;
    var answers = [];
    var bySkill = {};
    var raw = 0;
    for (var i = 0; i < mock.questions.length; i++) {
      var q = mock.questions[i];
      var a = am.answers[i] === undefined ? null : am.answers[i];
      answers.push(a);
      var sk = bySkill[q.skill] || (bySkill[q.skill] = { c: 0, t: 0 });
      sk.t += 1;
      var correct = a === q.answer;
      if (correct) { raw += 1; sk.c += 1; }
      recordAttempt(q.id, { correct: correct, choice: a, seconds: (elapsedByQ && elapsedByQ[i]) || 0, mode: 'mock', countsTowardGoal: false });
    }
    var attempt = {
      ts: Date.now(), completed: true,
      answers: answers, flagged: am.flagged.slice(), seconds: (elapsedByQ || []).slice(),
      raw: raw, bySkill: bySkill,
      routedHigher: raw / mock.questions.length >= 0.65
    };
    (state.mockAttempts[mock.id] = state.mockAttempts[mock.id] || []).push(attempt);
    state.activeMock = null;
    day().questions += mock.questions.length;
    persist();
    S.storage.flush();
    emit('change:mocks');
    return attempt;
  }

  // ---- settings ----
  function updateSettings(patch) {
    Object.keys(patch).forEach(function (k) { state.settings[k] = patch[k]; });
    persist();
    emit('change:settings');
  }

  function replaceState(newState) {
    state = newState;
    persist();
    S.storage.flush();
    emit('change:all');
  }

  // ---- derived stats ----
  function skillStats() {
    // accuracy + avg seconds per skill from qhist, using latest attempt per question
    var stats = {};
    Object.keys(state.qhist).forEach(function (qid) {
      var q = S.data.questionById(qid);
      if (!q || !q.skill) return;
      var attempts = state.qhist[qid].attempts;
      var st = stats[q.skill] || (stats[q.skill] = { attempts: 0, correct: 0, seconds: 0 });
      attempts.forEach(function (a) {
        st.attempts += 1;
        if (a.correct) st.correct += 1;
        st.seconds += a.seconds || 0;
      });
    });
    return stats;
  }

  S.state = {
    init: init, get: get, on: on, emit: emit,
    day: day, goalTargets: goalTargets, checkGoal: checkGoal, dueCountToday: dueCountToday,
    effectiveStreak: effectiveStreak,
    rateCard: rateCard, recordAttempt: recordAttempt, logMiss: logMiss, recordRedo: recordRedo,
    startMock: startMock, saveMockProgress: saveMockProgress, abandonMock: abandonMock, finishMock: finishMock,
    updateSettings: updateSettings, replaceState: replaceState, skillStats: skillStats
  };
})(window.SATPrep = window.SATPrep || {});
