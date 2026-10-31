# CompTIA A+ Practice App

A local desktop app that generates practice exams and exercises for CompTIA A+ Core 1 and Core 2, Network+ (N10-009), and Security+ (SY0-801).
Read `docs/spec.md` for the product requirements.
Read `docs/compTIA-exam-overviews.md` for how each exam is generated.

## Commands
Approved 2026-10-30. Node 24 and npm 11.
```bash
npm install            # Install. npm 11 runs only the install scripts in "allowScripts" (better-sqlite3, electron-winstaller).
npm run dev            # Run in development (electron-vite, hot reload).
npm test               # Vitest: engine, main-process loaders, design tokens, React components.
npm run test:e2e       # Build, then Playwright drives the Electron app (tests/e2e/).
npm run typecheck      # tsc for the Node side (main, preload, engine, tests) and the web side (renderer).
npm run lint           # ESLint. `npm run format` runs Prettier.
npm run build          # Production build into out/.
npm run dist:linux     # .AppImage and .deb in release/.
npm run dist:win       # .exe (NSIS) in release/. On Linux this needs Wine; or run it on Windows.
```
- After each change: `npm test`, `npm run typecheck`, `npm run lint`, and `npm run test:e2e` when an app flow changes. UI-only changes (layout, styling, screen markup) do not run `npm test` or `npm run test:e2e` (approved 2026-10-30).
- Ubuntu 24.04 and later block the user namespaces that Electron's sandbox needs, so `npm run dev` aborts with "The SUID sandbox helper binary was found, but is not configured correctly". Fix it once with an AppArmor profile for `node_modules/electron/dist/electron` (see README.md). Do not run Electron with `--no-sandbox`.
- `better-sqlite3` 13 ships N-API prebuilt binaries: the same file loads in Node (Vitest) and in Electron. No rebuild step.

