# Changelog

A summary of the changes and decisions in each task. Newest first.

## 2026-10-27 – Network+ sources

Decisions:
- Network+ sources are extracted now. No Network+ content, configs, or exams are built yet; the module stays inactive.
- Network+ sources stay apart from A+: `sources/network/` → `sources-text/network/`, with their own acronym files (`derived/network-plus-acronyms.md`, `network-plus-acronym-candidates.md`).
- The Cengage textbook's classroom material (labs, projects, rubric, chapter outlines, "On the Job" stories) is filler and is removed. Its Key Terms and Acronyms Checklist pages are removed too: they extract badly, and the glossary and official acronym list cover them.

Changes:
- `tools/extract/extract_books.py`: added `objectives-n10-009`, `net-exam-cram` (Dulaney), `net-zacker-practice-tests` (Zacker), and `net-west-guide` (West, PDF). The objectives parser no longer depends on fonts, reads two-column acronym lists, keeps wrapped titles, and rebuilds the 1.4 Protocols/Ports table. The A+ objectives output is unchanged.
- Extracted: N10-009 objectives (25 objectives, 162 acronyms), Exam Cram (10 chapters, cram sheet, glossary, ~180 quiz questions), Zacker (5 domain chapters and 2 practice tests, ~1,200 questions with answers), and West (12 chapters, subnetting and practice-exam appendices, glossary; Self-Check answers kept, review questions have no answers in the book).
- `tools/extract/derive_terms.py`: one official list and one candidate list for each certification. Made the order of differing forms stable.
- `tools/extract/build_index.py`: Network+ books and domains in `sources-text/sources-index.md`.
- `CLAUDE.md`, `tools/extract/README.md`: recorded the Network+ folders and the rule to keep A+ and Network+ sources apart.

Found in the official N10-009 list: "TACAS+" (typo for TACACS+); "IPSec" (the books write IPsec). The objectives PDF has no passing score; `docs/compTIA-exam-overviews.md` keeps 720.

## 2026-10-27 – Official exam objectives

Decisions:
- The official CompTIA objectives are the main source for acronyms and the check that content matches a current objective.
- The two official acronym lists are merged into one A+ list. Where they differ, both forms are kept with a note, not silently corrected.

Changes:
- Moved `comptia-a-plus-220-1201-exam-objectives.pdf` and `comptia-a-plus-220-1202-exam-objectives.pdf` from `sources-text/` to `sources/general/`.
- `tools/extract/extract_books.py`: parses the objectives PDFs into `sources-text/general/objectives-220-1201/` and `objectives-220-1202/`: exam details, domain weights, troubleshooting methodology, all objectives (27 for Core 1, 36 for Core 2) with nested sub-topics, and the acronym list (200 for each exam).
- `tools/extract/derive_terms.py`: writes `sources-text/derived/a-plus-acronyms.md` (201 acronyms) and marks the book candidates that are on the official list.
- `tools/extract/build_index.py`: adds the objectives to `sources-text/sources-index.md`.
- `CLAUDE.md` and `tools/extract/README.md`: recorded the new files and the rules above.

Found in the official lists (to resolve when writing `content/acronyms/`):
- Core 1 has XXS (typo) where Core 2 has XSS (Cross-site Scripting).
- NAT: Core 1 says Network Access Translation; Core 2 says Network Address Translation.
- SPICE: Core 1 says Software Process Improvement and Capability Determination; Core 2 (and objective 4.9) says Simple Protocol for Independent Computing Environments.
- IAM, MNDA, NDA, and OTP differ only in wording or capitals.

## 2026-10-27 – Book extraction

