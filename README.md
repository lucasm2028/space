# SAT 1600 — Vocab & Reading/Writing Practice

A self-contained practice website for the **digital SAT Reading & Writing section**, built for
students pushing toward 1600. No accounts, no server, no build step — everything runs in your
browser and progress is saved locally.

## How to use it

**Option A — open it directly:** download/clone this repo and open `index.html` in any modern
browser. That's it.

**Option B — host it free on GitHub Pages:** in this repo go to *Settings → Pages → Build and
deployment*, choose *Deploy from a branch*, pick this branch and `/ (root)`, save. Your site
appears at `https://<your-username>.github.io/<repo>/` in a minute or two.

> Progress is stored in the browser's localStorage, so the file-opened site and the
> GitHub Pages site keep **separate** progress. Use *Settings → Export/Import progress*
> to move it between them or to back it up.

## What's inside

### Vocabulary (1,460 words from your lists)
- **Flashcards with spaced repetition** — an SM-2 scheduler decides when each word comes back
  (Again / Hard / Good / Easy, keyboard `space` + `1–4`). Words climb mastery tiers
  (New → Learning → Familiar → Strong → Mastered) and demote when you lapse. Words you miss
  4+ times are flagged as "stubborn" and always show their example sentence.
- **SAT-style questions** — one authentic *"Which choice completes the text with the most
  logical and precise word or phrase?"* question per word, with an explanation for **every**
  answer choice (including why each wrong choice is wrong, tagged with its trap type).
- **Synonym Sprint** — 60-second rapid matching rounds for recall speed.
- **SparkNotes 1000 list** — the "1000 Most Common SAT Words" (definitions + example
  sentences), filtered to the 884 words not already covered by the other lists. These are
  flashcard-only (no per-word quiz question) and are introduced after the curated lists.

### Reading & Writing practice (hard difficulty only)
- **130 hard questions** across all 11 official skills (Words in Context, Text Structure &
  Purpose, Cross-Text Connections, Central Ideas & Details, Command of Evidence — Textual and
  Quantitative with real charts, Inferences, Boundaries, Form/Structure/Sense, Transitions,
  Rhetorical Synthesis), practiced by skill or interleaved, with per-choice explanations and
  a pacing timer against per-skill target times.
- **Two full timed modules** — 27 questions / 32:00, matching the real digital SAT Module 2
  (hard) format and question ordering: hideable timer, flag for review, answer-eliminator
  cross-out tool, question navigator, review screen, auto-submit at 0:00. The clock keeps
  running if you close the tab, exactly like Bluebook. Score reports show your raw score, a
  Module-2 routing verdict (~65% bar), per-skill accuracy, and time per question.

### The stuff that actually moves scores
- **Error log** — every miss requires a "why did I miss it" tag (top scorers' #1 habit), and
  missed questions return for **redo-before-reveal** on a 1 → 4 → 10 day ladder until you get
  them right twice in a row.
- **Daily goal + streak** — clear due reviews, learn N new words, answer M questions.
  Streak freezes forgive one missed day per week of consistency.
- **Analytics** — accuracy and average seconds per skill, vocab tier distribution, and a
  weakest-skill shortcut.

## Design notes

- Question formats, stems, module timing (27 q / 32 min), in-module skill ordering, and
  hard-difficulty characteristics were modeled on College Board's official digital SAT
  practice materials and current (2024–2026) test analyses.
- Every practice question was machine-authored against a style guide derived from official
  exemplars, then independently adversarially verified (blind re-solving, ambiguity checks)
  before inclusion. Source word lists were extracted verbatim from the provided PDFs (with a
  handful of typo corrections).
- `authoring/` contains the style guides and the master word list used to generate content,
  so more questions can be produced the same way.
- `tests/` contains a Playwright end-to-end suite (dev-only; not loaded by the site):
  `cd tests && npm install && npx playwright test`.

## Repo layout

```
index.html            app shell (open this)
css/                  theme + styles (light/dark)
js/                   app modules (vanilla JS, no dependencies)
js/views/             one module per screen
data/                 all words + questions as plain JS data files
authoring/            content-generation guides + master word list
tests/                Playwright smoke tests (dev-only)
```