## Folder Structure
- `CHANGELOG.md` – A summary of the changes and decisions in each task.
- `docs/spec.md` – Product requirements.
- `docs/compTIA-exam-overviews.md` – Exam overviews for Core 1, Core 2, Network+, and Security+: question count, time, passing score, domains, weights, question structures, and the structure mix.
- `docs/exam-modules.md` – How to build an exam module (config, question pool, scenario records, grammar, tools, workflow, checklist). Follow it for every exam, including exams added later.
- `references/exam-simulation-ui.html` – Exam simulation draft. The UI for an exam attempt must follow it.
- `references/ui-drafts/` – Static HTML drafts of the non-exam screens (home, exam intro, previous attempts, exercise setup, question, results).
- `references/comptia-ui-style/` – compTIA UI style: `README.md` (rules), `tokens.json` (colors, type, spacing, radius, shadow), `components.css`, and `components/` (Button, Card, Eyebrow, StatTile). All other screens must follow it.
- `references/exam-question-UI.png` – Original screenshot for the exam simulation draft.
- `references/UI Inspiration.png` – Original screenshot for the compTIA UI style.
- `references/links.md` – Links to the official CompTIA exam pages.
- `sources/` – Original books and guides (PDF, EPUB). Not in git. Subfolders: `core1/`, `core2/`, `general/`, `network/` (Network+ books and objectives), `sec/` (Security+ books and objectives).
- `sources-text/` – Text extracted from `sources/`, filler removed. One Markdown file for each chapter, in `sources-text/<category>/<book>/` (same categories as `sources/`). Each file starts with its source, exam, and objectives. Not in git.
- `sources-text/sources-index.md` – Links each chapter to an exam domain. Lists the books and which exam objectives (220-1201/1202, older 220-1101/1102, or N10-009) each one covers.
- `sources-text/general/objectives-220-1201/`, `objectives-220-1202/` – The official CompTIA exam objectives (every objective and sub-topic) and the official acronym list for each exam.
- `sources-text/derived/a-plus-acronyms.md` – The two official acronym lists merged, with notes where they differ. The main source for `content/acronyms/`.
- `sources-text/derived/acronym-candidates.md` – Acronym and expanded-form pairs found in the books, marked when they are on the official list. A helper, not a source of truth.
- `sources-text/network/` – Network+ (N10-009): the official objectives and acronym list (`objectives-n10-009/`) and three books. `sources-text/derived/network-plus-acronyms.md` and `network-plus-acronym-candidates.md` are the Network+ acronym files.
- `sources-text/sec/` – Security+ (SY0-801): the official objectives and acronym list (`objectives-sy0-801/`) and four books (all for the previous exam, SY0-701): `sec-heuermann-cert-guide/`, `sec-neil-cert-guide/`, `sec-seidl-practice-tests/`, `sec-gorgotsias-practice-tests/`. `sources-text/derived/security-plus-acronyms.md` and `security-plus-acronym-candidates.md` are the Security+ acronym files. `sources-index.md` has a SY0-701 → SY0-801 objective map for tagging the book questions.
- `tools/extract/` – Dev-only Python tools (see its `README.md`): the book extractor, `seed_acronyms.py` (seeds acronym records from the official lists), `check_content.py` (validates the acronym and definition records), `check_config.py` (validates the configs in `config/`), `extract_questions.py` (parses the book questions into `sources-text/derived/questions/`), and `check_questions.py` (validates the exam pool and scenario records and prints the coverage report). Not part of the app. Its venv (`tools/extract/.venv/`) is not in git.
- `config/` – Configs the app loads: `certifications/` (one per certification: name, short name, `active`, exam codes), `exams/` (one per exam: name, short name, `active`, question count, time, passing score, scenario share, domains with weights and objectives), and `exercises/` (one per exercise module). See `content/README.md` for the fields.
- `content/` – Records that the app uses. `acronyms/`, `definitions/`, one folder per exam module (`core1/`, `core2/`, `network/`, and `security/` when it is built, each with `pool/d<N>.json`, `scenarios/d<N>.json`, and `grammar.json`), and `shared/grammar.json` (grammar rules and noun pools for all exams). See `content/README.md` for the record formats.
- `sources-text/derived/questions/` – The book questions parsed by `extract_questions.py`, one file per book. The input for the question pool. Not in git.
- `src/main/` – Electron main process: the window, IPC handlers, file loading (`catalog.ts` reads `config/`, `content.ts` reads `content/`), and the SQLite database (`db.ts`).
- `src/preload/` – The `contextBridge` API (`window.certPractice`). The only bridge between the UI and Node.
- `src/renderer/` – React UI: `screens/`, `components/`, `exam/` (the exam attempt components, rebuilt from the exam simulation draft), `styles/` (`tokens.css` from the compTIA UI style tokens, `app.css` from the drafts).
- `src/engine/` – Pure TypeScript with no Electron or React imports: config validation, the seeded random generator, normalization, spell check, `exercise/` (exercise generation and grading), and `exam/` (exam allocation, selection, the scenario generators and grammar in `exam/scenario/`, the question types in `exam/questionTypes/`, and grading).
- `src/shared/` – Types and IPC contracts that main, preload, and renderer share.
- `tests/unit/` – Vitest tests that are not next to one source file (for example the design-token check and attempt generation). `tests/e2e/` – Playwright tests.
- `tests/fixtures/app-data/` – A small `config/` and `content/` (an active Core 1 Exam with 12–14 questions, every scenario kind) for the exam tests. In development, the app reads it when `CERT_PRACTICE_DATA` points to it, and `CERT_PRACTICE_USER_DATA` sets the userData folder (the Playwright exam test uses both). Keep its `content/shared/grammar.json` a copy of the real one.
- `electron.vite.config.ts`, `electron-builder.yml`, `vitest.config.ts`, `playwright.config.ts` – build, packaging, and test configs. In an installed build, `config/` and `content/` are copied next to the app as resources.

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
- Do not hard-code Core 1 or Core 2 details. Load each exam from its config, so new exams (for example Network+ and Security+) can be added later.
- Network+ is in scope (approved 2026-10-30): build its exam, acronym, and definition content. Each module and certification has an `active` setting in its config. Set it to true when its config and content exist; until then the module shows greyed out in module selection and the user cannot select it. No code changes are needed to activate a module.
- Security+ (SY0-801) is in scope (added 2026-10-30): build its exam, acronym, and definition content the same way. Certification id `security-plus`, exam config `config/exams/SY0-801.json`, module folder `content/security/`. The exam is active since 2026-10-30 (all five domains have content). Its acronym records are in `content/acronyms/security-plus.json` (2026-10-30) and the Acronym Exercise lists `security-plus`. Its definitions (all five domains) are in `content/definitions/security-plus/` (2026-10-30) and the Definition Exercise lists `security-plus`.
- Do not build performance-based questions (PBQs) until the user asks. Keep the question type as a field in each question, and keep the code for each question type separate, so PBQ types can be added later.
- Sections marked **Plan with the user** are not decided. Propose a plan and get approval before you write code for them.
- Update this file when a planned decision is approved.
- When a question is answered or a decision changes, update the affected docs (`CLAUDE.md`, `docs/spec.md`, and others) in the same task.
- At the end of each task, add an entry to `CHANGELOG.md`: the date, the task, and a short list of the changes and decisions.
- In Electron, keep `contextIsolation` on and `nodeIntegration` off.
- Run the tests after each change, except for UI-only changes (see Commands).
- Context size: when the conversation goes over 400k tokens, compact it (`/compact`) before you continue.

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
- The books are the main source for generating questions. When you create or update content (pool questions, scenario records, grammar and noun pools, acronyms, definitions), use `sources-text/`.
- The app does not read the books. All questions that the app uses come from `content/`. The books help you write `content/`.
- Use `sources-text/sources-index.md` to find the chapters for the domain you work on. Read only those chapters, not full books.
- For tasks that do not create content (UI, exam generation code, storage, tests), use `content/` and do not read `sources-text/`.
- Read the text in `sources-text/`, not the original files in `sources/`.
- If a book is not in `sources-text/`, extract it first: one Markdown file for each chapter. Then update `sources-text/sources-index.md`.
- The extractor is a dev-only Python script (PyMuPDF for PDF, ebooklib for EPUB) in a local venv (approved). It is not part of the app. It is in `tools/extract/`; its `README.md` has the commands and the list of removed filler.
- Put new books in `sources/` (`core1/`, `core2/`, `general/` for books that cover both cores, `network/` for Network+, or `sec/` for Security+), not in `sources-text/`. Then run the extractor.
- Keep the sources of each certification apart: A+ content uses `sources-text/general/` (and `core1/`, `core2/`); Network+ content uses `sources-text/network/` only; Security+ content uses `sources-text/sec/` only.
- Security+ books: all four books in `sources/sec/` are for SY0-701, the exam before SY0-801. Treat them as older-objective books: copy their practice questions as they are, tagged with the closest SY0-801 objective (with a `note` when the match is not exact), and check every written fact against the SY0-801 objectives. Do not copy the PBQs of the Gorgotsias book.
- Security+ sources for SY0-801 topics (approved 2026-10-30): SY0-801 is released in November 2026 and no SY0-801 book exists yet. For each SY0-801 topic, use these sources in order: (1) the SY0-701 books in `sources-text/sec/`, including chapters that cover the topic under another objective or name; (2) the SY0-801 objectives; (3) online sources, only when the books do not cover the topic (for example 2.6, AI threats). Prefer authoritative pages (CompTIA, NIST, OWASP, MITRE, CISA, vendor documentation) over blogs and forums. Never copy questions from online question banks or exam dumps; write our own questions from the facts. A record written from online sources has `origin: "written"`, a `source` that names the page, `sourceUrls`, and `verified: false`. After the domain's pool is generated, verify each of these records against at least two independent sources (one authoritative): fix or drop it if the facts do not agree, then set `verified` to the date. The exam cannot be activated while a record has `verified: false`. Online research is for writing content only: the app itself still makes no network calls.
- Prefer the books for the current objectives (220-1201/1202) when you write new content. The 220-1101/1102 books are older: use them for background, and check their facts against a current book. Exception (approved 2026-10-30): the practice questions of the older books go into the question pool as they are (see the next rule).
- Build exam modules with `docs/exam-modules.md`.
- Question pool (approved 2026-10-30): copy every practice question of the exam's books (chapter quizzes, review questions, self-checks, practice exams) into `content/<module>/pool/`. Keep the question, the answers, and the explanation. Set `origin` to `book`. Older-objective books are copied as they are and tagged with the closest current objective, with a `note` when the match is not exact. A book question without an answer gets an answer written from the chapter (`answerOrigin: "written"`). Keep one copy of a question that is in two books.
- Then write new questions (`origin: "written"`) from the facts in each chapter until every topic (top-level bullet, numbered step, or table under an objective) has at least 1 pool question, and 2 where the chapters give enough facts (changed 2026-10-30; was 3). Each exam has at least 800 pool questions; more is good when the questions are good.
- Write scenario records for every scenario objective (at least 6 records per objective and 1 per topic). See `docs/exam-modules.md`.
- Create content one domain at a time. Stop after each domain so the user can review it. Exceptions (approved): acronyms are made and reviewed as one batch for each certification. The A+ definitions after Core 1 Domain 2 (Core 1 Domains 3–5 and all of Core 2) are made and reviewed as one batch. The Network+ definitions after Domain 1 (Domains 2–5) are made and reviewed as one batch. The Network+ exam module after Domain 1 (Domains 2–5: pool questions and scenario records) is made and reviewed as one batch (approved 2026-10-30). The Core 1 exam module after Domain 1 (Domains 2–5) is made and reviewed as one batch too (approved 2026-10-30). The Core 2 exam module after Domain 1 (Domains 2–4) is made and reviewed as one batch (approved 2026-10-30). The Security+ exam module after Domain 1 (Domains 2–5) is made and reviewed as one batch too (approved 2026-10-30). The Security+ definitions after Domain 1 (Domains 2–5) are made and reviewed as one batch (approved 2026-10-30).
- Run `tools/extract/check_content.py` after each change to `content/acronyms/` or `content/definitions/`, `tools/extract/check_questions.py` after each change to an exam module's content, and `tools/extract/check_config.py` after each change to `config/` or to the exercise content.
- Add a `source` field (book and chapter) to each content record.
- For the Acronym Exercise module, use the acronym list in the official CompTIA exam objectives as the main source (`sources-text/derived/a-plus-acronyms.md`; for Network+, `network-plus-acronyms.md`; for Security+, `security-plus-acronyms.md`). Where the Core 1 and Core 2 lists differ, check the objectives and the books for the correct expanded form (for example, XSS not XXS, and Network Address Translation for NAT).
- Use the official objectives (`sources-text/general/objectives-220-120*/`, `sources-text/network/objectives-n10-009/`, `sources-text/sec/objectives-sy0-801/`) to check that each content record matches a current objective.