Decisions:
- The original books go in `sources/` (`core1/`, `core2/`, `general/`), not in `sources-text/`. The four books cover both cores, so they are in `sources/general/`.
- `sources-text/` mirrors the categories: `sources-text/<category>/<book>/`, one Markdown file for each chapter.
- Filler is removed: front and back matter, ads and coupons, indexes, figures and captions, page headers, performance-based questions (out of scope), "Beyond A+" sections, duplicate answer keys, and study-method boilerplate.
- Review-question answers are added to the end of each chapter, so each file has its questions and answers together.
- Two books (All-in-One 11th ed., Neil Practice Tests) cover the older 220-1101/1102 objectives. They are marked in each file and in the index. Use the 220-1201/1202 books first.

Changes:
- Moved the four books from `sources-text/` to `sources/general/`.
- Added `tools/extract/` (dev only): `extract_books.py`, `derive_terms.py`, `build_index.py`, `requirements.txt`, `README.md`.
- Extracted the four books to `sources-text/general/` (not in git).
- Added `sources-text/sources-index.md` (chapters by book and by domain) and `sources-text/derived/acronym-candidates.md` (not in git).
- `.gitignore`: ignore `.venv/` and `__pycache__/`.
- `CLAUDE.md`: recorded the folder layout, the extractor, and the rule to prefer the current-objective books.

## 2026-10-27 – UI draft review

Decisions:
- Exercises show feedback after each answer (as drafted).
- App name: "Cert Practice".
- Added a green `ok` token (`#1d7a3a`) and `ok-tint` (`#e3f3e8`) for correct answers and Pass results. They are the same greens as the exam simulation draft.

Changes:
- `CLAUDE.md`, `docs/spec.md`, `references/ui-drafts/README.md`: recorded the decisions above.
- `references/comptia-ui-style/tokens.json` and `README.md`: added `ok` and `ok-tint`.
- UI drafts: correct answers, correct feedback, and Pass tags use `ok` instead of `plum`.

Review feedback applied:
- Home hero is easier to read: the page title is in a grey hero band with more space around it. The top bar has a larger app name and more space.
- Previous attempts are only on the home screen: stats, the 3 most recent attempts, and "View all 12 attempts", which opens `attempts.html`. Removed "Previous attempts" from the top bar on all pages.
- Detail text is vertical: module cards, the resume card, exam intro, and exercise setup use label–value lists (`.facts`) instead of tags, dot-separated lines, or 3-column stat rows. Dot-separated labels on the exercise screens are split into separate lines.
- All pages use the hero band for their title.
- `CLAUDE.md` and `references/ui-drafts/README.md`: recorded these rules.
- `references/exam-simulation-ui.html`: added a "Return" button at the bottom of the results screen, next to "Start a new attempt". It is a compTIA UI style primary pill (`brand`) and opens the exam's page (`ui-drafts/exam-intro.html`). A reviewed saved attempt returns to where it was opened. `CLAUDE.md` and `docs/spec.md` record the rule.
- `references/exam-simulation-ui.html`: the Return button is now on the right side of the card, the same height as "Start a new attempt", with bold white text on the `brand` to `plum` gradient.
- `references/exam-simulation-ui.html`: every button has a hover color that is a darker shade of its own color. Grey buttons (answer keys, Pause, filters, review grid cells, dialog choices) turn darker grey with a darker grey border. Teal buttons (Confirm, Start a new attempt, Submit) turn darker teal. A selected answer key or grid cell turns a darker light blue; a selected filter turns a darker shade of its blue, green, or red fill. Bar buttons (previous/next, Revisit Later, Review & Finalize, eliminate ✕, Keep working) get a light grey fill. New variables: `--btn-hover` (changed to `#dfe1e6`), `--btn-hover-border`, `--accent-hover`.
- `references/exam-simulation-ui.html`: added a "Correct only (n)" filter on the results screen, between "All questions" and "Incorrect only". The selected filter keeps its thick black outline and now also has a fill: light blue (All), light green (Correct), light red (Incorrect).
- `references/exam-simulation-ui.html`: removed the Return button from the results screen. "Start a new attempt" now goes to the exam intro page instead of starting a new attempt in place. (This replaces the results Return entries below.)
- `references/exam-simulation-ui.html`: simpler "Leave this exam?" dialog: one short line, then "Save for later" and "Cancel attempt" as stacked full-width buttons with a one-line description each, and a "Keep working" link under them. Before, it had a bullet list and three buttons that wrapped onto two rows.
- `references/exam-simulation-ui.html`: added a "Return" button at the top of the exam, next to Pause. It opens a "Leave this exam?" dialog with "Save for later", "Cancel attempt", and "Keep working". The timer stops while the dialog is open. Save goes to the exam page with the saved-attempt card; Cancel goes to the exam page. The same dialog will open when the user tries to close the app (Electron `close` event).
- `references/ui-drafts/exam-intro.html`: added a "Saved for later" card with Resume and Discard (draft: shown with `#saved`).
- `references/exam-simulation-ui.html`: the "All questions" and "Incorrect only" filters are round pills; the selected one has a thick black outline and no fill.
- Fixed: the result banner was also added to the live question screen by mistake, which left it blank. It is now only on a question opened from the results.
- `references/ui-drafts/drafts.css`: `[hidden]` now always hides an element.
- `references/exam-simulation-ui.html`: a question opened from the results now has a large result banner at the top (Correct, Partially correct, Incorrect, or Not answered) with a 32px icon, a 22px label, and one line of text. Before, only small text in the question number line showed the result.

