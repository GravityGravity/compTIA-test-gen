# Book extractor (dev only)

Turns the books in `sources/` into Markdown in `sources-text/`. It is not part of the app.

## Setup

```bash
python3 -m venv tools/extract/.venv
tools/extract/.venv/bin/pip install -r tools/extract/requirements.txt
```

## Run

```bash
tools/extract/.venv/bin/python -I tools/extract/extract_books.py
tools/extract/.venv/bin/python -I tools/extract/derive_terms.py
tools/extract/.venv/bin/python -I tools/extract/build_index.py
```

Content tools:

```bash
tools/extract/.venv/bin/python -I tools/extract/seed_acronyms.py a-plus
tools/extract/.venv/bin/python -I tools/extract/check_content.py
tools/extract/.venv/bin/python -I tools/extract/check_config.py
```

Exam module tools (see `docs/exam-modules.md`):

```bash
tools/extract/.venv/bin/python -I tools/extract/extract_questions.py [book-key ...]
tools/extract/.venv/bin/python -I tools/extract/check_questions.py
tools/extract/.venv/bin/python -I tools/extract/check_questions.py --topics 220-1201
tools/extract/.venv/bin/python -I tools/extract/check_questions.py --gaps
tools/extract/.venv/bin/python -I tools/extract/check_questions.py --root tests/fixtures/app-data --records-only
```

