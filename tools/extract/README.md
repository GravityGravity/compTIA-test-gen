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

- `extract_books.py [book-key ...]` – one Markdown file for each chapter in `sources-text/<category>/<book-key>/`, plus a `_chapters.tsv` (file, exam, objectives, title). With no keys it extracts all books in `BOOKS`.
- `derive_terms.py` – for each certification (A+ and Network+, kept apart), the official acronym list with notes (`a-plus-acronyms.md`, which merges 220-1201 and 220-1202, and `network-plus-acronyms.md`) and the acronym pairs found in its books (`acronym-candidates.md`, `network-plus-acronym-candidates.md`), in `sources-text/derived/`.
- `build_index.py` – `sources-text/sources-index.md`: each chapter with its exam, objectives, and domains.

## What is removed

Cover, title, copyright, dedication, about the authors, acknowledgments, tables of contents, introductions, indexes, ads and coupons, online-resource instructions, figures and figure captions, page headers and page numbers, performance-based questions (out of scope), "Beyond A+" sections (past the exam objectives), duplicate answer keys, and study-method boilerplate.

For the Network+ Guide to Networks (Cengage textbook), also: chapter outlines and learning objectives, "On the Job" stories, Applying Concepts labs, Hands-On and Capstone projects, the multi-column Key Terms and Acronyms Checklist pages (the glossary and the official acronym list cover them), the objectives appendix, and the grading rubric.

## What is kept

From the official objectives PDFs: exam details, domain weights, the troubleshooting methodology, every objective with its nested sub-topics, and the acronym list. Their about-the-exam pages and the sample hardware and software lab list are removed.

From the books: chapter text, tables, notes and exam tips, chapter objectives, exercises, review questions with their answers (the answers are added to the end of each chapter), practice exams, the Exam Cram cram sheet, and the All-in-One glossary.

## Add a book

1. Put the file in `sources/core1/`, `sources/core2/`, `sources/general/` (both cores), or `sources/network/` (Network+).
2. Add an entry to `BOOKS` in `extract_books.py` with a function that splits it into chapters. The EPUB helpers (`epub_items`, `html_to_md`, `drop_sections`) work for most books.
3. Add the book to `BOOKS` in `build_index.py`, then run the three scripts.
