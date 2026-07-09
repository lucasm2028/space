# Vocab Fill-in-Blank Question Authoring Guide

You are writing one SAT-style "Words in Context" question for EACH assigned vocabulary word.
The student learns these exact words, so the ASSIGNED WORD IS ALWAYS THE CORRECT ANSWER.
Word details (definition/synonyms/example) are in
`/tmp/claude-0/-home-user-space/f4058f52-1461-5441-ae6f-e59b767cc929/scratchpad/vocab_master.json`
— look up your assigned words there (match by "id"). Official style exemplars (Practice Test #11):
`/tmp/claude-0/-home-user-space/f4058f52-1461-5441-ae6f-e59b767cc929/scratchpad/practice_test11.txt` (questions 1–5 of each module).

## Format (exact digital SAT "Words in Context" style)

- Stem: a 25–60 word mini-passage in formal academic register with exactly one blank
  written as "______" (6 underscores). Model it on real WIC passages: a specific subject
  (a researcher's finding, an artist's work, a historical practice, a natural phenomenon)
  with context clues that uniquely select the target word. Colons, contrast markers, and
  appositives are the classic clue mechanisms.
- Do NOT reuse the word's example sentence from vocab_master.json verbatim — write a fresh
  passage (you may echo its theme). Never use the target word (or its root) elsewhere in the stem.
- Choices: the target word + 3 distractors. Distractors MUST:
  - be the same part of speech and inflection as the target (all bare verbs, all past
    participles, all adjectives, etc.), and fit grammatically in the blank;
  - be real, SAT-register words — PREFER words from vocab_master.json (reinforcement),
    else tier-2 academic words (e.g., eschew, attenuate, bolster, codify, entrench);
  - be decisively wrong in context via a nameable flaw (reversed direction, wrong intensity,
    out of scope, wrong domain) while remaining tempting in tone.
- For phrase entries (e.g., "compliance with"), all four choices are parallel phrases
  ("adherence to", "deviation from", ...).
- The passage's logic must make the target the ONLY defensible choice. If two choices could
  arguably fit, rewrite the passage to add a discriminating clue.

## Output schema (JSON per question)

{
  "id": "vq-<wordId>",              // e.g. "vq-mh-abate"
  "wordId": "<wordId>",
  "skill": "words-in-context",
  "stem": "...passage with ______ ...",
  "choices": [
    {"text": "<word>", "why": "<why correct: name the context clue>"},
    {"text": "<distractor>", "why": "<why wrong: name the flaw>", "tag": "<tag>"},
    {"text": "...", "why": "...", "tag": "..."},
    {"text": "...", "why": "...", "tag": "..."}
  ],
  "answer": <0-3, index of the target word — the only choice with no "tag">
}

Tags: "too-broad" | "too-specific" | "reversed" | "unsupported" | "true-but-irrelevant"
(for vocab items, "unsupported" = nothing in the passage supports that meaning;
"reversed" = opposite direction; intensity mismatches use "too-broad"/"too-specific").

"why" style: 1–2 tight sentences. Correct choice: point to the decisive clue
("The colon introduces an elaboration of 'joined into a single unit,' so the blank must
mean linked"). Wrong choices: name the flaw AND gloss the word's actual meaning (this
teaches the distractor word too).

## Balance & difficulty

- Spread correct answers evenly across positions 0–3 within your batch.
- Difficulty: write at hard-Module-2 level — at least one distractor should be a near-synonym
  that fails on precision (intensity/register/scope), not an obviously unrelated word.
- Vary passage topics across your batch (science, arts, history, social science, literature);
  don't reuse the same scenario twice.
