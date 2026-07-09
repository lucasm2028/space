/* Synonym Sprint: 60-second rounds. Prompt word -> pick the true synonym among decoys. */
(function (S) {
  'use strict';
  S.views = S.views || {};

  function render(main) {
    var el = S.util.el;
    var pool = S.data.vocab().filter(function (w) { return w.synonyms && w.synonyms.length; });

    main.appendChild(el('h1', null, ['Synonym Sprint']));
    var stage = el('div', { 'class': 'sd-stage' });
    main.appendChild(stage);

    if (pool.length < 8) {
      stage.appendChild(el('p', { 'class': 'muted' }, ['Not enough words with synonyms loaded.']));
      return;
    }

    var countdown = null;
    var score = 0, best = 0, streakRun = 0, roundActive = false;
    var current = null;

    function intro() {
      S.util.clear(stage);
      stage.appendChild(el('div', { 'class': 'card' }, [
        el('h2', null, ['60 seconds. How many can you match?']),
        el('p', { 'class': 'muted' }, ['Pick the true synonym for each word. Wrong picks cost 2 points and log the word for review. Keys ', el('span', { 'class': 'kbd' }, ['1']), '–', el('span', { 'class': 'kbd' }, ['4']), ' work too.']),
        el('button', { 'class': 'btn btn-primary btn-lg', type: 'button', onclick: start }, ['Start round'])
      ]));
    }

    function start() {
      score = 0; streakRun = 0; roundActive = true;
      var deadline = Date.now() + 60 * 1000;
      countdown = S.timer.Countdown(deadline, {
        onTick: function () { drawTimer(); },
        onExpire: function () { endRound(); }
      }).start();
      nextItem();
    }

    function nextItem() {
      var w = pool[Math.floor(Math.random() * pool.length)];
      var correctSyn = w.synonyms[Math.floor(Math.random() * w.synonyms.length)];
      var decoys = [];
      var guardLoops = 0;
      while (decoys.length < 3 && guardLoops < 200) {
        guardLoops += 1;
        var other = pool[Math.floor(Math.random() * pool.length)];
        if (other.id === w.id) continue;
        var syn = other.synonyms[Math.floor(Math.random() * other.synonyms.length)];
        if (syn.toLowerCase() === correctSyn.toLowerCase()) continue;
        if ((w.synonyms || []).some(function (s) { return s.toLowerCase() === syn.toLowerCase(); })) continue;
        if (decoys.indexOf(syn) !== -1) continue;
        decoys.push(syn);
      }
      var options = S.util.shuffle([correctSyn].concat(decoys));
      current = { word: w, correctSyn: correctSyn, options: options };
      draw();
    }

    function pick(i) {
      if (!roundActive || !current) return;
      var right = current.options[i] === current.correctSyn;
      if (right) {
        streakRun += 1;
        score += 1 + (streakRun >= 5 ? 1 : 0); // small streak bonus
      } else {
        streakRun = 0;
        score = Math.max(0, score - 2);
        S.state.recordAttempt('drill-' + current.word.id, {
          correct: false, choice: i, seconds: 0, mode: 'drill', countsTowardGoal: false
        });
      }
      nextItem();
    }

    var timerEl = null;
    function drawTimer() {
      if (timerEl && countdown) timerEl.textContent = S.util.formatClock(countdown.remainingSec());
    }

    function draw() {
      S.util.clear(stage);
      timerEl = el('span', { 'class': 'sd-timer', 'aria-label': 'time remaining' }, [countdown ? S.util.formatClock(countdown.remainingSec()) : '1:00']);
      stage.appendChild(el('div', { 'class': 'row-between' }, [
        el('span', { 'class': 'chip chip-accent' }, ['Score: ' + score]),
        timerEl,
        el('span', { 'class': 'chip' }, ['streak ' + streakRun])
      ]));
      stage.appendChild(el('div', { 'class': 'sd-word' }, [current.word.word]));
      stage.appendChild(el('p', { 'class': 'small muted' }, ['Pick the synonym']));
      stage.appendChild(el('div', { 'class': 'sd-options' }, current.options.map(function (opt, i) {
        return el('button', { 'class': 'btn', type: 'button', onclick: function () { pick(i); } }, [
          el('span', { 'class': 'kbd', 'aria-hidden': 'true' }, [String(i + 1)]), ' ', opt
        ]);
      })));
    }

    function endRound() {
      roundActive = false;
      if (countdown) { countdown.stop(); countdown = null; }
      var state = S.state.get();
      var prevBest = (state.meta.drillBest || 0);
      if (score > prevBest) { state.meta.drillBest = score; }
      best = Math.max(prevBest, score);
      S.storage.save(state);
      S.util.clear(stage);
      stage.appendChild(el('div', { 'class': 'card center' }, [
        el('h2', null, ['Time!']),
        el('div', { 'class': 'sd-score-pop' }, [String(score)]),
        el('p', { 'class': 'muted' }, [score >= best && score > 0 ? 'New personal best! 🏆' : 'Personal best: ' + best]),
        el('div', { 'class': 'row wrap', style: 'justify-content:center' }, [
          el('button', { 'class': 'btn btn-primary', type: 'button', onclick: start }, ['Go again']),
          el('a', { 'class': 'btn', href: '#/vocab' }, ['Back to vocabulary'])
        ])
      ]));
    }

    function keyHandler(e) {
      if (!roundActive) return;
      if (['1', '2', '3', '4'].indexOf(e.key) !== -1) {
        e.preventDefault();
        pick(Number(e.key) - 1);
      }
    }
    document.addEventListener('keydown', keyHandler);

    intro();
    return function unmount() {
      document.removeEventListener('keydown', keyHandler);
      if (countdown) countdown.stop();
    };
  }

  S.views.synonymDrill = { render: render };
})(window.SATPrep = window.SATPrep || {});