## 2026-10-27 – UI drafts for the non-exam screens

Decisions:
- Desktop only: no phone or tablet layout. Minimum window size 1024 × 720.
- Bundle the Inter font in the app (the drafts load it from Google Fonts for review only).

Changes:
- Added `references/ui-drafts/`: `home.html`, `exam-intro.html`, `attempts.html`, `exercise-setup.html`, `exercise-question.html`, `exercise-results.html`, the shared `drafts.css`, and a `README.md`.
- The exercise question draft has a working demo of the spelling squiggle and of answer normalization.
- Added `.claude/launch.json` with a `ui-drafts` preview server (port 8765).
- `CLAUDE.md` and `docs/spec.md`: recorded the decisions above and the new folder.

Open questions for review:
- Exercises show feedback after each answer. Should they show it only at the end instead?
- The tokens have no green, so correct and pass use plum and incorrect uses brand. Is that OK, or should a green token be added?
- "Cert Practice" is a placeholder app name.

## 2026-10-27 – Planning: open decisions

Decisions approved:
- Storage: SQLite with `better-sqlite3`, one `.db` file in `userData`.
- Spell check: `nspell` + bundled en_US Hunspell dictionary, with acronyms and terms from `content/` added. Not Electron's built-in spellchecker.
- Tests: Vitest (engine and components) + Playwright (Electron end-to-end flows).
- Package manager: npm.
- Exam question count: random 75–90, from each exam config.
- Scoring: the draft UI's method (partial credit on multiple response when no wrong option is selected; score = 900 × points / questions).
- Results screen: add a per-domain breakdown.
- Interrupted attempt: autosave, then resume or discard on the next launch.
- Keep the draft's pause button and 3–15 s submit delay. "Report Content Errors" stays disabled.
- Each incorrect answer has a 1-sentence explanation.
- Work order: static HTML drafts of the non-exam screens first, then the book extractor (after the books are added), then skeleton + exam engine.
- UI drafts: static HTML files in `references/ui-drafts/`, reviewed before React code.
- Book extractor: dev-only Python script (PyMuPDF, ebooklib) in a local venv.

Changes:
- `CLAUDE.md`: recorded the decisions above; added rules to update docs and this changelog in each task.
- `docs/spec.md`: set the incorrect-answer explanation length.
- Added folders `sources/{core1,core2,general,network}`, `sources-text/` (not in git), and `content/{core1,core2,acronyms,definitions,network}`.
- Added `CHANGELOG.md`.
