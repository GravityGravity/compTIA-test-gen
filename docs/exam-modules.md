# Exam Modules – How to Build One

This guide tells you how to build an exam module (approved 2026-10-30). Follow it for each exam: Core 1 (220-1201), Core 2 (220-1202), Network+ (N10-009), Security+ (SY0-801), and exams that are added later. All exam modules use the same code. Only the config (`config/exams/<code>.json`) and the content (`content/<module>/`) are different. A new exam needs no code changes, except a new book format in the question extractor or a new scenario generator kind.

Each exam question comes from one of two places:
- **Generated scenario questions.** The app writes them at attempt time from scenario records and a sentence grammar. The sentence structure changes between attempts.
- **The question pool.** Fixed questions: every practice question from the exam's books, with the book's answers, plus questions written from the chapters. A pool question can be a knowledge question or a scenario question.

The field lists and examples for each record are in `content/README.md`. This guide gives the method.

## 1. Inputs

| Input | Where |
|---|---|
| Official objectives (every objective and its sub-topics) | `sources-text/<category>/objectives-<code>/01-*.md` |
| Exam overview (question count, time, passing score, domains, weights, structures, structure mix) | `docs/compTIA-exam-overviews.md`, the part for this exam only |
| Books for the exam | `sources-text/<category>/<book>/`, found with `sources-text/sources-index.md` |
| Book questions, parsed | `sources-text/derived/questions/<book>.json` (made by `tools/extract/extract_questions.py`) |

Do not mix values or sources between exams. A+ content uses `sources-text/general/` (and `core1/`, `core2/`). Network+ content uses `sources-text/network/` only. Security+ content uses `sources-text/sec/` only.

## 2. The exam config

Add these fields to `config/exams/<code>.json`. Take each value from the exam's part of `docs/compTIA-exam-overviews.md`.

| Field | How to get the value |
|---|---|
| `content` | The exam module's folder in `content/` (for example `core1`). Make the folder with `pool/`, `scenarios/`, and `grammar.json`. |
| `questionCount` | `{ "min", "max" }`. The overview gives the maximum. The minimum is 75 for all current exams (approved). |
| `timeLimitMinutes` | The overview's time. |
| `passingScore`, `maxScore` | The overview's passing score and scale (for example 675 of 900). |
| `scenarioShare` | The overview's scenario percentage, rounded ("How the Estimates Were Calculated"). |
| `generatedScenarioShare` | The percentage of scenario questions that the generator writes. The rest come from pool questions with `structure: "scenario"`. Default 70. |
| `domains[].objectives` | Every objective of the domain, in order: `{ "id": "2.6", "kind": "scenario" }`. `kind` is `scenario` when the objective title starts with "Given a scenario", and `knowledge` for every other verb (Explain, Compare and contrast, Summarize, Identify). |

`tools/extract/check_config.py` checks that every objective in the objectives file is listed once, and that the kinds give the config's `scenarioShare` (within 2 points) with the overview's method.

Keep `active: false` until the content is complete (section 7).

## 3. How the app builds an attempt

The engine (`src/engine/exam/`) does these steps with one seeded random generator. The seed is saved with the attempt.

1. Select the question count at random from `questionCount`.
2. Divide the questions among the domains by their weights (largest remainder, so the counts add up).
3. Divide each domain into scenario slots and knowledge slots. A domain's scenario part is its number of scenario objectives divided by all its objectives. The parts are scaled so the exam total matches `scenarioShare`.
4. Divide the scenario slots: `generatedScenarioShare` to the generator, the rest to pool questions with `structure: "scenario"`.
5. In each domain, spread the questions across the objectives evenly, then across the topics (top-level bullets).
6. Select pool questions. Questions the user has seen least often (in completed attempts) come first. No question or scenario record is used twice in one attempt.
7. When a slot type runs short, fill it from the other type. Stop with an error only when the domain has no questions left.
8. Shuffle the options of each question (except `fixedOrder` questions) and the question order.
9. Save the full text of each question, its options, answers, and explanations with the attempt.

