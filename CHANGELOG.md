# Changelog

A summary of the changes and decisions in each task. Newest first.

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
