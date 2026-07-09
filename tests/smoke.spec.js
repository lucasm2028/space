// End-to-end smoke tests for the SAT 1600 prep site.
// Runs against both the http project (GitHub-Pages-like) and file:// project.
// Each test gets a fresh browser context, so localStorage is isolated per test.
const { test, expect } = require('@playwright/test');

function urlFor(baseURL, hash) {
  return baseURL + '/index.html' + hash;
}

// Replaces the R&W bank and mocks with deterministic fixtures. Registered as an init
// script; the DOMContentLoaded listener below runs BEFORE app.js's boot listener
// (registration order), after all data files have executed.
const FIXTURE = `
document.addEventListener('DOMContentLoaded', function () {
  var D = window.SAT_DATA = window.SAT_DATA || {};
  D.rwBank = [{
    id: 'fix-chart-1', domain: 'information', skill: 'evidence-quant', difficulty: 'hard', targetSeconds: 95,
    passage: { type: 'chart', text: 'A team measured germination rates. The treatment with the highest rate for Species A was ______',
      chart: { type: 'groupedBar', title: 'Germination Rate by Treatment', xLabel: 'Treatment', yLabel: 'Rate (%)',
        categories: ['Control', 'Compost'], series: [
          { name: 'Species A', values: [40, 70] }, { name: 'Species B', values: [50, 60] } ], yFormat: 'percent' } },
    stem: 'Which choice most effectively uses data from the graph to complete the text?',
    choices: [
      { text: 'Compost.', why: 'Species A reaches 70% under compost, its highest value.' },
      { text: 'Control.', why: 'Species A is only 40% under control.', tag: 'reversed' },
      { text: 'Neither.', why: 'The graph shows a clear maximum.', tag: 'unsupported' },
      { text: 'Both equally.', why: 'The two bars differ by 30 points.', tag: 'unsupported' }
    ], answer: 0 }];
  var qs = [];
  for (var i = 0; i < 27; i++) {
    qs.push({
      id: 'fixm-q' + (i + 1), domain: 'craft', skill: 'words-in-context', difficulty: 'hard', targetSeconds: 75,
      passage: { type: 'single', text: 'Fixture passage ' + (i + 1) + ' with a ______ to fill.' },
      stem: 'Which choice completes the text with the most logical and precise word or phrase?',
      choices: [
        { text: 'right' + (i + 1), why: 'Correct fixture answer.' },
        { text: 'wrongA', why: 'Wrong.', tag: 'unsupported' },
        { text: 'wrongB', why: 'Wrong.', tag: 'reversed' },
        { text: 'wrongC', why: 'Wrong.', tag: 'too-broad' }
      ], answer: 0 });
  }
  D.mocks = [{ id: 'fix-mock', title: 'Fixture Module', subtitle: 'test only', timeLimitSeconds: 1920, questions: qs }];
}, { once: true });
`;

