# CompTIA A+ Practice App

A local desktop app that generates practice exams and exercises for CompTIA A+ Core 1 and Core 2.
Read `docs/spec.md` for the product requirements.
Read `docs/compTIA-exam-overviews.md` for how each exam is generated.

## Commands
Not decided. Plan the build setup with the user. Then add the commands here.
```bash
# Install:
# Run in development:
# Run tests:
# Build:
# Make installers:
```

## Folder Structure
- `CHANGELOG.md` – A summary of the changes and decisions in each task.
- `docs/spec.md` – Product requirements.
- `docs/compTIA-exam-overviews.md` – Exam overviews for Core 1, Core 2, and Network+ (future): question count, time, passing score, domains, weights, question structures, and the structure mix.
- `references/exam-simulation-ui.html` – Exam simulation draft. The UI for an exam attempt must follow it.
- `references/ui-drafts/` – Static HTML drafts of the non-exam screens (home, exam intro, previous attempts, exercise setup, question, results).
- `references/comptia-ui-style/` – compTIA UI style: `README.md` (rules), `tokens.json` (colors, type, spacing, radius, shadow), `components.css`, and `components/` (Button, Card, Eyebrow, StatTile). All other screens must follow it.
- `references/exam-question-UI.png` – Original screenshot for the exam simulation draft.
- `references/UI Inspiration.png` – Original screenshot for the compTIA UI style.
- `references/links.md` – Links to the official CompTIA exam pages.
- `sources/` – Original books and guides (PDF, EPUB). Not in git. Subfolders: `core1/`, `core2/`, `general/`, `network/` (Network+ books and objectives).
- `sources-text/` – Text extracted from `sources/`, filler removed. One Markdown file for each chapter, in `sources-text/<category>/<book>/` (same categories as `sources/`). Each file starts with its source, exam, and objectives. Not in git.
- `sources-text/sources-index.md` – Links each chapter to an exam domain. Lists the books and which exam objectives (220-1201/1202, older 220-1101/1102, or N10-009) each one covers.
- `sources-text/general/objectives-220-1201/`, `objectives-220-1202/` – The official CompTIA exam objectives (every objective and sub-topic) and the official acronym list for each exam.
- `sources-text/derived/a-plus-acronyms.md` – The two official acronym lists merged, with notes where they differ. The main source for `content/acronyms/`.
- `sources-text/derived/acronym-candidates.md` – Acronym and expanded-form pairs found in the books, marked when they are on the official list. A helper, not a source of truth.
- `sources-text/network/` – Network+ (N10-009): the official objectives and acronym list (`objectives-n10-009/`) and three books. `sources-text/derived/network-plus-acronyms.md` and `network-plus-acronym-candidates.md` are the Network+ acronym files. Extracted only; no Network+ content is built yet.
- `tools/extract/` – Dev-only Python extractor for the books (see its `README.md`). Not part of the app. Its venv (`tools/extract/.venv/`) is not in git.
- `content/` – Question records, terms, and noun pools that the app uses. Subfolders: `core1/`, `core2/`, `acronyms/`, `definitions/`, `network/` (later).
<!-- Add the code folders when they exist. -->

## Tech Stack

| Layer | Tool | Reason |
|---|---|---|
| Desktop shell | Electron | It uses the same Chromium engine on Linux and Windows. The exam screens look and operate the same on the two systems. |
| Language | TypeScript | Use one language for the UI and the logic. |
| UI | React + Vite | Fast build. Familiar from full-stack work. |
| Local storage | SQLite (`better-sqlite3`) | Approved. One `.db` file in the Electron `userData` folder. |
| Spell check | `nspell` + bundled en_US Hunspell dictionary | Approved. Same result on Windows and Linux, no network. The acronym and term lists from `content/` are added to the dictionary. |
| Package manager | npm | Approved. |
| Packaging | electron-builder | Makes an `.exe` installer for Windows and an `.AppImage`/`.deb` for Linux. |
| Tests | Vitest + Playwright | Approved (see Testing). |