## Code Style
<!-- blank -->

## Architecture

### Exam generation
The exam guide gives a separate structure for EACH exam type:
- `docs/compTIA-exam-overviews.md` Part 1 – Core 1 (220-1201).
- `docs/compTIA-exam-overviews.md` Part 2 – Core 2 (220-1202).
- `docs/compTIA-exam-overviews.md` Part 3 – Network+ (N10-009). In scope. Active since 2026-10-30 (all five domains have content).
- `docs/compTIA-exam-overviews.md` Part 4 – Security+ (SY0-801, released November 2026). In scope (added 2026-10-30). Active since 2026-10-30 (all five domains have content). 90 minutes, passing score 750, about 33% scenario questions (9 of 26 objectives).

Each exam type has its own config file. Make each config from the part of the guide for that exam only. Do not mix values between exams. Build each exam module with `docs/exam-modules.md` (approved 2026-10-30). Each config has (fields in `content/README.md`):
- `questionCount` (`min`, `max`), `timeLimitMinutes`, `passingScore`, and `maxScore`.
- The domains with their weights and their objectives. Each objective has a `kind`: `scenario` ("Given a scenario…") or `knowledge` (every other verb).
- `scenarioShare`: the estimated percentage of scenario-based questions from the guide.
- `generatedScenarioShare`: the percentage of the scenario questions that the generator writes (default 70). The rest are book or written scenario questions from the pool.