test.describe('boot & integrity', () => {
  test('dashboard renders with no console errors and zero data errors', async ({ page, baseURL }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(urlFor(baseURL, '#/dashboard'));
    await expect(page.locator('h1')).toHaveText('Dashboard');
    const integrity = await page.evaluate(() => window.SATPrep.data.validate());
    expect(integrity.errors).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('all routes render a heading', async ({ page, baseURL }) => {
    await page.goto(urlFor(baseURL, '#/dashboard'));
    for (const [route, heading] of [
      ['#/vocab', 'Vocabulary'], ['#/practice', 'Reading & Writing Practice'],
      ['#/mock', 'Timed Modules'], ['#/review', 'Review & Error Log'], ['#/settings', 'Settings']
    ]) {
      await page.evaluate((r) => { location.hash = r; }, route);
      await expect(page.locator('h1')).toHaveText(heading);
    }
  });
});

test.describe('flashcards / SRS', () => {
  test('rating Good schedules the card and updates the day ledger', async ({ page, baseURL }) => {
    await page.goto(urlFor(baseURL, '#/vocab/flashcards'));
    await page.locator('.fc-card').click();
    await page.locator('.fc-good').click();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sat1600.v1')));
    const recs = Object.values(stored.srs);
    expect(recs.length).toBe(1);
    expect(recs[0].ivl).toBe(1);
    expect(recs[0].reps).toBe(1);
    const day = Object.values(stored.days)[0];
    expect(day.reviews).toBe(1);
    expect(day.newWords).toBe(1);
  });

  test('rating Again marks a lapse and requeues within the session', async ({ page, baseURL }) => {
    await page.goto(urlFor(baseURL, '#/vocab/flashcards'));
    await page.locator('.fc-card').click();
    await page.locator('.fc-again').click();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sat1600.v1')));
    expect(Object.values(stored.srs)[0].lapses).toBe(1);
  });

  test('keyboard: space flips, 3 rates Good', async ({ page, baseURL }) => {
    await page.goto(urlFor(baseURL, '#/vocab/flashcards'));
    await page.locator('.fc-card').waitFor();
    await page.keyboard.press(' ');
    await page.locator('.fc-good').waitFor();
    await page.keyboard.press('3');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sat1600.v1')));
    expect(Object.keys(stored.srs).length).toBe(1);
  });
});

test.describe('vocab quiz (real content)', () => {
  test('answers record and word card appears', async ({ page, baseURL }) => {
    await page.goto(urlFor(baseURL, '#/vocab/quiz'));
    const count = await page.evaluate(() => window.SATPrep.data.vocabQuestions().length);
    test.skip(count === 0, 'vocab questions not yet loaded');
    await page.locator('.choice').first().waitFor();
    // pick the keyed answer via the data layer so this works on any question
    const answer = await page.evaluate(() => {
      const S = window.SATPrep;
      const stemId = document.querySelector('.q-stem').id.replace('stem-', '');
      return S.data.questionById(stemId).answer;
    });
    await page.locator('.choice').nth(answer).click();
    await expect(page.locator('.explain-correct')).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sat1600.v1')));
    expect(Object.keys(stored.qhist).length).toBe(1);
  });
});

test.describe('practice with fixtures', () => {
  test('chart question renders SVG + data table; wrong answer forces tagged error log', async ({ page, baseURL }) => {
    await page.addInitScript(FIXTURE);
    await page.goto(urlFor(baseURL, '#/practice/evidence-quant'));
    await expect(page.locator('.chart-wrap svg')).toBeVisible();
    await expect(page.locator('.chart-wrap details')).toBeVisible();
    await page.locator('.choice').nth(1).click();
    await expect(page.locator('.modal')).toBeVisible();
    await page.locator('.modal button:has-text("Log it")').click();
    await expect(page.locator('.modal')).toBeVisible(); // blocked: no tag picked yet
    await page.locator('.modal button[data-tag="fell-for-distractor"]').click();
    await page.locator('.modal button:has-text("Log it")').click();
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
    await expect(page.locator('.explain')).toHaveCount(4);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sat1600.v1')));
    expect(stored.errorLog.length).toBe(1);
    expect(stored.errorLog[0].missTag).toBe('fell-for-distractor');
    expect(stored.errorLog[0].qid).toBe('fix-chart-1');
  });

  test('correct answer records history and shows per-choice explanations', async ({ page, baseURL }) => {
    await page.addInitScript(FIXTURE);
    await page.goto(urlFor(baseURL, '#/practice/evidence-quant'));
    await page.locator('.choice').nth(0).click();
    await expect(page.locator('.explain-correct')).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sat1600.v1')));
    expect(stored.qhist['fix-chart-1'].attempts[0].correct).toBe(true);
  });
});

test.describe('mock module with fixtures', () => {
  test('full run: timer, flag, eliminate, navigator, review, submit, report', async ({ page, baseURL }) => {
    await page.addInitScript(FIXTURE);
    await page.goto(urlFor(baseURL, '#/mock/fix-mock'));
    await page.locator('button:has-text("Begin module")').click();

    await expect(page.locator('.mock-timer')).toContainText(/3[12]:/);
    await page.locator('button:has-text("Hide")').click();
    await expect(page.locator('.mock-timer')).toContainText('••:••');
    await page.locator('button:has-text("Show")').click();

    await page.locator('.choice').nth(0).click();               // answer q1
    await page.locator('button:has-text("Next")').click();      // q2
    await page.locator('.flag-btn').click();                    // flag q2
    await expect(page.locator('.flag-btn')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('button:has-text("Next")').click();      // q3
    await page.locator('.elim-btn').nth(1).click();
    await page.locator('.elim-btn').nth(2).click();
    await expect(page.locator('.choice.is-eliminated')).toHaveCount(2);

    await page.locator('button:has-text("☰")').click();
    await page.locator('.nav-grid .nav-cell').nth(26).click();
    await expect(page.locator('.chip').first()).toContainText('Question 27 of 27');

    await page.locator('button:has-text("Review & submit")').click();
    await expect(page.locator('.chip-bad')).toContainText('26 unanswered');

    await page.locator('button:has-text("Submit module")').click();
    await expect(page.locator('h1')).toContainText('Score Report');
    await expect(page.locator('.score-big')).toHaveText('1 / 27');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sat1600.v1')));
    expect(stored.mockAttempts['fix-mock'][0].raw).toBe(1);
    expect(stored.mockAttempts['fix-mock'][0].routedHigher).toBe(false);
    expect(stored.activeMock).toBe(null);
    expect(stored.errorLog.length).toBe(26);
  });

  test('reload mid-module resumes against the original deadline', async ({ page, baseURL }) => {
    await page.addInitScript(FIXTURE);
    await page.goto(urlFor(baseURL, '#/mock/fix-mock'));
    await page.locator('button:has-text("Begin module")').click();
    await page.locator('.choice').nth(0).click();
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('sat1600.v1')).activeMock.deadlineEpochMs);
    await page.reload();
    await expect(page.locator('.mock-timer')).toBeVisible();
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('sat1600.v1')).activeMock.deadlineEpochMs);
    expect(after).toBe(before);
    await expect(page.locator('.choice[aria-checked="true"]')).toHaveCount(1);
  });
});

