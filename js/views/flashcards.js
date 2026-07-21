/* Flashcards: SRS session = due queue + N new words. Flip, then Again/Hard/Good/Easy.
 * The session never dead-ends: from the summary you can pull in more new words
 * (scheduled normally, ahead of the daily quota) or run extra-practice rounds on
 * learned words, which never touch the SRS schedule. */
(function (S) {
  'use strict';
  S.views = S.views || {};

  var NEW_BATCH = 10, PRACTICE_BATCH = 20;

  function render(main) {
    var el = S.util.el;
    var today = S.util.todayLocal();
    var state = S.state.get();
    var targets = S.state.goalTargets();
    var d = S.state.day(today);

    var queue = S.srs.dueQueue(today);
    var newBudget = Math.max(0, targets.newWords - d.newWords);
    var news = S.srs.newQueue(newBudget);
    queue = queue.concat(news);
    // kinds[i] mirrors queue[i]: 'srs' cards are rated into the scheduler,
    // 'practice' cards are extra reps that leave the schedule untouched.
    var kinds = queue.map(function () { return 'srs'; });

    var done = 0, flipped = false, idx = 0;
    var startCount = queue.length;
    var sessionStats = { again: 0, hard: 0, good: 0, easy: 0 };

    main.appendChild(el('h1', null, ['Flashcards']));
    var stage = el('div', { 'class': 'fc-stage' });
    main.appendChild(stage);

    function keyHandler(e) {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (idx >= queue.length) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
      if (flipped && ['1', '2', '3', '4'].indexOf(e.key) !== -1) {
        e.preventDefault();
        rate(['again', 'hard', 'good', 'easy'][Number(e.key) - 1]);
      }
    }
    document.addEventListener('keydown', keyHandler);

    function flip() { flipped = !flipped; draw(); }

    function rate(rating) {
      var wordId = queue[idx];
      var practice = kinds[idx] === 'practice';
      if (!practice) {
        S.state.rateCard(wordId, rating);
        S.state.checkGoal();
      }
      sessionStats[rating] += 1;
      done += 1;
      if (rating === 'again') { // see it again this session
        queue.push(wordId);
        kinds.push(practice ? 'practice' : 'srs');
      }
      idx += 1;
      flipped = false;
      draw();
    }

    // Word ids not yet shown this session — excluded when pulling in more cards.
    function pendingSet() {
      var s = {};
      for (var i = idx; i < queue.length; i++) s[queue[i]] = true;
      return s;
    }

    function extend(ids, kind) {
      ids.forEach(function (id) { queue.push(id); kinds.push(kind); });
      draw();
    }

    function draw() {
      S.util.clear(stage);
      if (idx >= queue.length) {
        drawSummary();
        return;
      }
      var wordId = queue[idx];
      var w = S.data.wordById(wordId);
      var rec = S.state.get().srs[wordId];
      var isLeech = S.srs.isLeech(rec);
      var isNew = !rec;
      var isPractice = kinds[idx] === 'practice';

      stage.appendChild(el('div', { 'class': 'row-between mb-0', style: 'margin-bottom:12px' }, [
        el('span', { 'class': 'small muted' }, ['Card ' + (done + 1) + ' of ' + Math.max(startCount, queue.length) +
          (isPractice ? ' · extra practice' : (isNew ? ' · new word' : ' · review'))]),
        el('span', { 'class': 'small faint' }, [el('span', { 'class': 'kbd' }, ['space']), ' flip · ', el('span', { 'class': 'kbd' }, ['1–4']), ' rate'])
      ]));

      if (isLeech) {
        stage.appendChild(el('p', { 'class': 'leech-note' }, ['🐛 Stubborn word — read the example sentence and build an association before answering.']));
      }

      var front = !flipped;
      var card = el('div', {
        'class': 'fc-card', role: 'button', tabindex: '0',
        'aria-label': front ? 'Card front: ' + w.word + '. Activate to reveal the definition.' : 'Card back. Rate your recall.',
        onclick: flip,
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } }
      });

      if (front) {
        card.appendChild(el('div', { 'class': 'fc-word' }, [w.word]));
        if (w.forms && w.forms.length) card.appendChild(el('p', { 'class': 'small faint mt-2' }, ['also: ' + w.forms.join(', ')]));
        if (isLeech && w.example) card.appendChild(el('p', { 'class': 'fc-example mt-3' }, ['“' + w.example + '”']));
        card.appendChild(el('p', { 'class': 'small faint mt-3' }, ['Recall the meaning, then flip']));
      } else {
        card.appendChild(el('div', { 'class': 'fc-word', style: 'font-size:1.3rem' }, [w.word]));
        if (w.definition) card.appendChild(el('p', { 'class': 'fc-def mt-2' }, [w.definition]));
        if (w.synonyms && w.synonyms.length) card.appendChild(el('p', { 'class': 'fc-syn' }, [w.synonyms.join(' · ')]));
        if (w.example) card.appendChild(el('p', { 'class': 'fc-example' }, ['“' + w.example + '”']));
      }
      stage.appendChild(card);

      if (flipped) {
        // Practice reps don't reschedule, so show 'redo'/'practice' instead of intervals.
        stage.appendChild(el('div', { 'class': 'fc-actions' }, [
          fcBtn('Again', isPractice ? 'redo' : '<1 d', 'fc-again', 'again', '1'),
          fcBtn('Hard', isPractice ? 'practice' : ivlPreview(rec, 'hard'), 'fc-hard', 'hard', '2'),
          fcBtn('Good', isPractice ? 'practice' : ivlPreview(rec, 'good'), 'fc-good', 'good', '3'),
          fcBtn('Easy', isPractice ? 'practice' : ivlPreview(rec, 'easy'), 'fc-easy', 'easy', '4')
        ]));
      } else {
        stage.appendChild(el('div', { 'class': 'center mt-4' }, [
          el('button', { 'class': 'btn btn-primary btn-lg', type: 'button', onclick: flip }, ['Show answer'])
        ]));
      }

      function fcBtn(label, sub, cls, rating, key) {
        return el('button', { 'class': 'fc-btn ' + cls, type: 'button', onclick: function () { rate(rating); } }, [
          label, el('small', null, [sub + ' · ' + key])
        ]);
      }
    }

    function ivlPreview(rec, rating) {
      var r = S.srs.rate(rec, rating);
      return r.ivl >= 30 ? Math.round(r.ivl / 30) + ' mo' : r.ivl + ' d';
    }

    function drawSummary() {
      var pending = pendingSet();
      var dueMore = S.srs.dueQueue(S.util.todayLocal()).filter(function (id) { return !pending[id]; });
      var newMore = S.srs.newQueue(NEW_BATCH, pending);
      var pracMore = S.srs.practiceQueue(PRACTICE_BATCH, pending);

      stage.appendChild(el('div', { 'class': 'card center' }, [
        el('h2', null, [done === 0 ? 'Nothing due right now 🎉' : 'Session complete 🎉']),
        done > 0 ? el('p', { 'class': 'muted' }, [
          done + ' cards · ' + sessionStats.again + ' again · ' + sessionStats.hard + ' hard · ' +
          sessionStats.good + ' good · ' + sessionStats.easy + ' easy'
        ]) : el('p', { 'class': 'muted' }, ['All reviews are done and today’s new-word quota is filled — but you don’t have to stop.']),
        el('div', { 'class': 'row wrap', style: 'justify-content:center' }, [
          dueMore.length ? el('button', { 'class': 'btn btn-primary fc-more-due', type: 'button', onclick: function () { extend(dueMore, 'srs'); } }, ['Review ' + dueMore.length + ' due']) : null,
          newMore.length ? el('button', { 'class': 'btn ' + (dueMore.length ? '' : 'btn-primary ') + 'fc-more-new', type: 'button', onclick: function () { extend(newMore, 'srs'); } }, ['Learn ' + newMore.length + ' more new words']) : null,
          pracMore.length ? el('button', { 'class': 'btn fc-more-practice', type: 'button', onclick: function () { extend(pracMore, 'practice'); } }, ['Extra practice (' + pracMore.length + ')']) : null
        ]),
        newMore.length || pracMore.length ? el('p', { 'class': 'small faint' }, [
          'Keep going as long as you like: extra new words are scheduled normally and count toward today’s goal; extra practice re-drills your weakest learned words without touching tomorrow’s review schedule.'
        ]) : null,
        el('div', { 'class': 'row wrap', style: 'justify-content:center' }, [
          el('a', { 'class': 'btn', href: '#/vocab/quiz' }, ['Test these in SAT format']),
          el('a', { 'class': 'btn', href: '#/dashboard' }, ['Dashboard'])
        ])
      ]));
    }

    draw();
    return function unmount() { document.removeEventListener('keydown', keyHandler); };
  }

  S.views.flashcards = { render: render };
})(window.SATPrep = window.SATPrep || {});
