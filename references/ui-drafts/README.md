# UI drafts (non-exam screens)

Static HTML drafts of the screens that follow `../comptia-ui-style/`. Review them before the React screens are built.
Exam attempt screens are not here; they follow `../exam-simulation-ui.html`.

| File | Screen |
|---|---|
| `home.html` | Home and module selection: resume banner for an interrupted attempt, exam modules (Network+ greyed out), exercise modules, progress stats. |
| `exam-intro.html` | Exam intro before an attempt: count, time, passing score, rules, domain weights. Values come from the exam config. |
| `attempts.html` | List of previous attempts, filter by exam, "Review attempt" opens the shared results and review screens. |
| `exercise-setup.html` | Exercise setup: select the certification (Network+ inactive), what to expect. Values come from the exercise config. |
| `exercise-question.html` | Exercise question: multiple choice (both directions) and type the answer with the red spelling squiggle; feedback after each answer. |
| `exercise-results.html` | Exercise results: summary and answer list. Not saved. |

`drafts.css` holds the tokens from `../comptia-ui-style/tokens.json` and the shared components.

Notes:
- Desktop only. The pages assume a window at least 1024px wide; there is no phone layout.
- The drafts load Inter from Google Fonts for review. The app must bundle the font (no network calls).
- The tokens have no green. Correct and Pass use `plum`; incorrect and Did not pass use `brand`. Each always has a text label.
- "Cert Practice" is a placeholder app name. No CompTIA logos.

To view them: run the `ui-drafts` preview in `.claude/launch.json` (serves `references/` on port 8765), then open `/ui-drafts/home.html`.