Grading: a single-response question is correct or incorrect. A multiple-response question gets partial credit (selected correct / total correct) only when no wrong option is selected. Score = round(`maxScore` × points / questions). The attempt passes when the score is at least `passingScore`. The results show a per-domain breakdown.

## 4. The question pool

Files: `content/<module>/pool/d<N>.json`, one file for each domain.

### Rules
- **Book questions.** Copy every practice question from the exam's books into the pool: chapter quizzes, review questions, self-checks, and practice exams. Keep the stem, the options, the answers, and the explanation as the book has them. Set `origin: "book"` and `source` (book, chapter, and question number).
- **Older books.** Questions from books for older objectives (for example 220-1101/1102) are also copied as they are (approved 2026-10-30). Tag each one with the closest current objective and topic. When no current objective matches exactly, add a `note` that names the old objective.
- **Questions without an answer.** Some books have questions with no answer key. Write the answer and the explanation from the chapter text. Set `origin: "book"` and `answerOrigin: "written"`.
- **Duplicates.** When two books have the same question, keep one. `check_questions.py` warns about stems that are almost the same.
- **Written questions.** After the book questions are in, read the domain's chapters (current books first) and write new questions (`origin: "written"`) for each topic that has fewer than 2 questions. Write them from the facts in the chapters, in our own words.
- **Coverage.** Every topic (each top-level bullet, numbered step, or table under an objective) has at least 1 pool question, and 2 is the target (changed 2026-10-30; was 3). Each exam has at least 800 pool questions. More is good when the questions are good.
- **Explanations.** The correct answer has an explanation of 2–5 sentences. Each wrong option has a 1-sentence `whyWrong`. For a book question, add the `whyWrong` sentences that the book does not give.

### Fields that set how a question is used
- `type`: `single` or `multiple`. Keep the code for each type separate, so PBQ types can be added later.
- `structure`: one of the structures in the overview:

| Overview structure | `structure` value |
|---|---|
| Scenario-based | `scenario` |
| Definition and recall | `recall` |
| Select the correct item | `select-item` |
| Process and procedure steps | `procedure` |
| Calculation | `calculation` |

  Qualifier words and multiple response are not structures in the pool. They are the `qualifier` field and `type: "multiple"`, and they can occur with any structure.
- `qualifier`: `BEST`, `FIRST`, `NEXT`, `MOST LIKELY`, `LEAST`, or `null`. Write the word in capitals in the stem.
- `objectives` and `topics`: `<exam>/<objective>` and `<exam>/<objective>.<n>`, where `<n>` is the number of the topic under the objective (1, 2, …) in the objectives file. A topic is a top-level bullet, a numbered step (when the objective is a list of steps), or a table (one topic for the whole table). `tools/extract/check_questions.py --topics <code>` prints the numbered list.

## 5. Scenario records

Files: `content/<module>/scenarios/d<N>.json`. Write scenario records for each scenario objective (`kind: "scenario"` in the config).

### Kinds
Each record has a `kind`. Each kind has its own generator in `src/engine/exam/scenario/`.

| Kind | Use it for | Question types it writes |
|---|---|---|
| `fault` | Troubleshooting: a cause with its symptoms and its fix | MOST LIKELY cause, BEST action, FIRST step |
| `requirement` | A need with conditions that one tool, setting, command, device, or method meets (setup, configuration, security settings, backup, remote access) | BEST tool, setting, or method |
| `procedure` | Ordered steps (malware removal, change management, a troubleshooting methodology when the exam tests it) | FIRST step, NEXT step |
| `calculation` | Values that code calculates (subnetting: usable hosts, mask, network or broadcast address) | Calculate the value |

### How a question is made
1. Select a record for the slot's domain and objective.
2. Select 2–3 of its `clues` in random order, a setting, a person, and a question type.
3. Join the parts with the grammar. Each part has many phrasings.
4. Take 3 distractors from the answers of the record's `related` records.
5. The correct explanation is the record's `explanation` plus one sentence that links the selected clues to the answer. Each distractor's 1-sentence `whyWrong` is made from that record's `appliesWhen`: "That fixes the problem when …, but here …".

