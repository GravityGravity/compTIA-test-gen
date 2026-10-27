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
- `docs/spec.md` – Product requirements.
- `docs/compTIA-exam-overviews.md` – Exam overviews for Core 1, Core 2, and Network+ (future): question count, time, passing score, domains, weights, question structures, and the structure mix.
- `references/exam-simulation-ui.html` – Exam simulation draft. The UI for an exam attempt must follow it.
- `references/comptia-ui-style/` – compTIA UI style: `README.md` (rules), `tokens.json` (colors, type, spacing, radius, shadow), `components.css`, and `components/` (Button, Card, Eyebrow, StatTile). All other screens must follow it.
- `references/exam-question-UI.png` – Original screenshot for the exam simulation draft.
- `references/UI Inspiration.png` – Original screenshot for the compTIA UI style.
- `references/links.md` – Links to the official CompTIA exam pages.
- `sources/` – Original books and guides (PDF, EPUB). Not in git. Subfolders: `core1/`, `core2/`, `general/`, `network/` (later).
- `sources-text/` – Text extracted from `sources/`. One Markdown file for each chapter. Not in git.
- `sources-text/sources-index.md` – Links each chapter to an exam domain.
- `content/` – Question records, terms, and noun pools that the app uses. Subfolders: `core1/`, `core2/`, `acronyms/`, `definitions/`, `network/` (later).
<!-- Add the code folders when they exist. -->

## Tech Stack

| Layer | Tool | Reason |
|---|---|---|
| Desktop shell | Electron | It uses the same Chromium engine on Linux and Windows. The exam screens look and operate the same on the two systems. |
| Language | TypeScript | Use one language for the UI and the logic. |
| UI | React + Vite | Fast build. Familiar from full-stack work. |
| Local storage | SQLite (`better-sqlite3`) – proposed | Plan with the user (see Data storage). |
| Packaging | electron-builder | Makes an `.exe` installer for Windows and an `.AppImage`/`.deb` for Linux. |
| Tests | Vitest – proposed | Plan with the user (see Testing). |

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
- In Electron, keep `contextIsolation` on and `nodeIntegration` off.
- Run the tests after each change.

### Rules for the UI
- Exam attempt screens (questions, review and finalize, timers, results, review): follow the structure of `references/exam-simulation-ui.html`. Keep its layout, controls, and behavior. Rebuild it as React components. Do not copy its sample question bank.
- Review of a previous attempt: use the same results and review components as the end of an exam attempt. Do not make a second version of these screens. Load the saved attempt into them.
- All other screens (menus, module selection, the list of previous attempts, Acronym Exercise module, Definition Exercise module): follow `references/comptia-ui-style/`. Read its `README.md` first.
- Use the values in `references/comptia-ui-style/tokens.json`. Do not invent new colors, fonts, or spacing.
- Do not use real CompTIA logos.

### Rules for source books and content
- The books are the main source for generating questions. When you create or update content (question records, fault and fact records, acronyms, definitions, noun pools), use `sources-text/`.
- The app does not read the books. All questions that the app uses come from `content/`. The books help you write `content/`.
- Use `sources-text/sources-index.md` to find the chapters for the domain you work on. Read only those chapters, not full books.
- For tasks that do not create content (UI, exam generation code, storage, tests), use `content/` and do not read `sources-text/`.
- Read the text in `sources-text/`, not the original files in `sources/`.
- If a book is not in `sources-text/`, extract it first: one Markdown file for each chapter. Then update `sources-text/sources-index.md`.
- Create questions from the facts in each chapter.
- When a chapter has practice questions, add each one to the question pool in `content/`. Keep the question, the answers, and the explanation. Set the `origin` field to `book`.
- Create content one domain at a time. Stop after each domain so the user can review it.
- Add a `source` field (book and chapter) to each content record.
- For the Acronym Exercise module, use the acronym list in the official CompTIA exam objectives as the main source.

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
- Before the app compares a typed answer, it ignores letter case, extra spaces, and punctuation.
- Spelling errors in a typed answer show a red squiggle underline.
- Grading: a typed answer with a spelling error is incorrect. Do not accept close matches.
- Spelling check method – Plan with the user. The standard spell checker does not know many IT terms, so the acronym and term lists must be part of the dictionary.

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

### Data storage and database – Plan with the user
Not decided. The storage must:
- Keep exam attempts persistently (see `docs/spec.md`).
- Keep the full question text and answers for each attempt.
- Not keep Acronym Exercise or Definition Exercise results.

## Testing – Plan with the user
Not decided. Use Vitest. Plan the test targets with the user.
