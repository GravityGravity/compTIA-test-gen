# UI drafts (non-exam screens)

Static HTML drafts of the screens that follow `../comptia-ui-style/`. Review them before the React screens are built.
Exam attempt screens are not here; they follow `../exam-simulation-ui.html`.

| File | Screen |
|---|---|
| `home.html` | Home and module selection: hero band, resume card for an interrupted attempt, exam modules (Core 1, Core 2, Network+; a module whose config is not active is greyed out), exercise modules, and at the bottom the previous attempts (stats, 3 most recent, "View all"). |
| `exam-intro.html` | Exam intro before an attempt: count, time, passing score, rules, domain weights. Values come from the exam config. Open with `#saved` to see the card for a saved attempt (Resume, Discard). |
| `attempts.html` | Full list of previous attempts, opened only from the home screen. Filter by exam; "Review attempt" opens the shared results and review screens. |
| `exercise-setup.html` | Exercise setup: select the certification (A+ or Network+; an inactive one is greyed out), then, for a certification with more than one exam, the exam (Core 1, Core 2, or Both), and what to expect. Values come from the certification and exercise configs. |
| `exercise-question.html` | Acronym Exercise question: type the expanded form (the only question type), with the red spelling squiggle and a "Not sure" button; the feedback box shows the meaning sentence and a tag for each exam objective. The 12-minute timer comes from the config; open with `#timeup` to see the time-up behavior (the results open at 0). |
| `exercise-results.html` | Exercise results: summary and answer list, with "Not sure" and "Not answered" rows. Not saved. "Try again" starts the same exercise again at once. Open with `#timeup` to see the time-up notice. |

`drafts.css` holds the tokens from `../comptia-ui-style/tokens.json` and the shared components.

Notes:
- Desktop only. The pages assume a window at least 1024px wide; there is no phone layout.
- The drafts load Inter from Google Fonts for review. The app must bundle the font (no network calls).
- Details use vertical label–value lists (`.facts` in `drafts.css`), not dot-separated lines.
- The top bar has only the app name and a Home link. Previous attempts are reached from the home screen only.
- Correct and Pass use `ok` (green); incorrect and Did not pass use `brand`. Each always has a text label.
- The app name is "Cert Practice". No CompTIA logos.

To view them: run the `ui-drafts` preview in `.claude/launch.json` (serves `references/` on port 8765), then open `/ui-drafts/home.html`.
