# CompTIA A+ Practice App – Product Requirements

## Purpose
Help users prepare for the CompTIA A+ Core 1 and Core 2 exams.

## Problem
There are not many local applications that generate practice tests and exercises for the CompTIA A+ Core exams.

## Users
People who prepare for CompTIA certification exams.

## Goals
- The app runs locally on the user's computer.
- The app simulates the CompTIA A+ Core exam environment.
- The user can review each exam attempt.
- The app explains why each answer is correct or incorrect.
- The app gives exercises to practice term definitions and acronym expanded forms.

## Modules
Use these names in all files and code:

| Module | Structure | Content |
|---|---|---|
| Core 1 Exam | Exam structure | Core 1 topics |
| Core 2 Exam | Exam structure (same as Core 1) | Core 2 topics |
| Network+ Exam | Exam structure (same as Core 1) | Network+ topics. Greyed out until its config is active. |
| Acronym Exercise | Exercise structure (different) | Acronyms only |
| Definition Exercise | Exercise structure (shares the exercise code with Acronym Exercise) | Terms and definitions only |

## Requirements

### General
- The app runs locally.
- The app runs on Windows and Linux.
- Desktop only. There is no phone or tablet layout.
- The app has no user accounts. Each installation keeps its own data.
- The app does not use a language model.
- Language: English only.
- All screens that are not part of an exam attempt or an attempt review (menus, module selection, the list of previous attempts, the Acronym Exercise module, and the Definition Exercise module) follow the compTIA UI style in `references/comptia-ui-style/`.

### Core 1 Exam and Core 2 Exam modules
- `docs/compTIA-exam-overviews.md` defines how the app generates each exam. Follow it for:
  - The number of questions, the time limit, and the passing score.
  - The domains and the domain weights.
  - The question structures and the estimated mix of each structure.
- All questions are multiple choice: single response and multiple response ("Choose two").
- The exam attempt UI follows the structure of the exam simulation draft in `references/exam-simulation-ui.html` (question screen, review and finalize screen, timers, results screen, and review screen).
- The exam has a timer.
- The app generates questions dynamically. The sentence structure changes between attempts, so the user cannot memorize the question form.
- The app grades each attempt against the passing score in `docs/compTIA-exam-overviews.md`.
- After the user submits an exam, "Start a new attempt" on the results screen goes back to that exam's page.
- The app stores each attempt persistently.
- During an exam, a "Return" button is at the top of the screen. When the user selects it or tries to close the app, a dialog asks the user to save the exam for later or cancel the attempt (or keep working). A saved exam can be resumed later.
- The correct answer has an in-depth explanation of 2–5 sentences.
- Each incorrect answer has a short explanation of 1 sentence.
- Review of a previous attempt uses the same results screen and review screen as the exam simulation draft. They are the same screens that the user sees at the end of an attempt.

### Acronym Exercise and Definition Exercise modules
These are two separate modules. Each module practices one thing only.

| Module | Practices | Multiple choice | Type the answer |
|---|---|---|---|
| Acronym Exercise | Acronyms only | None | Every question: acronym → type the expanded form (only this direction) |
| Definition Exercise | Terms and definitions only | Either direction: term → select the definition, or definition → select the term | Definition → type the term (only this direction) |

Both modules:
- Before an exercise begins, the user selects the certification to review (A+ or Network+). For A+, the user also selects the exam: Core 1, Core 2, or Both (the default). Network+ has one exam.
- Each exercise has 20 questions, chosen at random with no repeats. The Acronym Exercise has a 12-minute time limit and the Definition Exercise a 15-minute time limit.
- The Definition Exercise has 14 multiple-choice questions (each in a random direction) and 6 type-the-answer questions.
- When the time runs out, the exercise ends and the results open. Questions not answered count as incorrect and show "Not answered".
- These values come from the module configs in `config/exercises/`.
- Question formats: the Acronym Exercise has type-the-answer questions only. The Definition Exercise has multiple choice and type the answer.
- After each answer, the app shows whether it is correct and shows the correct answer.
- Acronym Exercise feedback: the answer box also shows one sentence on what the acronym means and, when the acronym is tied to an exam objective, a small tag for each objective (exam, objective number, and domain name).
- Acronym Exercise: a "Not sure" button next to "Check answer" lets the user skip typing. The app shows the correct answer, and the question counts as incorrect. The results show "Not sure" as the answer.
- Type-the-answer questions use one direction only (see the table). The user never types a definition sentence or an acronym.
- Type-the-answer spelling:
  - When a typed word has a spelling error, the app underlines the word with a red squiggle line.
  - An answer with a spelling error is incorrect.
- The app does not store exercise results.
- On the results screen, "Try again" starts a new exercise of the same module and certification at once, with a new set of questions. It skips the setup screen.
- Question pools (approved):
  - Acronym Exercise: the official acronym list for the certification, plus acronyms from the current books that match a current objective. Where the official list has an error, the app shows the correct expanded form and also accepts the official wording.
  - Definition Exercise: the terms named in the exam objectives, plus book glossary terms that match a current objective. The typed answer is always the term's full name, never an acronym.

## Out of Scope
- Performance-based questions (PBQs) in the current version. See Future.
- User accounts and cloud sync.
- Real CompTIA logos or branding.
- Languages other than English.

## Future (not in the current version)
- Performance-based question (PBQ) types. Do not build them now. The app design must let new question types be added later.

## Acceptance Criteria

### Core 1 Exam module
<!-- blank -->

### Core 2 Exam module
<!-- blank -->

### Network+ Exam module
<!-- blank -->

### Acronym Exercise module
<!-- blank -->

### Definition Exercise module
<!-- blank -->

### Attempt review
<!-- blank -->