All exam modules use the same generation code. Only the config and the content are different. Each question comes from one of two places (approved 2026-10-30):
- Generated scenario questions: written at attempt time from scenario records and a sentence grammar (see Question generation).
- The question pool: fixed questions in `content/<module>/pool/` (every book practice question plus written questions; knowledge and scenario questions).

Approved exam decisions:
- Question count: random in a range from the config (75–90 for Core 1, Core 2, Network+, and Security+), as in the draft UI.
- Scoring: keep the draft's method. A multiple-response question gets partial credit (selected correct / total correct) only when no wrong option is selected. Score = round(`maxScore` × points / questions). Pass when score ≥ the config's passing score.
- Results screen: add a per-domain breakdown (correct / total for each domain) under the score, in the draft's style.
- Results screen: under the per-domain breakdown, a grid of all the questions in the style of the Review & Finalize grid (approved 2026-10-30). Each cell shows the outcome (Correct `ok`, Partially correct `flag`, Incorrect `bad`, Not answered grey) with a legend, and opens that question. The grid always shows all questions; the filters change only the list under it.
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

For each attempt (approved 2026-10-30; the steps are in `docs/exam-modules.md`), the engine in `src/engine/exam/` uses the config of the selected exam and one seeded random generator to:
- Set the question count and the timer.
- Divide the questions among the domains by weight (largest remainder).
- Divide each domain into scenario and knowledge slots by its share of scenario objectives, scaled to `scenarioShare`. Divide the scenario slots between the generator and pool scenario questions by `generatedScenarioShare`.
- Spread each domain's questions evenly across its objectives, then its topics. Prefer the pool questions the user has seen least often. Never repeat a question or scenario record in one attempt. When one slot type runs short, use the other.
- Shuffle the options (except `fixedOrder` questions) and the question order.
- Save the full question text, options, answers, and explanations with the attempt.
- Grade the attempt against the passing score, with a per-domain breakdown.

