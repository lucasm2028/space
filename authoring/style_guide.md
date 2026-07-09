# Digital SAT R&W Question Authoring Guide (HARD difficulty only)

You are writing practice questions for a student targeting 1600. Every question must be
indistinguishable in style from official College Board digital SAT questions and calibrated
to **hard Module 2** difficulty. Official exemplars are in
`/tmp/claude-0/-home-user-space/f4058f52-1461-5441-ae6f-e59b767cc929/scratchpad/practice_test11.txt`
(College Board Practice Test #11) — read the relevant question types before writing.
The full vocab word bank is in
`/tmp/claude-0/-home-user-space/f4058f52-1461-5441-ae6f-e59b767cc929/scratchpad/vocab_master.json`.

## Universal style rules

- Passage: 25–150 words. Formal, information-dense, academic register. NEVER longer.
- Exactly 4 choices. Choice text does NOT include "A)" prefixes (the app adds letters).
- One and only one defensible answer. This is the single most important rule: a strong
  test-taker must not be able to build a case for any distractor. Distractors must be
  attractive but each must have a specific, nameable disqualifying flaw.
- Stems use OFFICIAL wording verbatim (see per-skill stems below).
- Subject matter mix (like the real test): natural-science studies, social-science/economics
  research, humanities/arts scholarship, literary excerpts, history/culture. Vary topics
  across your batch; favor specific, concrete scenarios (named-sounding researchers,
  specific species/artworks/phenomena).
- Attribution rules: For literary excerpts, either use a real public-domain (pre-1929) work
  framed as "The following text is adapted from <Author>'s <year> <work>." (adaptation
  permits paraphrase — do not fabricate exact famous quotes), or use anonymous framing
  ("The following text is adapted from an 1897 short story."). For research passages,
  invented-but-plausible studies with realistic researcher names are fine (this is standard
  for practice material), but never attribute invented claims to real living famous people.
- American spelling and mechanics. Em dashes, semicolons, etc. exactly as SAT uses them.
- Answer distribution: within your batch, spread correct answers roughly evenly across
  positions 0–3 (A–D). Never let more than two consecutive questions share a position.

## Output schema (JSON per question)

{
  "id": "<assigned in your instructions>",
  "domain": "craft|information|conventions|expression",
  "skill": "<one of the 11 skills>",
  "difficulty": "hard",
  "targetSeconds": <number — see per-skill below>,
  "passage": { ... one of the variants below ... },
  "stem": "<official stem wording>",
  "choices": [
    {"text": "...", "why": "<why this is correct — name the decisive textual evidence/rule>"},
    {"text": "...", "why": "<why wrong — name the specific flaw>", "tag": "<distractor tag>"},
    {"text": "...", "why": "...", "tag": "..."},
    {"text": "...", "why": "...", "tag": "..."}
  ],
  "answer": <index 0-3 of the correct choice — the ONLY choice without a "tag">
}

Passage variants:
- {"type":"single","text":"..."} — plain passage. "\n\n" = paragraph break. For
  Text Structure & Purpose questions about an underlined portion, wrap it: [[u]]...[[/u]].
  For Words in Context and fill-in blanks use exactly "______" (6 underscores) as the blank.
  For quoted poetry/verse lines inside prose, use "/" line separators like the real test.
- {"type":"paired","text1":"...","text2":"..."} — Cross-Text Connections only.
- {"type":"notes","intro":"While researching a topic, a student has taken the following notes:","bullets":["...","..."]} — Rhetorical Synthesis only.
- {"type":"chart","text":"...","chart":{...}} — Command of Evidence (Quantitative) only. Chart spec:
  {"type":"bar|groupedBar|line","title":"...","xLabel":"...","yLabel":"...",
   "categories":["..."],"series":[{"name":"...","values":[...]}, ...(max 3)],
   "yFormat":"number|percent","note":"<optional caption>"}
  Max 7 categories. series values length MUST equal categories length. The prose text ends
  with an incomplete claim completed by the choices, or the stem asks which choice best
  describes data supporting a stated conclusion.

Distractor tags (pick the single best fit for each wrong choice):
"too-broad" | "too-specific" | "reversed" | "unsupported" | "true-but-irrelevant"

Explanation ("why") style: 1–2 sentences, direct, naming the decisive evidence. For the
correct choice, quote or point to the exact context clue / grammatical rule. For wrong
choices, name the flaw precisely ("This is a real dictionary meaning of 'assume,' but the
context requires taking on a duty, not supposing"; "Accurately restates the graph, but that
trend concerns Species B, so it cannot support a claim about Species A").

## Per-skill specs (stems, targetSeconds, HARD recipe)

### words-in-context (domain craft, targetSeconds 75)
Stem: "Which choice completes the text with the most logical and precise word or phrase?"
Also allowed (for in-context meaning): "As used in the text, what does the word "X" most nearly mean?"
HARD recipe: EITHER (a) secondary meanings of familiar words (assume=take on, qualify=limit,
champion=advocate, temper=moderate, index=indicator, manifest=evident); OR (b) blank whose
choices are tier-2/3 academic words (eschew, attenuate, capacious, quotidian, ineluctable,
verisimilitude, equivocal, pernicious, cursory, imperious...). Passage contexts: dense
humanities scholarship, science summaries, or 100-year-old literary prose. Traps:
common-definition (right word, wrong sense), intensity mismatch (near-synonym too
strong/weak), out-of-scope, tone-fits-logic-fails. All four choices should be roughly the
same part of speech and register.

### text-structure (domain craft, targetSeconds 85)
Stems: "Which choice best states the function of the underlined sentence in the text as a whole?" /
"Which choice best states the main purpose of the text?" / "Which choice best describes the
overall structure of the text?"
HARD recipe: literary/poetic texts where imagery must be interpreted, or research passages
where the underlined portion plays a subtle role (concedes a limitation, preempts an
objection, pivots the argument). Distractors describe functions of OTHER sentences, or
plausible-sounding functions the text never performs.

### cross-text (domain craft, targetSeconds 95)
Stem: "Based on the texts, how would (the author of) Text 2 most likely respond to
<the underlined claim / the argument> in Text 1?" or "Based on the texts, both authors would
most likely agree with which statement?"
HARD recipe: the relationship is nuanced — complicates, qualifies, "criterion too narrow,"
"appears reasonable but is contradicted by the study outcomes" — never plain agree/disagree.
Traps: false agreement, twisted wording lifted from the texts, right-direction-wrong-dynamic,
overstated hypothetical reactions.

### central-ideas (domain information, targetSeconds 85)
Stems: "Which choice best states the main idea of the text?" / "Based on the text, which choice
best describes X?" / "According to the text, ..."
HARD recipe: dense literary prose (irony, understatement — e.g., a narrator's mocking praise)
or hedged academic claims. Distractors: too broad, too narrow, plausible-but-unstated,
detail-as-main-idea.

### evidence-textual (domain information, targetSeconds 90)
Stems: "Which quotation from <work> most effectively illustrates the claim?" / "Which finding,
if true, would most strongly support/undermine the <claim/hypothesis>?"
HARD recipe: study-logic puzzles. State a hypothesis WITH a causal mechanism; the
support/weaken hinges on the mechanism, not the surface claim. Traps are scientifically
plausible facts that never touch the causal link (tag: true-but-irrelevant), restatements of
the claim itself, and evidence for a different claim.

### evidence-quant (domain information, targetSeconds 95)
Stem: "Which choice most effectively uses data from the graph/table to complete the text?" or
"Which choice best describes data from the graph that support <researcher>'s conclusion?"
HARD recipe: the completing claim requires synthesizing the RIGHT slice of data (a specific
series, category, or comparison). Traps: accurate readings of the WRONG series/category,
reversed trends, values not in the chart. The prose must make a precise claim so only one
data statement fulfills it. Charts must be internally consistent and the correct choice's
numbers must match the spec's values exactly.

### inferences (domain information, targetSeconds 95)
Stem: "Which choice most logically completes the text?"
HARD recipe: conclusion-completion logic puzzles: 3–5 premises (often a research setup with a
twist or an unexplained result); the correct completion is the only statement consistent with
ALL premises, usually guarded/hedged. Traps: absolute language, scope creep, real-world-true
but unsupported, restatement of a premise.

### boundaries (domain conventions, targetSeconds 50)
Stem: "Which choice completes the text so that it conforms to the conventions of Standard English?"
HARD recipe: colon-joins of independent clauses (with period/semicolon absent from choices),
sentence-boundary illusions, nested nonessential appositives (matched dashes vs commas),
subject–verb separation traps, semicolon-in-list contexts. Embed in long academic sentences
about research/art history so the clause skeleton is obscured. Use "______" for the blank
position; the four choices differ ONLY in punctuation/words at the blank.

### form-structure-sense (domain conventions, targetSeconds 50)
Stem: same as boundaries.
HARD recipe: verb tense sequence (past perfect vs future perfect in historical narration),
subject–verb agreement with long intervening phrases (inverted or collective subjects),
dangling/misplaced modifiers where 3 choices are grammatical but illogical, pronoun
agreement, parallel structure in three-part lists. Choices differ only at the blank.

### transitions (domain expression, targetSeconds 60)
Stem: "Which choice completes the text with the most logical transition?"
HARD recipe: dense academic prose; distractors clustered in ADJACENT logical categories
(e.g., needed: exemplification "for example"; traps: "nevertheless," "moreover,"
"consequently" — including one that matches a superficial misreading). The logical
relationship must require reading BOTH sentences precisely.

### rhetorical-synthesis (domain expression, targetSeconds 60)
Stem: "The student wants to <precise rhetorical goal>. Which choice most effectively uses
relevant information from the notes to accomplish this goal?"
passage type "notes" with 5–6 bullets. HARD recipe: bullets contain nuanced or CONFLICTING
information (benefit + concern); all four choices are factually true to the notes and
grammatical; only one accomplishes the exact rhetorical verb ("emphasize a difference" ≠
"introduce a comparison"; "present the study to an audience unfamiliar with X" requires
defining X). Traps pursue an adjacent goal, oversimplify one side, or overstate hedged notes.

## Difficulty bar (every question must clear it)

A question is HARD enough only if: the two most attractive choices differ on a subtle but
decisive point; solving requires precise reading of the whole passage (not keyword matching);
and an average student would plausibly pick a specific named distractor. If your draft can be
answered from the stem + choices alone without the passage, rewrite it.