## Rules for Claude
- Read `docs/spec.md` before you start a feature.
- Use `docs/compTIA-exam-overviews.md` when you create question pools, design question templates, generate questions, or generate exams.
- The examples in `docs/compTIA-exam-overviews.md` show structure only. Do not use them as exam questions.
- Do not add a language model.
- Do not add network calls or user accounts.
- Do not change the tech stack without approval.
- Do not hard-code Core 1 or Core 2 details. Load each exam from its config, so new exams (for example Network+) can be added later.
- Show the Network+ Exam module in module selection, greyed out and inactive. The user cannot select it. Do not build its exams or content until the user asks. Control this with an `active` setting in its config, so the module can be activated later without code changes.
- Do not build performance-based questions (PBQs) until the user asks. Keep the question type as a field in each question, and keep the code for each question type separate, so PBQ types can be added later.
- Sections marked **Plan with the user** are not decided. Propose a plan and get approval before you write code for them.
- Update this file when a planned decision is approved.
- When a question is answered or a decision changes, update the affected docs (`CLAUDE.md`, `docs/spec.md`, and others) in the same task.
- At the end of each task, add an entry to `CHANGELOG.md`: the date, the task, and a short list of the changes and decisions.
- In Electron, keep `contextIsolation` on and `nodeIntegration` off.
- Run the tests after each change.

### Rules for the UI
- Exam attempt screens (questions, review and finalize, timers, results, review): follow the structure of `references/exam-simulation-ui.html`. Keep its layout, controls, and behavior. Rebuild it as React components. Do not copy its sample question bank.
- Review of a previous attempt: use the same results and review components as the end of an exam attempt. Do not make a second version of these screens. Load the saved attempt into them.
- All other screens (menus, module selection, the list of previous attempts, Acronym Exercise module, Definition Exercise module): follow `references/comptia-ui-style/`. Read its `README.md` first.
- Use the values in `references/comptia-ui-style/tokens.json`. Do not invent new colors, fonts, or spacing.
- Correct answers and Pass results use the `ok` and `ok-tint` tokens (green, approved addition). Incorrect and Did not pass use `brand`. Always add a text label.
- Before React code, each non-exam screen gets a static HTML draft in `references/ui-drafts/` (approved). The user reviews the drafts first. See `references/ui-drafts/README.md`.
- Desktop only. No phone or tablet layouts. Set a minimum window size (1024 × 720) in Electron instead of responsive breakpoints.
- Previous attempts are reached only from the home screen (module selection): a short list of recent attempts at the bottom, with a button that opens the full list on its own page. Do not put them in the top navigation.
- Show details (counts, times, scores, states) as vertical label–value lists, not as one line of items separated by dots. Big numbers may still use StatTile rows.
- Each page title sits in a grey `surface-muted` hero band, set apart from the top bar and the content.
- App name: "Cert Practice" (approved). Use it in the top bar and the window title.
- Bundle the Inter font with the app. Do not load Google Fonts at runtime.
- Do not use real CompTIA logos.