### Exercise generation (Acronym Exercise and Definition Exercise modules)
These are two separate modules. Each module practices one thing only. They can share the same exercise code with different content and configs:
- Acronym Exercise (approved 2026-10-30): type the answer ONLY, and every question is acronym → expanded form. No multiple-choice questions and no other direction.
- Definition Exercise:
  - Multiple choice: either direction (term → definition, or definition → term).
  - Type the answer: definition → term ONLY. Never ask the user to type a definition sentence. Typing the term's acronym also counts as correct (for example DHCP for Dynamic Host Configuration Protocol), when an acronym record of the same certification matches the term.

Rules:
- Each module uses its own config file in `config/exercises/` (approved 2026-10-30): question count, time limit, what happens at time up, the selection method, and the question types with a count for each. Do not hard-code these values. Current values:
  - Acronym Exercise (`acronym.json`): 20 typed questions, 12 minutes.
  - Definition Exercise (`definition.json`): 20 questions, 15 minutes: 14 multiple choice (4 choices; each question picks its direction at random) and 6 typed (definition → term, `typeable` records only).
- Setup (approved): the user selects a certification, then an exam when the certification config lists more than one (A+: Core 1, Core 2, or Both; Both is the default). Network+ and Security+ have one exam each, so no exam picker. A record is in the pool when its `exams` list includes a selected exam.
- Selection (approved): plain random from the pool, no repeats within one exercise.
- Time up (approved): the exercise ends at once and the results open. Unanswered questions count as incorrect and show "Not answered".
- Keep acronyms and definitions in separate content: `content/acronyms/` and `content/definitions/`. Do not mix them in one exercise.
- Each acronym and definition record has a certification field (`["a-plus"]`, `["network-plus"]`, or `["security-plus"]`). The app selects only the records for the certification that the user selected.
- Definition Exercise multiple-choice distractors come from the same module's content for the same certification: other terms or definitions. They come from the target's `group` first; only when the group runs short, from other groups of any exam of the same certification. A record with the same term or definition is never a distractor, and no two options have the same text.
- Definition Exercise feedback: Correct or Incorrect, the term and its definition. Multiple choice marks the correct option ("Correct answer", `ok`) and a wrong pick ("Your answer", `brand`). The letter keys A–D select an option; Enter checks and then goes on (both exercises).
- Leaving an exercise: the top bar's Home link asks first ("Leave the exercise?" – Leave or Keep going). "End exercise" asks too, then opens the results.
- Feedback after each answer (approved): the user selects or types an answer, selects "Check answer", sees Correct or Incorrect with the correct answer, then goes to the next question.
- "Not sure" (approved, Acronym Exercise; `"notSure": true` in its config, so the Definition Exercise has none): an outline button next to "Check answer", enabled even when the field is empty. It shows the correct answer with the label "Not sure" (no text that explains the scoring), counts as incorrect, and the results list shows "Not sure" as the user's answer.
- Exercise results (approved): "Try again" starts a new exercise at once, with the same module and certification and a new set of questions. It skips the setup screen. "Back to home" goes home.
- Acronym feedback box (approved): after "Check answer" or "Not sure", the box shows Correct, Incorrect, or Not sure; the acronym and its expanded form; the record's `meaning` sentence; and a small neutral pill tag for each objective in the record's `objectives` (for example "Core 1 · 2.1 Networking", at most 3, then "+n more"). The exam's short name and the domain name come from the exam config (`config/exams/`). A record with no objectives shows no tag.
- Before the app compares a typed answer, it ignores letter case, extra spaces, and punctuation.
- Spelling errors in a typed answer show a red squiggle underline.
- Grading: a typed answer with a spelling error is incorrect. Do not accept close matches.
- Spelling check method (approved): `nspell` with a bundled en_US Hunspell dictionary. Add all acronyms and terms from `content/` to the dictionary. Do not use Electron's built-in spellchecker (it downloads dictionaries on Linux and uses the OS checker on Windows). The app draws the red squiggle itself.

