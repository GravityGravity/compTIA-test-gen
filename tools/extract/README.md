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
```

- `seed_acronyms.py {a-plus,network-plus}` – one draft record for each official acronym in `content/acronyms/<cert>.json`, mapped to the objectives that name it. It does not overwrite an existing file: after seeding, the file is edited by hand (see `content/README.md`).
- `check_content.py` – checks every record in `content/acronyms/` and `content/definitions/`: fields, unique ids and answers, objective ids, definitions that give away the term, typed answers that are acronyms, and small groups. Prints the counts for each certification. Exit code 1 when there are errors.
- `extract_questions.py [book-key ...]` – parses the practice questions of each book (stem, options, answers, explanation) into `sources-text/derived/questions/<book-key>.json`, with the exam and objectives of each chapter from its `_chapters.tsv`. It reports questions without answers and answers without questions. Each book format has its own parser (see "Question formats").
- `check_questions.py` – checks every record in `content/<module>/pool/` and `content/<module>/scenarios/`, and the grammar files: fields, unique ids, objectives and topics, answers, `whyWrong` for each wrong option, explanation length, near-duplicate stems, `related` records, and unknown grammar rules. Prints the coverage report: pool questions for each topic, objective, and domain, the pool total, and scenario records for each scenario objective. For an active exam, a topic with no questions, fewer than 800 pool questions, or a scenario objective with fewer than 6 records is an error, and a topic with only 1 question is a warning. `--topics <code>` prints the numbered topics of an exam. Exit code 1 when there are errors.
- `check_config.py` – checks the configs in `config/certifications/`, `config/exams/` (including that each objective is listed once with the right kind, and that the kinds give `scenarioShare`), and `config/exercises/`: fields, known certifications and exams, question-type counts that add up to `questionCount`, typed questions in one direction only, and that every certification and exam choice has enough records (and enough typeable records). Prints the pool sizes. Exit code 1 when there are errors.

- `extract_books.py [book-key ...]` – one Markdown file for each chapter in `sources-text/<category>/<book-key>/`, plus a `_chapters.tsv` (file, exam, objectives, title). With no keys it extracts all books in `BOOKS`.
- `derive_terms.py` – for each certification (A+ and Network+, kept apart), the official acronym list with notes (`a-plus-acronyms.md`, which merges 220-1201 and 220-1202, and `network-plus-acronyms.md`) and the acronym pairs found in its books (`acronym-candidates.md`, `network-plus-acronym-candidates.md`), in `sources-text/derived/`.
- `build_index.py` – `sources-text/sources-index.md`: each chapter with its exam, objectives, and domains.

## What is removed

Cover, title, copyright, dedication, about the authors, acknowledgments, tables of contents, introductions, indexes, ads and coupons, online-resource instructions, figures and figure captions, page headers and page numbers, performance-based questions (out of scope), "Beyond A+" sections (past the exam objectives), duplicate answer keys, and study-method boilerplate.

For the Network+ Guide to Networks (Cengage textbook), also: chapter outlines and learning objectives, "On the Job" stories, Applying Concepts labs, Hands-On and Capstone projects, the multi-column Key Terms and Acronyms Checklist pages (the glossary and the official acronym list cover them), the objectives appendix, and the grading rubric.

## What is kept

From the official objectives PDFs: exam details, domain weights, the troubleshooting methodology, every objective with its nested sub-topics, and the acronym list. Their about-the-exam pages and the sample hardware and software lab list are removed.

From the books: chapter text, tables, notes and exam tips, chapter objectives, exercises, review questions with their answers (the answers are added to the end of each chapter), practice exams, the Exam Cram cram sheet, and the All-in-One glossary.

## Question formats

The books have these question formats. `extract_questions.py` has one parser for each.

| Book key | Questions | Answers |
|---|---|---|
| `exam-cram-2e` | `## Cram Quiz` in each chapter (stems `N.` or `**N.**`), `## Exam Questions` in the practice exams `x1`, `x2` | `## Cram Quiz Answers` (`N. **C.** …`, `**A, B, and D.**`); `## Answer Explanations` (`**Answer: C.**`, `**Answers: C and D.**`, plus `**Incorrect answers:**`) |
| `docter-study-guide` | `### Review Questions`, options indented, A–H | `## Answers to Review Questions` (`N. A. …`, `N. A, B.`) |
| `aio-11e` | `## Chapter Review` → `### Questions` | `### Answers` (`N. **B.** …`) |
| `neil-practice-tests` | `## Practice Exam Questions`, grouped by `### N.N` objective | `## Solutions` (`The correct answer is **A**.`, `The correct answers are **B**, **C**`). In chapter 6 the options are numbered 1–4: map them to A–D. |
| `net-exam-cram` | `**Cram Quiz**` (bold, not a heading; in chapter 2 it is joined to a table caption). CramSaver short answers are skipped. | `**Cram Quiz Answers**` (`N. **C.** …`) |
| `net-zacker-practice-tests` | Grouped by `### N.N` objective, plus two practice tests; options A–H; "(Choose all that apply.)" | `## Answers to Review Questions` (`N. B, C, D. …`) |
| `net-west-guide` | `#### Self-Check`; `## Review Questions`, `#### Question N-N` scenarios, and appendix C (no answers); options `a.`–`e.` | `## Solutions to Self-Check Questions` (`**Answer**: b. …` or `**Answer:** …`, then `**Explanation**:`) |

To add a book format: add a parser function to `PARSERS` in `extract_questions.py`, run it, and check its report.

## Add a book

1. Put the file in `sources/core1/`, `sources/core2/`, `sources/general/` (both cores), or `sources/network/` (Network+).
2. Add an entry to `BOOKS` in `extract_books.py` with a function that splits it into chapters. The EPUB helpers (`epub_items`, `html_to_md`, `drop_sections`) work for most books.
3. Add the book to `BOOKS` in `build_index.py`, then run the three scripts.
4. If the book has practice questions, add a parser for its format to `extract_questions.py` (see "Question formats") and run it.
