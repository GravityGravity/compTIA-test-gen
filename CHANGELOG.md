# Changelog

A summary of the changes and decisions in each task. Newest first.

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
