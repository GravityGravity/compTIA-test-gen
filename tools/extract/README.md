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
- `derive_terms.py` – `sources-text/derived/acronym-candidates.md`: "Expanded Form (ACR)" pairs found in the chapters.
- `build_index.py` – `sources-text/sources-index.md`: each chapter with its exam, objectives, and domains.

## What is removed

Cover, title, copyright, dedication, about the authors, acknowledgments, tables of contents, introductions, indexes, ads and coupons, online-resource instructions, figures and figure captions, page headers and page numbers, performance-based questions (out of scope), "Beyond A+" sections (past the exam objectives), duplicate answer keys, and study-method boilerplate.

## What is kept

Chapter text, tables, notes and exam tips, chapter objectives, exercises, review questions with their answers (the answers are added to the end of each chapter), practice exams, the Exam Cram cram sheet, and the All-in-One glossary.

## Add a book

1. Put the file in `sources/core1/`, `sources/core2/`, or `sources/general/` (both cores).
2. Add an entry to `BOOKS` in `extract_books.py` with a function that splits it into chapters. The EPUB helpers (`epub_items`, `html_to_md`, `drop_sections`) work for most books.
3. Add the book to `BOOKS` in `build_index.py`, then run the three scripts.
