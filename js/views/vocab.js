/* Vocab hub: mode picker, per-list tier overview, searchable word table. */
(function (S) {
  'use strict';
  S.views = S.views || {};

  function render(main) {
    var el = S.util.el;
    var state = S.state.get();
    var due = S.state.dueCountToday();
    var leeches = S.srs.leeches();

    main.appendChild(el('h1', null, ['Vocabulary']));
    main.appendChild(el('p', { 'class': 'muted' }, [
      String(S.data.vocab().length) + ' words from your three lists. Learn them with spaced-repetition flashcards, then transfer them to test conditions with SAT-style questions.'
    ]));

    main.appendChild(el('div', { 'class': 'grid grid-3' }, [
      modeCard('🃏', 'Flashcards', due > 0 ? due + ' due now' : 'Review + new words — keep practicing anytime', '#/vocab/flashcards', true),
      modeCard('✏️', 'SAT-Style Questions', 'Real “Words in Context” format, one per word', '#/vocab/quiz'),
      modeCard('⚡', 'Synonym Sprint', '60-second rapid matching rounds', '#/vocab/drill')
    ]));

    // per-list breakdown
    var lists = ['mustHave', 'hard', 'medium'];
    main.appendChild(el('div', { 'class': 'card mt-4' }, [
      el('h2', null, ['Your lists']),
      el('div', { 'class': 'grid grid-3' }, lists.map(function (L) {
        var words = S.data.vocab().filter(function (w) { return w.lists ? w.lists.indexOf(L) !== -1 : w.list === L; });
        var mastered = words.filter(function (w) { return S.srs.tierOf(state.srs[w.id]) === 'mastered'; }).length;
        var started = words.filter(function (w) { return state.srs[w.id]; }).length;
        return el('div', null, [
          el('h3', null, [S.data.LIST_LABELS[L]]),
          el('p', { 'class': 'small muted' }, [words.length + ' words · ' + started + ' started · ' + mastered + ' mastered']),
          S.ui.bar(words.length ? mastered / words.length : 0, 'bar-good')
        ]);
      }))
    ]));

    if (leeches.length) {
      main.appendChild(el('div', { 'class': 'card mt-4' }, [
        el('h2', null, ['🐛 Stubborn words (' + leeches.length + ')']),
        el('p', { 'class': 'small muted' }, ['You have lapsed on these 4+ times. They always show an example sentence, and the quiz prioritizes them.']),
        el('div', { 'class': 'row wrap' }, leeches.slice(0, 30).map(function (w) {
          return el('span', { 'class': 'chip chip-warn' }, [w.word]);
        }))
      ]));
    }

    // word browser
    var tableWrap = el('div', { 'class': 'word-table-wrap' });
    var search = el('input', {
      'class': 'word-search', type: 'search', placeholder: 'Search words or definitions…',
      'aria-label': 'Search words',
      oninput: function () { drawTable(search.value.trim().toLowerCase()); }
    });
    main.appendChild(el('div', { 'class': 'card mt-4' }, [
      el('h2', null, ['Browse all words']),
      search, tableWrap
    ]));
    drawTable('');

    function drawTable(qstr) {
      S.util.clear(tableWrap);
      var rows = S.data.vocab().filter(function (w) {
        if (!qstr) return true;
        return w.word.indexOf(qstr) !== -1 ||
          (w.definition || '').toLowerCase().indexOf(qstr) !== -1 ||
          (w.synonyms || []).join(' ').toLowerCase().indexOf(qstr) !== -1;
      });
      var table = el('table', { 'class': 'data-table' }, [
        el('thead', null, [el('tr', null, [
          el('th', null, ['Word']), el('th', null, ['Meaning']), el('th', null, ['Tier'])
        ])]),
        el('tbody', null, rows.slice(0, 400).map(function (w) {
          var tier = S.srs.tierOf(state.srs[w.id]);
          var tierDef = null;
          S.srs.TIERS.forEach(function (t) { if (t.id === tier) tierDef = t; });
          return el('tr', null, [
            el('td', null, [el('strong', { 'class': 'serif' }, [w.word])]),
            el('td', null, [w.definition || (w.synonyms || []).join(', ')]),
            el('td', null, [el('span', { 'class': 'chip' }, [
              el('span', { 'class': 'tier-dot', style: 'background:' + tierDef.color }), ' ', tierDef.label
            ])])
          ]);
        }))
      ]);
      tableWrap.appendChild(table);
      if (rows.length > 400) tableWrap.appendChild(el('p', { 'class': 'small faint' }, ['Showing first 400 matches.']));
    }

    function modeCard(icon, title, sub, href, primary) {
      return el('a', { 'class': 'card card-link mode-card', href: href }, [
        el('h3', null, [icon + ' ', title]),
        el('p', { 'class': 'small muted mb-0' }, [sub]),
        primary && due > 0 ? el('span', { 'class': 'chip chip-accent mt-2' }, [due + ' due']) : null
      ]);
    }
  }

  S.views.vocab = { render: render };
})(window.SATPrep = window.SATPrep || {});