### Rules
- Each scenario objective has at least 6 records, and each of its topics has at least 1.
- Each `fault` and `requirement` record has at least 3 `related` records of the same exam and kind with different answers, so it always has 3 distractors. A `procedure` takes its distractors from its own steps; a `calculation` works them out.
- A record's `explanation` has 1–3 sentences; the generator adds the sentence that links the clues.
- Clues are symptoms or conditions that a user or technician sees, not the answer in other words.
- Write records from the facts in the domain's chapters. Set `origin: "written"` and `source`.

### Grammar
- `content/shared/grammar.json`: rules that all exams use (people, roles, offices, company types, sentence frames).
- `content/<module>/grammar.json`: rules for one exam (devices, operating systems, network places).

A rule is a list of phrasings. `#rule#` in a phrasing is replaced by one phrasing of that rule. Modifiers: `#rule.a#` (adds "a" or "an") and `#rule.capitalize#`. A phrasing never contains the answer. A rule in both files takes the exam's phrasings, so an exam can change a shared frame (for example `tech` to "the network technician"). The rule names the generators use are listed in `content/README.md`.

### Add a generator kind
A new kind is a code change: add `src/engine/exam/scenario/<kind>.ts` with its record fields and question types, register it in `scenario/index.ts`, add the fields to `content/README.md` and to `check_questions.py`, and add tests.

## 6. Tools

```bash
tools/extract/.venv/bin/python -I tools/extract/extract_questions.py <book-key>
tools/extract/.venv/bin/python -I tools/extract/check_questions.py
tools/extract/.venv/bin/python -I tools/extract/check_questions.py --topics <code>
tools/extract/.venv/bin/python -I tools/extract/check_config.py
```

- `extract_questions.py` parses a book's questions, options, answers, and explanations into `sources-text/derived/questions/<book>.json`, with the chapter's exam and objectives. It reports answers without questions, and each record's `flags` say what to check when it is copied into the pool (for example `no-answer`, `figure`, `options-repaired`). These staging records are not content records: the pool record adds the type, structure, qualifier, current objective and topic, and the `whyWrong` sentences.
- `check_questions.py` checks the pool and scenario records and prints the coverage report: questions for each topic, objective, and domain, the pool total, and scenario records for each scenario objective. For an active exam, a topic with no questions, a pool with fewer than 800, or a scenario objective with too few records is an error, and a topic with only 1 question is a warning. For an exam that is not active yet, these are listed as gaps (`--gaps` lists all), so the report shows what each domain still needs.

## 7. Workflow

1. Write the exam config (section 2). Run `check_config.py`.
2. Run `extract_questions.py` for each book of the exam.
3. Do one domain at a time. Stop after each domain so the user can review it:
   1. Copy the domain's book questions from the staging files into `pool/d<N>.json` and tag them (section 4). Check each record's `flags` against the chapter: a `figure` question needs its stem rewritten without the figure or is left out; `options-repaired` and `few-options` need the options checked; a `no-answer` question gets an answer written from the chapter (`answerOrigin: "written"`).
   2. Write questions for the topics with fewer than 2.
   3. Write the scenario records and grammar for the domain's scenario objectives (section 5).
   4. Run `check_questions.py` and `npm test` (the test generates many attempts from the real content). While the exam is not active, the test builds attempts from the domains that have content only, with their share of the question count.
   5. Keep the triage of the staging questions that did not go into this domain (`sources-text/derived/questions/_triage-<module>-*.json`: questions deferred to another domain or exam with their target objective, and dropped questions with the reason). The next domains, and the other exam of the same certification, start from it.
4. When all domains are reviewed and the checks pass, set `active: true` in the exam config.

## 8. Checklist: add a new exam module

- [ ] The objectives are extracted to `sources-text/<category>/objectives-<code>/`.
- [ ] The exam has a part in `docs/compTIA-exam-overviews.md`.
- [ ] The books are extracted and listed in `sources-text/sources-index.md`.
- [ ] `config/exams/<code>.json` exists with all fields, and the certification config lists the exam.
- [ ] The book questions are parsed (a new book format needs a parser in `extract_questions.py`).
- [ ] Every domain has its pool and scenario records, reviewed by the user.
- [ ] `check_config.py`, `check_questions.py`, and `npm test` pass.
- [ ] `active: true`.