### Rules for source books and content
- The books are the main source for generating questions. When you create or update content (question records, fault and fact records, acronyms, definitions, noun pools), use `sources-text/`.
- The app does not read the books. All questions that the app uses come from `content/`. The books help you write `content/`.
- Use `sources-text/sources-index.md` to find the chapters for the domain you work on. Read only those chapters, not full books.
- For tasks that do not create content (UI, exam generation code, storage, tests), use `content/` and do not read `sources-text/`.
- Read the text in `sources-text/`, not the original files in `sources/`.
- If a book is not in `sources-text/`, extract it first: one Markdown file for each chapter. Then update `sources-text/sources-index.md`.
- The extractor is a dev-only Python script (PyMuPDF for PDF, ebooklib for EPUB) in a local venv (approved). It is not part of the app. It is in `tools/extract/`; its `README.md` has the commands and the list of removed filler.
- Put new books in `sources/` (`core1/`, `core2/`, `general/` for books that cover both cores, or `network/` for Network+), not in `sources-text/`. Then run the extractor.
- Keep A+ and Network+ sources apart: A+ content uses `sources-text/general/` (and `core1/`, `core2/`); Network+ content uses `sources-text/network/` only.
- Prefer the books for the current objectives (220-1201/1202). The 220-1101/1102 books are older: use them for background, and check their facts against a current book.
- Create questions from the facts in each chapter.
- When a chapter has practice questions, add each one to the question pool in `content/`. Keep the question, the answers, and the explanation. Set the `origin` field to `book`.
- Create content one domain at a time. Stop after each domain so the user can review it.
- Add a `source` field (book and chapter) to each content record.
- For the Acronym Exercise module, use the acronym list in the official CompTIA exam objectives as the main source (`sources-text/derived/a-plus-acronyms.md`). Where the Core 1 and Core 2 lists differ, check the objectives and the books for the correct expanded form (for example, XSS not XXS, and Network Address Translation for NAT).
- Use the official objectives in `sources-text/general/objectives-220-120*/` to check that each content record matches a current objective.

## Code Style
<!-- blank -->

## Architecture

### Exam generation
The exam guide gives a separate structure for EACH exam type:
- `docs/compTIA-exam-overviews.md` Part 1 – Core 1 (220-1201).
- `docs/compTIA-exam-overviews.md` Part 2 – Core 2 (220-1202).
- `docs/compTIA-exam-overviews.md` Part 3 – Network+ (N10-009). Inactive: shown greyed out in module selection. Do not build its exams until the user asks.

Each exam type has its own config file. Make each config from the part of the guide for that exam only. Do not mix values between exams. Each config has:
- The question count, the time limit, and the passing score.
- The domains and the domain weights.
- The question structures.
- The estimated mix of scenario-based and knowledge questions.

All exam modules use the same generation code. Only the config and the content are different.

Approved exam decisions:
- Question count: random in a range from the config (Core 1 and Core 2: 75–90), as in the draft UI.
- Scoring: keep the draft's method. A multiple-response question gets partial credit (selected correct / total correct) only when no wrong option is selected. Score = round(900 × points / questions). Pass when score ≥ the config's passing score.
- Results screen: add a per-domain breakdown (correct / total for each domain) under the score, in the draft's style.
- Interrupted attempt: autosave progress and remaining time. On the next launch, offer to resume or discard it.
- Leaving an exam: during an attempt, a "Return" button sits at the top next to Pause. It is a compTIA UI style pill with the `brand` to `plum` gradient and bold white text. When the user selects it or tries to close the app, a dialog asks: "Save for later" (keep answers, marks, and remaining time) or "Cancel attempt" (delete it, not graded or saved). The two choices are stacked, full-width buttons, each with a one-line description; a "Keep working" link under them (or Escape) closes the dialog. The timer stops while the dialog is open. Save and Cancel go back to the exam's page. In Electron, the main process stops the window `close` event while an attempt is active and asks the renderer to show this dialog. Autosave still covers a crash or forced exit.
- A saved attempt shows on the home screen and on that exam's page, with Resume and Discard.
- Keep the draft's pause button and its 3–15 s "Submitting your exam" delay.
- "Report Content Errors" stays disabled, as in the draft.
- The results screen has no Return button. "Start a new attempt" goes back to that exam's page (exam intro), where the user starts the next attempt.
- Each incorrect answer has a 1-sentence explanation.
- On the results screen, the filters are "All questions", "Correct only (n)", and "Incorrect only (n)", as round pills. The selected one has a thick black (`ink`) outline and a fill: light blue for All, light green for Correct, light red for Incorrect. Partially correct questions count as incorrect.
- Every button on the exam screens has a hover color that is a darker shade of its own color: grey turns darker grey (`#dfe1e6`, border `#a3a6ad`), teal turns darker teal (`#0a5f7d`), light blue, green, and red fills turn a little darker, and borderless bar buttons get a light grey fill. Disabled buttons do not change.
- When the user opens a question from the results, a large result banner at the top shows Correct, Partially correct, Incorrect, or Not answered, with an icon and one line of text.

