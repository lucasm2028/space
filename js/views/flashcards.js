/* Flashcards: SRS session = due queue + N new words. Flip, then Again/Hard/Good/Easy. */
(function (S) {
  'use strict';
  S.views = S.views || {};

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
      S.state.rateCard(wordId, rating);
      sessionStats[rating] += 1;
      done += 1;
      if (rating === 'again') queue.push(wordId); // see it again this session
      idx += 1;
      flipped = false;
      S.state.checkGoal();
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

      stage.appendChild(el('div', { 'class': 'row-between mb-0', style: 'margin-bottom:12px' }, [
        el('span', { 'class': 'small muted' }, ['Card ' + (done + 1) + ' of ' + Math.max(startCount, queue.length) +
          (isNew ? ' · new word' : ' · review')]),
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
        stage.appendChild(el('div', { 'class': 'fc-actions' }, [
          fcBtn('Again', '<1 d', 'fc-again', 'again', '1'),
          fcBtn('Hard', ivlPreview(rec, 'hard'), 'fc-hard', 'hard', '2'),
          fcBtn('Good', ivlPreview(rec, 'good'), 'fc-good', 'good', '3'),
          fcBtn('Easy', ivlPreview(rec, 'easy'), 'fc-easy', 'easy', '4')
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
      var due = S.state.dueCountToday();
      stage.appendChild(el('div', { 'class': 'card center' }, [
        el('h2', null, [startCount === 0 ? 'Nothing due right now 🎉' : 'Session complete 🎉']),
        startCount > 0 ? el('p', { 'class': 'muted' }, [
          done + ' cards · ' + sessionStats.again + ' again · ' + sessionStats.hard + ' hard · ' +
          sessionStats.good + ' good · ' + sessionStats.easy + ' easy'
        ]) : el('p', { 'class': 'muted' }, ['All reviews are done and today’s new-word quota is filled. Come back tomorrow — or keep going below.']),
        el('div', { 'class': 'row wrap', style: 'justify-content:center' }, [
          due > 0 ? el('a', { 'class': 'btn btn-primary', href: '#/vocab/flashcards', onclick: function () { setTimeout(S.router.navigate, 0); } }, ['Review ' + due + ' more']) : null,
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
