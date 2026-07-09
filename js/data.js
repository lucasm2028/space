/* Data registry: indexes over window.SAT_DATA + boot-time validator. */
(function (S) {
  'use strict';

  var SKILLS = [
    'words-in-context', 'text-structure', 'cross-text',
    'central-ideas', 'evidence-textual', 'evidence-quant', 'inferences',
    'boundaries', 'form-structure-sense', 'transitions', 'rhetorical-synthesis'
  ];
  var SKILL_LABELS = {
    'words-in-context': 'Words in Context',
    'text-structure': 'Text Structure & Purpose',
    'cross-text': 'Cross-Text Connections',
    'central-ideas': 'Central Ideas & Details',
    'evidence-textual': 'Command of Evidence (Textual)',
    'evidence-quant': 'Command of Evidence (Quantitative)',
    'inferences': 'Inferences',
    'boundaries': 'Boundaries',
    'form-structure-sense': 'Form, Structure, and Sense',
    'transitions': 'Transitions',
    'rhetorical-synthesis': 'Rhetorical Synthesis'
  };
  var DOMAINS = {
    craft: { label: 'Craft and Structure', skills: ['words-in-context', 'text-structure', 'cross-text'] },
    information: { label: 'Information and Ideas', skills: ['central-ideas', 'evidence-textual', 'evidence-quant', 'inferences'] },
    conventions: { label: 'Standard English Conventions', skills: ['boundaries', 'form-structure-sense'] },
    expression: { label: 'Expression of Ideas', skills: ['transitions', 'rhetorical-synthesis'] }
  };
  var DISTRACTOR_TAGS = ['too-broad', 'too-specific', 'reversed', 'unsupported', 'true-but-irrelevant'];
  var MISS_TAGS = [
    { id: 'misread', label: 'Misread the passage/question' },
    { id: 'vocab-gap', label: 'Didn’t know a word' },
    { id: 'fell-for-distractor', label: 'Fell for a trap answer' },
    { id: 'timing', label: 'Rushed / ran out of time' },
    { id: 'other', label: 'Other' }
  ];
  var LIST_LABELS = { mustHave: 'Must-Have', hard: 'DSAT Hard', medium: 'DSAT Medium' };

  var raw = null;
  var idx = {
    wordById: {}, vocabQByWordId: {}, questionById: {},
    bankBySkill: {}, vocabQuestions: [], bank: [], mocks: []
  };
  var errors = [], warnings = [];

  function init() {
    raw = window.SAT_DATA || {};
    raw.vocab = raw.vocab || [];
    raw.vocabQuestions = raw.vocabQuestions || [];
    raw.rwBank = raw.rwBank || [];
    raw.mocks = raw.mocks || [];

    raw.vocab.forEach(function (w) {
      if (idx.wordById[w.id]) errors.push('duplicate word id ' + w.id);
      idx.wordById[w.id] = w;
    });
    raw.vocabQuestions.forEach(function (q) {
      registerQuestion(q, 'vocabQuestion');
      idx.vocabQuestions.push(q);
      if (q.wordId) {
        if (!idx.wordById[q.wordId]) errors.push(q.id + ': unknown wordId ' + q.wordId);
        idx.vocabQByWordId[q.wordId] = q;
      }
    });
    raw.rwBank.forEach(function (q) {
      registerQuestion(q, 'bank');
      idx.bank.push(q);
      (idx.bankBySkill[q.skill] = idx.bankBySkill[q.skill] || []).push(q);
    });
    raw.mocks.forEach(function (m) {
      idx.mocks.push(m);
      if (!m.questions || m.questions.length !== 27) {
        warnings.push('mock ' + m.id + ' has ' + (m.questions ? m.questions.length : 0) + ' questions (expected 27)');
      }
      (m.questions || []).forEach(function (q) { registerQuestion(q, 'mock'); });
    });
    validate();
    return { errors: errors, warnings: warnings };
  }

  function registerQuestion(q, source) {
    if (!q.id) { errors.push('question missing id (' + source + ')'); return; }
    if (idx.questionById[q.id]) errors.push('duplicate question id ' + q.id);
    q._source = source;
    idx.questionById[q.id] = q;
  }

  function validate() {
    Object.keys(idx.questionById).forEach(function (qid) {
      var q = idx.questionById[qid];
      if (!q.choices || q.choices.length !== 4) { errors.push(qid + ': needs exactly 4 choices'); return; }
      if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) errors.push(qid + ': bad answer index');
      var untagged = 0;
      q.choices.forEach(function (c, i) {
        if (!c.text) errors.push(qid + ': choice ' + i + ' missing text');
        if (!c.why) warnings.push(qid + ': choice ' + i + ' missing explanation');
        if (c.tag === undefined) untagged += 1;
        else if (DISTRACTOR_TAGS.indexOf(c.tag) === -1) warnings.push(qid + ': unknown tag ' + c.tag);
      });
      if (untagged !== 1) warnings.push(qid + ': expected exactly 1 untagged choice, got ' + untagged);
      else if (q.choices[q.answer].tag !== undefined) errors.push(qid + ': answer choice has a distractor tag');
      if (q._source !== 'vocabQuestion') {
        if (SKILLS.indexOf(q.skill) === -1) errors.push(qid + ': unknown skill ' + q.skill);
        if (!q.passage || !q.passage.type) { errors.push(qid + ': missing passage'); return; }
        var t = q.passage.type;
        if (t === 'single' && typeof q.passage.text !== 'string') errors.push(qid + ': single passage needs text');
        if (t === 'paired' && (!q.passage.text1 || !q.passage.text2)) errors.push(qid + ': paired passage needs text1/text2');
        if (t === 'notes' && (!Array.isArray(q.passage.bullets) || !q.passage.bullets.length)) errors.push(qid + ': notes passage needs bullets');
        if (t === 'chart') validateChart(qid, q.passage.chart);
      }
    });
  }

  function validateChart(qid, c) {
    if (!c) { errors.push(qid + ': chart passage missing chart spec'); return; }
    if (['bar', 'groupedBar', 'line'].indexOf(c.type) === -1) errors.push(qid + ': bad chart type');
    if (!Array.isArray(c.categories) || !c.categories.length || c.categories.length > 8) errors.push(qid + ': chart categories invalid');
    if (!Array.isArray(c.series) || !c.series.length || c.series.length > 3) { errors.push(qid + ': chart series invalid'); return; }
    c.series.forEach(function (s, i) {
      if (!Array.isArray(s.values) || s.values.length !== c.categories.length) {
        errors.push(qid + ': series ' + i + ' length mismatch');
      }
      (s.values || []).forEach(function (v) { if (typeof v !== 'number') errors.push(qid + ': non-numeric chart value'); });
    });
  }

  S.data = {
    SKILLS: SKILLS, SKILL_LABELS: SKILL_LABELS, DOMAINS: DOMAINS,
    DISTRACTOR_TAGS: DISTRACTOR_TAGS, MISS_TAGS: MISS_TAGS, LIST_LABELS: LIST_LABELS,
    init: init,
    validate: function () { return { errors: errors, warnings: warnings }; },
    vocab: function () { return raw.vocab; },
    vocabQuestions: function () { return idx.vocabQuestions; },
    bank: function () { return idx.bank; },
    bankBySkill: function (skill) { return idx.bankBySkill[skill] || []; },
    mocks: function () { return idx.mocks; },
    mockById: function (id) {
      for (var i = 0; i < idx.mocks.length; i++) if (idx.mocks[i].id === id) return idx.mocks[i];
      return null;
    },
    wordById: function (id) { return idx.wordById[id]; },
    vocabQuestionForWord: function (wordId) { return idx.vocabQByWordId[wordId]; },
    questionById: function (id) { return idx.questionById[id]; },
    skillOrderIndex: function (skill) { return SKILLS.indexOf(skill); },
    domainOfSkill: function (skill) {
      var found = null;
      Object.keys(DOMAINS).forEach(function (d) { if (DOMAINS[d].skills.indexOf(skill) !== -1) found = d; });
      return found;
    }
  };
})(window.SATPrep = window.SATPrep || {});