For each attempt, the app uses the config of the selected exam to:
- Set the question count and the timer.
- Calculate the number of questions for each domain from the weights.
- Select questions to match the structure mix.
- Grade the attempt against the passing score.

### Exercise generation (Acronym Exercise and Definition Exercise modules)
These are two separate modules. Each module practices one thing only. They can share the same exercise code with different content and configs:
- Acronym Exercise:
  - Multiple choice: either direction (acronym → expanded form, or expanded form → acronym).
  - Type the answer: acronym → expanded form ONLY.
- Definition Exercise:
  - Multiple choice: either direction (term → definition, or definition → term).
  - Type the answer: definition → term ONLY. Never ask the user to type a definition sentence.

Rules:
- Each module uses its own config file: question count (about 20), time limit (30 minutes), and the mix of multiple-choice and type-the-answer questions. Do not hard-code these values.
- Keep acronyms and definitions in separate content: `content/acronyms/` and `content/definitions/`. Do not mix them in one exercise.
- Each acronym and definition record has a certification field (for example `["a-plus"]`, later `["network-plus"]`). The app selects only the records for the certification that the user selected.
- Multiple-choice distractors come from the same module's content for the same certification: other acronyms for the Acronym Exercise, other terms or definitions for the Definition Exercise.
- Feedback after each answer (approved): the user selects or types an answer, selects "Check answer", sees Correct or Incorrect with the correct answer, then goes to the next question.
- Before the app compares a typed answer, it ignores letter case, extra spaces, and punctuation.
- Spelling errors in a typed answer show a red squiggle underline.
- Grading: a typed answer with a spelling error is incorrect. Do not accept close matches.
- Spelling check method (approved): `nspell` with a bundled en_US Hunspell dictionary. Add all acronyms and terms from `content/` to the dictionary. Do not use Electron's built-in spellchecker (it downloads dictionaries on Linux and uses the OS checker on Windows). The app draws the red squiggle itself.

### Question generation (cognitive model)
The app builds scenario-based questions from a cognitive model.
Knowledge questions (definition and recall, select the correct item) need a different record type. See Record formats.

1. Keep fault records in JSON files. Each record has the cause, the symptoms, the correct action, the explanations, and the related faults.
2. Keep a set of question types, for example "most likely cause," "first step," and "next step."
3. For each question, the app selects one fault, two or three symptoms (random order), a setting, and a question type.
4. The app takes the distractors from the actions of related faults.
5. A sentence grammar (Tracery method) joins the parts. Each part has many phrasings, so the sentence structure changes.
6. Noun pools fill the placeholders (names, devices, offices).
7. A random generator with a seed controls all selections.
8. Save the full question text and answers with each attempt. This lets the user review the exact question after grading.

### Record formats – Plan with the user
This fault record is a draft. Change it as development continues.

```json
{
  "fault": "Failed printer driver",
  "domain": "Core 1 – Hardware and network troubleshooting",
  "symptoms": ["prints garbled text", "jobs stay in the queue", "printer shows ready"],
  "correctAction": "Reinstall the printer driver",
  "explanation": "",
  "relatedFaults": ["Print spooler stopped", "Wrong default printer"],
  "whyWrong": {
    "Restart the print spooler": "",
    "Set the correct default printer": ""
  }
}
```

Many exam topics are facts, not faults (for example ports and RAM types). Plan a record type for these questions with the user. Use the question structures in `docs/compTIA-exam-overviews.md` to decide which record types are necessary.

### Data storage and database
SQLite with `better-sqlite3` (approved). Schema – Plan with the user. The storage must:
- Keep exam attempts persistently (see `docs/spec.md`).
- Keep the full question text and answers for each attempt.
- Not keep Acronym Exercise or Definition Exercise results.

## Testing
- Vitest: the engine (config loading, seeded generation, domain allocation, grading, typed-answer normalization, spell check) and React components.
- Playwright: a few end-to-end flows that drive the Electron app.