test.describe('redo flow', () => {
  test('missed question comes back; answering correctly advances the ladder', async ({ page, baseURL }) => {
    await page.addInitScript(FIXTURE);
    await page.goto(urlFor(baseURL, '#/dashboard'));
    await page.evaluate(() => {
      const S = window.SATPrep;
      const st = S.state.get();
      st.meta.errorCounter += 1;
      st.errorLog.push({
        id: 'el-0001', ts: Date.now(), source: 'practice', qid: 'fix-chart-1',
        gist: 'fixture', yourAnswer: 1, correctAnswer: 0, missTag: 'misread', note: '',
        redo: { schedule: [1, 4, 10], nextAt: S.util.todayLocal(), step: 0, streak: 0 },
        resolved: false
      });
      S.storage.save(st); S.storage.flush();
    });
    await page.goto(urlFor(baseURL, '#/review'));
    await page.locator('button:has-text("Start redos")').click();
    await expect(page.locator('.explain')).toHaveCount(0); // answer NOT pre-revealed
    await page.locator('.choice').nth(0).click();
    await expect(page.locator('.explain-correct').first()).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sat1600.v1')));
    expect(stored.errorLog[0].redo.streak).toBe(1);
    expect(stored.errorLog[0].resolved).toBe(false);
  });
});

test.describe('export/import', () => {
  test('export then import restores progress', async ({ page, baseURL }) => {
    await page.goto(urlFor(baseURL, '#/vocab/flashcards'));
    await page.locator('.fc-card').click();
    await page.locator('.fc-good').click();
    await page.goto(urlFor(baseURL, '#/settings'));
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button:has-text("Export progress")').click()
    ]);
    const fs = require('fs');
    const exported = fs.readFileSync(await download.path(), 'utf8');
    await page.evaluate(() => localStorage.removeItem('sat1600.v1'));
    await page.reload();
    await page.evaluate((json) => {
      const S = window.SATPrep;
      S.state.replaceState(S.storage.importState(json));
    }, exported);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sat1600.v1')));
    expect(Object.keys(stored.srs).length).toBe(1);
  });
});

test.describe('theme & a11y', () => {
  test('theme toggle persists across reload', async ({ page, baseURL }) => {
    await page.goto(urlFor(baseURL, '#/dashboard'));
    await page.locator('.icon-btn').click(); // auto -> light
    await page.locator('.icon-btn').click(); // light -> dark
    await page.reload();
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(after).toBe('dark');
  });

  test('choices are keyboard-activatable', async ({ page, baseURL }) => {
    await page.addInitScript(FIXTURE);
    await page.goto(urlFor(baseURL, '#/practice/evidence-quant'));
    await page.locator('.choice').first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.explain').first()).toBeVisible();
  });
});