### Question generation (cognitive model)
The app builds scenario-based questions from a cognitive model (approved 2026-10-30). The generator is generic: it works for every exam module, current or added later, because it reads only scenario records and grammar files. Knowledge questions come from the question pool.

1. Keep scenario records in `content/<module>/scenarios/`. Each record has a `kind`, its objectives and topics, the `clues` (symptoms or conditions), the answer, an `appliesWhen` phrase, the explanation, and the `related` records.
2. Each kind has its own generator in `src/engine/exam/scenario/<kind>.ts` with its own question types:
   - `fault` (troubleshooting): MOST LIKELY cause, BEST action, FIRST step.
   - `requirement` (a need that one tool, setting, command, device, or method meets): BEST tool, setting, or method.
   - `procedure` (ordered steps): FIRST step, NEXT step.
   - `calculation` (values that code calculates, for example subnetting).
   A new kind is a code change (see `docs/exam-modules.md`).
3. For each question, the generator selects one record, two or three clues (random order), a setting, a person, and a question type.
4. The distractors are the answers of the `related` records. Each distractor's 1-sentence explanation comes from its record's `appliesWhen`. The correct answer's explanation is the record's `explanation` plus a sentence that links the selected clues.
5. A sentence grammar (Tracery method, our own small expander) joins the parts. Each part has many phrasings, so the sentence structure changes.
6. Noun pools fill the placeholders: `content/shared/grammar.json` (names, roles, offices) and `content/<module>/grammar.json` (devices, systems, places).
7. A random generator with a seed controls all selections.
8. Save the full question text and answers with each attempt. This lets the user review the exact question after grading.

### Record formats
Acronym and definition records (approved). The full field list and the content rules are in `content/README.md`.
- Pools: `content/acronyms/<cert>.json` (one file per certification) and `content/definitions/<cert>/<domain>.json` (one file per exam domain). Each file is a JSON array.
- Shared fields: `id`, `acceptedAnswers`, `certifications`, `exams`, `objectives` (`<exam>/<objective>`), `origin`, `source`, optional `note`.
- Acronym fields: `acronym`, `expanded`, `meaning`, `official`. `meaning` is one sentence (10–25 words, our own words) that says what the thing is or does. Every acronym is asked as a typed question, so every expanded form must be typeable, and `acceptedAnswers` lists every other valid wording. Pool scope: the official list plus vetted book extras (`official: false`, `origin: "book"`). Where the official list has an error or the two A+ lists differ, `expanded` has the correct form and `acceptedAnswers` keeps the official wording (except plain typos); a `note` says why.
- Definition fields: `term`, `definition`, `typeable`, `group`. Pool scope: the terms named in the objectives plus book glossary terms that match a current objective. Definitions are one sentence (about 30 words or fewer) in our own words. They never contain the term. The term is the typed answer, so the `term` field is never an acronym. The app also accepts the term's acronym as a typed answer (approved 2026-10-30): when it loads the content, it links each definition to the acronym records of the same certification whose expanded form or accepted answers match the term or its accepted answers. The content files do not list the acronym.
- One record per certification: an acronym on more than one list has one record for each certification (A+, Network+, Security+).
- Definition distractors come from the same `group` first. A record that shares the term or the definition with the target is never a distractor.