- `seed_acronyms.py {a-plus,network-plus,security-plus}` – one draft record for each official acronym in `content/acronyms/<cert>.json`, mapped to the objectives that name it. It does not overwrite an existing file: after seeding, the file is edited by hand (see `content/README.md`).
- `check_content.py` – checks every record in `content/acronyms/` and `content/definitions/`: fields, unique ids and answers, objective ids, definitions that give away the term, typed answers that are acronyms, small groups, and the online-source fields (`sourceUrls` with `verified`; an unverified record is a warning). Prints the counts for each certification. Exit code 1 when there are errors.
- `extract_questions.py [book-key ...]` – parses the practice questions of each book into `sources-text/derived/questions/<book-key>.json` (staging records, not content records): `id`, `book`, `file`, `chapter`, `exams` and `objectives` (from the chapter's `_chapters.tsv`, or the book's objective heading for Neil, Zacker, and West self-checks), `set` and `number`, `stem`, `options`, `answer` (option indexes, `null` when the book has none), `selectCount`, `explanation`, `incorrect` (Exam Cram practice exams: the "Incorrect answers" paragraph), `flags`, and `source`. Markdown bold and italics are removed; code blocks stay in the stem. The report gives the questions in each set, answers without questions, and the count of each flag. Each book format has its own parser (see "Question formats").
  - Flags: `no-answer`, `no-explanation`, `no-options`, `few-options` (fewer than 3), `answer-out-of-range`, `select-count-mismatch` ("Choose two" with another number of answers), `duplicate-options`, `figure` (the stem refers to a figure or exhibit the app cannot show), `options-repaired` and `option-labels-missing` (West: options put back in order by rule; check them against the book).
  - Result (2026-10-30): 3,995 questions. A+: Exam Cram 576, Docter 460, All-in-One 280, Neil 901, all with answers. Network+: Net Exam Cram 182 and Zacker 1,213, all with answers; West 383, of which 127 (self-checks) have answers and 256 (Review, Scenario-Based, appendix C) do not.
  - Security+ (2026-10-30; all four books are for SY0-701, so `exams` is `SY0-701` and `objectives` are SY0-701 numbers): 2,692 questions. Seidl 1,005 and Gorgotsias 1,140, all with answers; Neil 280, of which 277 have answers (the book's chapters 9, 11, and 27 have one question or answer too many or too few, and two chapter 18 items are tables with no options); Heuermann 267 quiz questions, none with answers (the answer appendix is not in this edition).
- `check_questions.py` – checks every record in `content/<module>/pool/` and `content/<module>/scenarios/`, and the grammar files: fields, unique ids, objectives and topics, answers, `whyWrong` for each wrong option, explanation length, near-duplicate stems, `related` records, and unknown grammar rules. Prints the coverage report: pool questions for each topic, objective, and domain, the pool total, and scenario records for each scenario objective. Also: qualifier words in the stem, sentence counts (an error on written text, a warning on book text), clues that give away the answer, `settings`/`devices` that are grammar rules, and the rules each generator needs. Online-sourced records (`sourceUrls`, `verified`): the report counts them, and a record with `verified: false` is a gap (an error for an active exam). For an active exam, a topic with no questions, fewer than 800 pool questions, or a scenario objective with fewer than 6 records (or a topic of it with none) is an error, and a topic with only 1 question is a warning; for an exam that is not active, these are listed as gaps (the first 20, or all with `--gaps`). `--topics <code>` prints the numbered topics of an exam: each top-level bullet, numbered step, or table under an objective (Core 1 has 131, Core 2 220, Network+ 135, Security+ 201). `--root <dir>` checks another folder with `config/` and `content/`, and `--records-only` lists an active exam's coverage gaps instead of failing on them (for the test fixture). Exit code 1 when there are errors.
- `check_config.py` – checks the configs in `config/certifications/`, `config/exams/` (including that each objective is listed once with the right kind, and that the kinds give `scenarioShare`), and `config/exercises/`: fields, known certifications and exams, question-type counts that add up to `questionCount`, typed questions in one direction only, and that every certification and exam choice has enough records (and enough typeable records). Prints the pool sizes. Exit code 1 when there are errors.

- `extract_books.py [book-key ...]` – one Markdown file for each chapter in `sources-text/<category>/<book-key>/`, plus a `_chapters.tsv` (file, exam, objectives, title). With no keys it extracts all books in `BOOKS`.
- `derive_terms.py` – for each certification (A+, Network+, and Security+, kept apart), the official acronym list with notes (`a-plus-acronyms.md`, which merges 220-1201 and 220-1202, `network-plus-acronyms.md`, and `security-plus-acronyms.md`) and the acronym pairs found in its books (`acronym-candidates.md`, `network-plus-acronym-candidates.md`, `security-plus-acronym-candidates.md`), in `sources-text/derived/`.
- `build_index.py` – `sources-text/sources-index.md`: each chapter with its exam, objectives, and domains, and the Security+ objective map (each SY0-701 objective and the SY0-801 objectives that cover it; the Security+ chapters are listed under SY0-801 domains).

## What is removed

Cover, title, copyright, dedication, about the authors, acknowledgments, tables of contents, introductions, indexes, ads and coupons, online-resource instructions, figures and figure captions, page headers and page numbers, performance-based questions (out of scope), "Beyond A+" sections (past the exam objectives), duplicate answer keys, and study-method boilerplate.

For the Network+ Guide to Networks (Cengage textbook), also: chapter outlines and learning objectives, "On the Job" stories, Applying Concepts labs, Hands-On and Capstone projects, the multi-column Key Terms and Acronyms Checklist pages (the glossary and the official acronym list cover them), the objectives appendix, and the grading rubric.

## What is kept

From the official objectives PDFs: exam details, domain weights, the troubleshooting methodology, every objective with its nested sub-topics, and the acronym list. Their about-the-exam pages and the sample hardware and software lab list are removed. The SY0-801 PDF has another layout (the bullet glyph and its text are separate lines, one or two columns, objective 4.2 printed one level deeper), so it has its own parser, `sec_obj_parse`.

From the Security+ books: Heuermann and Neil keep the chapter text (Neil: the review questions with the solutions added at the end; Heuermann: the "Do I Know This Already?" quizzes, review questions, and key terms; its quiz intro and mapping table are removed). Seidl and Gorgotsias are practice-test books: only the questions and the answers are kept (Seidl's domain topic pages give the chapter objectives). Gorgotsias's answer sections repeat each question, so the questions are read from them; this edition has no PBQs in its text.

From the books: chapter text, tables, notes and exam tips, chapter objectives, exercises, review questions with their answers (the answers are added to the end of each chapter), practice exams, the Exam Cram cram sheet, and the All-in-One glossary.

## Question formats

The books have these question formats. `extract_questions.py` has one parser for each.

| Book key | Questions | Answers |
|---|---|---|
| `exam-cram-2e` | `## Cram Quiz` in each chapter (two in a few chapters), `## Exam Questions` in the practice exams `x1`, `x2` (some stems have a code block) | `## Cram Quiz Answers` (`N. **C.** …`, `**10. E.** …`, `N. **C**. …`, `N. **D. devmgmt.msc** is …`, `**A, B, and D.**`, `**A, D, and possibly C.**`, `**A, then D.**`); `## Answer Explanations` (`**Answer: C.**`, `**Answers: B, H, I, and J.**`, then `**Incorrect answers:**`). Chapter 31 numbers two questions 4 and writes `6` without a period, so the quizzes pair by position. |
| `docter-study-guide` | `### Review Questions`, options indented, A–H | `## Answers to Review Questions` (`N. A. …`, `N. A, B.`), one line each |
| `aio-11e` | `## Chapter Review` → `### Questions` | `### Answers` (`N. **B.** …`). The chapters have no objectives (older 220-1101/1102 book). |
| `neil-practice-tests` | `## Practice Exam Questions` grouped by `### N.N` objective (older objectives); `## Mock Exam Questions` (chapter 11) or none (chapter 6). Some groups restart their numbers in the middle, so answers pair by position. In chapter 6 the options are numbered 1–4 (indented). | `## Solutions`, same groups (`The correct answer is **A**.`, `The correct answers are **B**, **C**`, `All answer choices are correct.`, `All statements are true.`) |
| `net-exam-cram` | `**Cram Quiz**` (bold, not a heading; up to five in a chapter). A marker joined to a table caption or an option (`D. **route printCram Quiz Answers**`) is split off first. CramSaver short answers are skipped. | `**Cram Quiz Answers**` (`N. **C.** …`, `**A and D.**`) |
| `net-zacker-practice-tests` | Grouped by `### N.N` objective (numbers restart in each group), plus two practice tests; options A–H; "(Choose all that apply.)" | `## Answers to Review Questions`, numbered straight through the chapter (`N. B, C, D. …`), so they pair by position |
| `sec-neil-cert-guide` | `## Chapter Review Questions` (`ReviewQuestions` in some chapters), options numbered 1–4 (indented). A question whose stem goes on after a paragraph or a table has its options as a new list; the extractor indents it. | `## Solutions` (`N. The correct answer is option C.`, `The correct answers are option B and option D.`, `Explanation: The correct …`, `The correct answer is a.`), by number |
| `sec-heuermann-cert-guide` | `## “Do I Know This Already?” Quiz` (some chapters `”Do I …`), options `a.`–`d.` | None in this edition |
| `sec-seidl-practice-tests` | `## Review Questions`, one chapter for each domain | `## Answers to Review Questions` (`N. B. …`, `N. A, C. …`), by number |
| `sec-gorgotsias-practice-tests` | `## Questions` (chapters 1–5 and exam simulators 1–6; the book's own numbers, with a few typos) | `## Answers` (`N. C. Option text. Explanation`, then indented `Option A is incorrect. …` lines, which become `incorrect`), by position |
| `net-west-guide` | `#### Self-Check` blocks (some printed as tables, with options in two columns); `## Review Questions`, `#### Question N-N` scenarios, and appendix C (no answers; its PBQs 1–3 are skipped); options `a.`–`e.`. The two-column options can be out of order or under the next question: they are sorted, and a run of labels the question before lacks is moved back (flag `options-repaired`). | `## Solutions to Self-Check Questions`, numbered straight through the chapter and pairing by position (`**Answer**: b. …` or `**Answer:** …`, then `**Explanation**:`) |

To add a book format: add a parser function to `PARSERS` in `extract_questions.py`, run it, and check its report.

## Add a book

1. Put the file in `sources/core1/`, `sources/core2/`, `sources/general/` (both cores), `sources/network/` (Network+), or `sources/sec/` (Security+).
2. Add an entry to `BOOKS` in `extract_books.py` with a function that splits it into chapters. The EPUB helpers (`epub_items`, `html_to_md`, `drop_sections`) work for most books.
3. Add the book to `BOOKS` in `build_index.py`, then run the three scripts.
4. If the book has practice questions, add a parser for its format to `extract_questions.py` (see "Question formats") and run it.
