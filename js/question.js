/* Shared question renderer used by practice, mock, review, and vocab quiz.
 * Handles all passage variants, blank/underline markers, the answer eliminator,
 * and the post-answer explanation reveal. All text goes through createTextNode. */
(function (S) {
  'use strict';
  var el = null; // bound at first use (util loads before this file, but be safe)

  // Parse "[[u]]...[[/u]]" and "______" markers inside already-plain text into DOM nodes.
  function renderMarkedText(text) {
    el = el || S.util.el;
    var nodes = [];
    String(text).split('[[u]]').forEach(function (chunk, i) {
      if (i === 0) { pushWithBlanks(nodes, chunk); return; }
      var parts = chunk.split('[[/u]]');
      var u = el('u', null, []);
      pushWithBlanks(u, parts[0], true);
      nodes.push(u);
      if (parts[1] !== undefined) pushWithBlanks(nodes, parts[1]);
    });
    return nodes;
  }
  function pushWithBlanks(target, text, isNode) {
    var bits = String(text).split('______');
    bits.forEach(function (bit, i) {
      if (i > 0) {
        var blank = (el || S.util.el)('span', { 'class': 'blank-token', 'aria-label': 'blank' });
        if (isNode) target.appendChild(blank); else target.push(blank);
      }
      if (bit) {
        if (isNode) target.appendChild(document.createTextNode(bit));
        else target.push(bit);
      }
    });
  }

  function renderPassage(q) {
    el = el || S.util.el;
    var p = q.passage;
    if (!p) return null;
    var container = el('div', { 'class': 'q-passage' });
    if (p.type === 'paired') {
      container.appendChild(el('div', { 'class': 'paired-texts' }, [
        el('div', null, [el('h4', null, [p.label1 || 'Text 1']), el('div', { 'class': 'passage-text' }, renderMarkedText(p.text1))]),
        el('div', null, [el('h4', null, [p.label2 || 'Text 2']), el('div', { 'class': 'passage-text' }, renderMarkedText(p.text2))])
      ]));
    } else if (p.type === 'notes') {
      container.appendChild(el('p', { 'class': 'small muted' }, [p.intro || 'While researching a topic, a student has taken the following notes:']));
      container.appendChild(el('ul', { 'class': 'notes-list' }, p.bullets.map(function (b) {
        return el('li', null, renderMarkedText(b));
      })));
    } else if (p.type === 'chart') {
      if (p.text) container.appendChild(el('div', { 'class': 'passage-text' }, renderMarkedText(p.text)));
      container.appendChild(S.charts.render(p.chart));
      if (p.textAfter) container.appendChild(el('div', { 'class': 'passage-text' }, renderMarkedText(p.textAfter)));
    } else {
      container.appendChild(el('div', { 'class': 'passage-text' }, renderMarkedText(p.text)));
    }
    return container;
  }

  /* opts:
   *  selected: index|null, eliminated: [indexes], revealed: bool,
   *  eliminator: bool (show strike buttons),
   *  onSelect(i), onEliminate(i, isEliminated)
   */
  function renderQuestion(q, opts) {
    el = el || S.util.el;
    opts = opts || {};
    var frame = el('div', { 'class': 'q-frame' });
    var passage = renderPassage(q);
    if (passage) frame.appendChild(passage);
    frame.appendChild(el('div', { 'class': 'q-stem', id: 'stem-' + q.id }, renderMarkedText(q.stem)));

    var list = el('div', { 'class': 'choices', role: 'radiogroup', 'aria-labelledby': 'stem-' + q.id });
    q.choices.forEach(function (c, i) {
      var isSel = opts.selected === i;
      var isElim = (opts.eliminated || []).indexOf(i) !== -1;
      var cls = 'choice';
      if (opts.revealed) {
        if (i === q.answer) cls += ' is-correct';
        else if (isSel) cls += ' is-wrong';
      }
      if (isElim) cls += ' is-eliminated';

      var choiceBtn = el('div', {
        'class': cls, role: 'radio', tabindex: '0',
        'aria-checked': isSel ? 'true' : 'false',
        onclick: function () { if (!opts.revealed && opts.onSelect) opts.onSelect(i); },
        onkeydown: function (e) {
          if ((e.key === 'Enter' || e.key === ' ') && !opts.revealed && opts.onSelect) {
            e.preventDefault();
            opts.onSelect(i);
          }
        }
      }, [
        el('span', { 'class': 'choice-letter', 'aria-hidden': 'true' }, [S.util.LETTERS[i]]),
        el('span', { 'class': 'choice-text' }, renderMarkedText(c.text))
      ]);
      var li = el('div', null, [choiceBtn]);

      if (opts.eliminator && !opts.revealed) {
        choiceBtn.appendChild(el('button', {
          'class': 'elim-btn', type: 'button',
          'aria-pressed': isElim ? 'true' : 'false',
          'aria-label': 'Cross out choice ' + S.util.LETTERS[i],
          title: 'Cross out this choice',
          onclick: function (e) {
            e.stopPropagation();
            if (opts.onEliminate) opts.onEliminate(i, !isElim);
          }
        }, ['⊘']));
      }

      if (opts.revealed) {
        var isCorrectChoice = i === q.answer;
        var explain = el('div', { 'class': 'explain ' + (isCorrectChoice ? 'explain-correct' : 'explain-wrong') }, [
          c.tag ? el('span', { 'class': 'chip chip-bad tag-chip' }, [tagLabel(c.tag)]) : null,
          el('strong', null, [isCorrectChoice ? 'Correct. ' : (S.util.LETTERS[i] + ' is wrong. ')]),
          c.why || ''
        ]);
        li.appendChild(explain);
      }
      list.appendChild(li);
    });
    frame.appendChild(list);
    return frame;
  }

  function tagLabel(tag) {
    return ({
      'too-broad': 'too broad', 'too-specific': 'too specific', 'reversed': 'reversed',
      'unsupported': 'unsupported', 'true-but-irrelevant': 'true but irrelevant'
    })[tag] || tag;
  }

  function gistOf(q) {
    var label = q.skill ? (S.data.SKILL_LABELS[q.skill] || q.skill) : 'Vocab';
    var text = '';
    if (q.passage) {
      text = q.passage.text || q.passage.text1 || (q.passage.bullets && q.passage.bullets[0]) || '';
    } else {
      text = q.stem || '';
    }
    text = String(text).replace(/\[\[\/?u\]\]/g, '').replace(/\s+/g, ' ').trim();
    return label + ': ' + text.slice(0, 70) + (text.length > 70 ? '…' : '');
  }

  S.question = { render: renderQuestion, renderPassage: renderPassage, renderMarkedText: renderMarkedText, gistOf: gistOf, tagLabel: tagLabel };
})(window.SATPrep = window.SATPrep || {});