Exam module records (approved 2026-10-30). The full field lists are in `content/README.md`; the method is in `docs/exam-modules.md`.
- Files: `content/<module>/pool/d<N>.json` (pool questions), `content/<module>/scenarios/d<N>.json` (scenario records), `content/<module>/grammar.json`, and `content/shared/grammar.json`.
- Pool question: `id`, `type` (`single` or `multiple`; PBQ types later), `structure` (`recall`, `select-item`, `scenario`, `procedure`, `calculation`), `qualifier`, `exam`, `domain`, `objectives`, `topics` (`<exam>/<objective>.<n>`, the n-th top-level bullet), `stem`, `options`, `answer` (option indexes), `selectCount`, `fixedOrder`, `explanation` (2–5 sentences), `whyWrong` (1 sentence for each wrong option, `null` for correct ones), `origin` (`book` or `written`), optional `answerOrigin`, `source`, optional `note`.
- Scenario record: `id`, `kind`, `exam`, `domain`, `objectives`, `topics`, `clues`, `answer`, `appliesWhen`, `explanation`, `related`, `origin`, `source`, plus the fields of its kind.
- Facts (for example ports and RAM types) are pool questions, not a separate record type.

### Data storage and database
SQLite with `better-sqlite3` (approved). One file, `cert-practice.db`, in the Electron `userData` folder. Code in `src/main/db.ts`; migrations use `PRAGMA user_version`. The storage must:
- Keep exam attempts persistently (see `docs/spec.md`).
- Keep the full question text and answers for each attempt.
- Not keep Acronym Exercise or Definition Exercise results.

Schema (approved 2026-10-30):
- `attempts`: `id`, `exam_id`, `seed`, `status` (`in_progress` or `completed`), `config_snapshot` (JSON: exam name, domains, passing score, max score), `question_count`, `time_limit_s`, `time_left_s`, `current_index`, `started_at`, `updated_at`, `completed_at`, `points`, `score`, `passed`, `correct`, `time_used_s`.
- `attempt_questions`: primary key (`attempt_id`, `position`); `source_id`, `origin` (`pool` or `generated`), `kind`, `type`, `structure`, `domain_id`, `objectives` (JSON), `stem`, `options` (JSON), `answer` (JSON), `explanation`, `why_wrong` (JSON), and the user's work: `selected` (JSON), `flagged`, `struck` (JSON), `seconds`.
- Each exam has at most one `in_progress` attempt. "Save for later" and an interrupted session both leave it `in_progress`; the next launch offers Resume or Discard. "Cancel attempt" and Discard delete the attempt.
- The "seen least often" selection counts `source_id` in completed attempts.
- Generation and grading run in the main process (they need the database). IPC: `exam:start`, `attempt:save` (autosave), `attempt:finish`, `attempt:get`, `attempt:discard`, `attempts:list`, `attempts:inProgress`, and `exam:close-requested` / `app:close-confirmed` for closing the window during an attempt.

## Testing
- Vitest: the engine (config loading, seeded generation, domain allocation, the scenario/knowledge split, the grammar, each scenario generator, grading, typed-answer normalization, spell check), the database (on `:memory:`), a content smoke test (many seeded attempts from the real `content/` for each exam with content), and React components.
- Playwright: a few end-to-end flows that drive the Electron app (for example: start an exam, save for later, resume after a relaunch, finalize, review the attempt from Previous attempts).
- Python checkers: `check_config.py`, `check_content.py`, `check_questions.py` (with the coverage report).
