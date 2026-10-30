# Changelog

A summary of the changes and decisions in each task. Newest first.

## 2026-10-30 – Core 2 exam activated

Decisions:
- The user approved turning on the Core 2 exam: `config/exams/220-1202.json` has `active: true`. The user can still review the content (the notes on corrected and doubtful book answers are in the pool records).

Changes:
- `config/exams/220-1202.json`: `active: true`. `check_config.py`, `check_questions.py` (Core 2 active: no errors), 173 Vitest tests, typecheck, lint, and the 5 Playwright tests pass.

## 2026-10-30 – Core 2 exam module: all four domains, for review

Decisions:
- The exam engine, storage, and screens already existed, so the Core 2 exam needs only content. Domain 1 was built first; the user then asked for Domains 2–4 in one batch (added to the exceptions in `CLAUDE.md`). `220-1202` stays `active: false` until the user has reviewed the content.
- Book answers follow the Core 1 rule: a wrong answer is corrected, with a note that says "Book answer X corrected: …" (12 questions). A question with no defensible answer is dropped (8, listed with the reason in the triage file). A debatable but defensible answer is kept, with a note.
- Book explanations are cut to 5 sentences, because the app's tests require it for every asked question. The cut sentences are mostly about the wrong options; those facts are in `whyWrong`.
- The 32 questions that the Core 1 triage set aside for Core 2 are in the Core 2 pool.

Changes:
- `content/core2/pool/d1.json`–`d4.json`: 1,234 questions (1,107 from Exam Cram 2e, Docter, Neil, and All-in-One 11e, including both Core 2 practice exams; 127 written for thin topics and as pool scenario questions). All 220 topics have at least 2 questions. Older-objective questions are tagged with the closest current topic and a `note` that names the old objective.
- `content/core2/scenarios/d1.json`–`d4.json`: 509 records (376 requirement, 124 fault, 9 procedure) for the 25 scenario objectives; every scenario objective has at least 11 records and every topic at least 1. The 2.6 malware removal steps are procedure records in the official order.
- `content/core2/grammar.json`: device rules (Windows PCs and laptops, Mac, Linux, phones, tablet, SOHO router, browser, Wi-Fi network, VM, and the help desk, change, and backup systems for Domain 4).
- `sources-text/derived/questions/_triage-core2.json` (not in git): the domain of each All-in-One 11e and practice-exam question (for reuse), the dropped questions with the reason, and the corrected ones.

## 2026-10-30 – Question tools: book question extractor and question checker

Decisions:
- A topic is a top-level bullet, a numbered step (Core 2 2.6 lists the malware removal steps), or a table (the Network+ 1.4 ports table is one topic). Topic counts: Core 1 131, Core 2 220, Network+ 135.
- The extractor writes staging records (`sources-text/derived/questions/`, not in git), not pool records. Each one has `flags` that say what to check when it is copied into the pool. Questions that refer to a figure, and West's repaired options, are flagged, not dropped.
- Book answers are kept as the book gives them (for example "A, then D", or an All-in-One key that looks wrong). They are not vetted here.
- `check_questions.py` lists coverage gaps for exams that are not active yet, instead of failing on them, so it can run after each domain. It counts sentences as an error on written text and as a warning on book text.
- `askAction` in the shared grammar: "What should the technician do to resolve the issue?" became "Which of the following will MOST LIKELY resolve the issue?", so every `ask…` phrasing has a qualifier word.

Changes:
- `tools/extract/extract_questions.py`: one parser for each of the 7 book formats, with shared question and answer parsers. Extracted 3,995 questions:
  - A+: Exam Cram 576, Docter 460, All-in-One 280, Neil 901, all with answers.
  - Network+: Net Exam Cram 182 and Zacker 1,213, all with answers; West 383, of which 256 have no answer in the book.
  - The parsers handle:
    - numbering that restarts or repeats (answers pair by position);
    - the answer-line forms of each book;
    - Cram Quiz markers joined to other lines;
    - West self-checks printed as tables;
    - West two-column options out of order or under the next question.
- `tools/extract/check_questions.py`:
  - Checks the pool and scenario records against the app's rules: fields, ids, objectives, topics, answers, `whyWrong`, related records, and grammar rules.
  - Also checks the content rules: sentence counts, qualifiers, clues that give the answer away, and near-duplicate stems (a prefix filter keeps this under a second).
  - Prints the coverage report, with `--topics`, `--gaps`, `--root`, and `--records-only`.
- Test fixture: a third clue on each requirement record (the rule is 3–6), and the shared grammar copy updated.
- Docs: the topic definition (`content/README.md`, `docs/exam-modules.md`, `docs/spec.md`, `CLAUDE.md`), the tools and workflow in `docs/exam-modules.md` (check each staging record's flags), and the commands, staging fields, flags, and question formats in `tools/extract/README.md`.

## 2026-10-30 – Exam engine, attempt storage, and exam screens

Decisions:
- Topic coverage (changed by the user): each topic needs at least 1 pool question, and 2 is the target (was 3). The checker reports a topic with no questions as an error and a topic with 1 as a warning.
- Each exam config names its content folder (`content`: `core1`, `core2`, `network`), so the loader needs no exam-specific code.
- An exam's grammar overrides shared rules with the same name (it was an error before).
- Scenario record fields, as built: `requirement` has `need` and `itemType`; `procedure` has `task` and `steps` (`do`/`done`); `calculation` has `prefixMin`/`prefixMax`. A record's own explanation is 1–3 sentences; the generator adds the clue sentence.
- The `attempts` table also stores `correct`, so the lists don't re-grade every attempt.
- After an attempt is submitted (and when a previous attempt is reviewed), the app top bar with Home shows above the exam shell. During an attempt there is none, as in the draft.

Changes:
- Engine (`src/engine/exam/`):
  - `allocate.ts`: question count, domain split (largest remainder), scenario/knowledge split scaled to `scenarioShare`, generated/pool split.
  - `generate.ts`: per-domain selection across objectives and topics, least-seen first, no repeats, fallbacks; shuffled options and questions.
  - `grade.ts` and `questionTypes/` (single, multiple): the draft's scoring and a per-domain breakdown.
  - `scenario/`: a Tracery-style grammar and the `fault`, `requirement`, `procedure`, and `calculation` (IPv4 subnet) generators.
  - `parse.ts`: the record checks.
- `content/shared/grammar.json`: the sentence frames and noun pools for every exam.
- Main:
  - `db.ts`: the SQLite store, with migrations by `user_version`.
  - `exams.ts`: starting an attempt, and checking IPC input.
  - `content.ts`: `loadExamContent`.
  - IPC: start, autosave, finish, get, discard, and the lists.
  - The window `close` asks the renderer first while an attempt is open.
  - `CERT_PRACTICE_DATA` and `CERT_PRACTICE_USER_DATA` (development only) point the app at test data.
- Renderer:
  - `exam/`: the draft rebuilt as React components (question, review and finalize, pause, timers, time-up and leave dialogs, results with the domain table, reviewed question with the wrong-option explanations).
  - `exam.css`: the draft's CSS scoped under `.exam`, with the classes shared with `app.css` reset.
  - Home: the Practice exams section, the in-progress card, and Previous attempts.
  - Exam intro and Previous attempts screens, from the drafts.
- Tests: 164 Vitest tests (engine, generators, 300 seeded attempts on `tests/fixtures/app-data`, database, exam service, components) and 2 new Playwright tests (save for later, relaunch and resume, submit, review; closing the window during an attempt). The real-content tests are skipped until an exam has content.
- Not done: the question tools (`extract_questions.py`, `check_questions.py`) and the exam content. All exams stay `active: false`.

## 2026-10-30 – Exam modules: plan, docs, and exam configs

Decisions (approved):
- Scenario-based questions are generated at attempt time from scenario records (`fault`, `requirement`, `procedure`, `calculation`) and a Tracery-style grammar. The generator works for any exam module. All other questions come from a question pool for each exam.
- The pool has every practice question of the exam's books, with the book's answers. The older A+ books (Neil, All-in-One 11e) are copied as they are, tagged with the closest current objective, and their answers are not vetted. Book questions without answers get answers written from the chapter.
- At least 1 pool question for each top-level bullet under an objective (2 is the target; changed later the same day from 3), and at least 800 pool questions for each exam.
- The scenario share mixes generated questions and pool scenario questions (`generatedScenarioShare`, default 70%).
- Network+ also uses 75–90 questions.
- SQLite schema: `attempts` and `attempt_questions` (see CLAUDE.md). Generation and grading run in the main process.
- Facts (ports, RAM types) are pool questions, not a separate record type. This replaces the draft fault record in CLAUDE.md.

Changes:
- New `docs/exam-modules.md`: how to build any exam module (config, pool rules, scenario records, grammar, tools, workflow, checklist).
- `CLAUDE.md`, `docs/spec.md` (exam requirements and acceptance criteria), `content/README.md` (pool question, scenario record, and grammar formats; exam config fields), `docs/compTIA-exam-overviews.md` (per-objective kinds for Core 1 and Core 2, Network+ question count, structure-to-app mapping), `tools/extract/README.md` (question tools and book question formats).
- `config/exams/*.json`: `questionCount`, `timeLimitMinutes`, `passingScore`, `maxScore`, `scenarioShare`, `generatedScenarioShare`, and each domain's objectives with their kind. The kinds come from the official objectives files: 52.0% scenario for Core 1, 68.7% for Core 2, and 44.3% for Network+, which matches the overview.
- `parseExam` (`src/engine/config.ts`) and `ExamConfig` validate and type the new fields. `check_config.py` checks them against the official objectives files.
- Tests: 107 Vitest tests pass (4 new config tests). Typecheck and lint pass.
- Not done yet: the exam engine, database, IPC, and UI; `extract_questions.py` and `check_questions.py`; the exam content. All exams stay `active: false`.

## 2026-10-30 – Definition Exercise: accept the acronym

Decision (approved): in a typed Definition Exercise question, typing the term's acronym counts as correct (for example DHCP for Dynamic Host Configuration Protocol).

Changes:
- When the app loads the content, it links each definition to the acronym records of the same certification whose expanded form or accepted answers match the term or its accepted answers (`linkAcronyms` in `src/engine/content.ts`). 276 typeable terms get an acronym. The content files are unchanged.
- The feedback shows the acronym after the term: "The term is Dynamic Host Configuration Protocol (DHCP)."
- `CLAUDE.md`, `docs/spec.md`, `content/README.md`: the rule that the user never types an acronym now applies to the Acronym Exercise only.
- Tests: 103 Vitest tests, including the real DHCP record graded by its acronym.

## 2026-10-30 – Definition Exercise

Decisions:
- Distractors: the target's group first; other groups (any exam of the same certification) only when the group runs short. A record with the same term or definition is never a distractor, and no two options have the same text.
- Question types with a requirement (typed questions need `typeable` records) pick their records first, so multiple choice cannot use them up.
- Feedback shows Correct or Incorrect with the term and its definition; multiple choice marks "Correct answer" and "Your answer". No objective tags (those are for the Acronym Exercise).
- "Not sure" stays Acronym Exercise only, through a new `notSure` config field.
- Keys: A–D select an option, Enter checks and goes on. The key handler listens on the whole window, so it works when nothing is focused.

Changes:
- Engine: `src/engine/exercise/multipleChoice.ts` (directions, distractors, grading through `gradeChoice`); `generate.ts` runs both question types.
- UI: lettered option cards, the multiple-choice feedback, and the chosen option in the results list. The home screen starts both modules.
- Tests: 96 Vitest tests, including every A+ and Network+ definition asked both ways with clean distractors, and the 14 + 6 mix from the real config. A Playwright test runs a full Network+ Definition Exercise.

## 2026-10-30 – Acronym Exercise

Decisions:
- Exam configs (`config/exams/220-1201.json`, `220-1202.json`, `N10-009.json`) hold the name, short name, and domains with weights for now, for the objective tags. `active` is false until the exam modules exist. The exam engine adds its fields later.
- Certification configs get `shortName` (`CompTIA A+`); exercise configs get an optional `description`.
- Spell check runs in the UI: the main process sends the en_US dictionary and every word of every answer in `content/`; nspell builds once (about 0.25 s). It ignores letter case, like the answer comparison. A test checks that no answer in `content/` fails the spell check.
- A typed answer is correct only when it matches the expanded form or an accepted answer after normalization (the same rule as `check_content.py`) and has no misspelled word.
- The feedback adds "Spelling errors count as incorrect." only when the answer has a misspelled word.
- The top bar's Home link during an exercise asks "Leave the exercise?" first.
- The timer counts down to a fixed deadline, so it does not drift.

Changes:
- Engine: answer normalization, the spell checker, objective tags, the record pool, seeded generation with no repeats, grading, and the summary (correct, incorrect, spelling errors).
- Main: loads and checks `content/acronyms/` and `content/definitions/`, and serves the content and the dictionary over IPC.
- UI: the setup screen (certification, exam picker for A+ with Both as the default, counts, what to expect), the question screen (timer, progress, the spelling squiggle, Check answer, Not sure, feedback with the meaning and objective tags, End exercise), and the results screen (counts, time-up notice, filter, Try again).
- `tools/extract/check_config.py`: checks the exam configs and the new fields.
- Tests: engine, content, and component tests, and a Playwright test of a full Acronym Exercise.

## 2026-10-30 – Electron sandbox on Ubuntu 24.04

- `npm run dev` aborted on Ubuntu 24.04: AppArmor blocks unprivileged user namespaces, so Electron's sandbox fell back to a `chrome-sandbox` helper that root does not own.
- Fix (done once, with sudo): an AppArmor profile for `node_modules/electron/dist/electron`. Not `--no-sandbox`, and not a root-owned `chrome-sandbox` (npm resets it on each install).
- `README.md`: the steps. `CLAUDE.md`: a note under Commands.

## 2026-10-30 – Build setup and app skeleton

Decisions (approved):
- Scaffold: `electron-vite` with React and strict TypeScript. Main, preload, and renderer build with one Vite config.
- Layers: `src/main`, `src/preload`, `src/renderer`, `src/engine` (pure TypeScript, no Electron or React), `src/shared`.
- `config/` and `content/` stay at the repo root. The main process reads them (the repo in development, the resources folder in an installed build) and sends them to the UI over IPC.
- Code style: ESLint (`typescript-eslint`, React hooks) and Prettier.
- Seeded random generator: our own (mulberry32), no package.
- The Windows `.exe` needs Wine on Linux, or a Windows machine.

Changes:
- `package.json` with the npm scripts (see CLAUDE.md "Commands"). Electron 45, React 19, Vite 8, Vitest 5, Playwright 1.64, better-sqlite3 13, nspell with `dictionary-en`, and `@fontsource/inter` (bundled font).
- The app opens a "Cert Practice" window (minimum 1024 × 720, `contextIsolation` on, `nodeIntegration` off, sandboxed preload, no popups or navigation, a strict Content Security Policy). The home screen lists the exercise modules from `config/exercises/`; inactive ones are greyed out. The Start buttons stay disabled until the exercises are built.
- Engine: config validation (`src/engine/config.ts`) and the seeded random generator (`src/engine/random.ts`).
- Styles: `tokens.css` (the compTIA UI style tokens) and `app.css` (from the drafts' stylesheet).
- Tests: 41 Vitest tests (random generator, config validation, loading the real configs, `tokens.css` against `tokens.json`, the home screen) and one Playwright test that launches the app and checks the title, the modules, the isolation settings, and the minimum size.
- Packaging: `electron-builder.yml` for AppImage, deb, and NSIS, with `publish: null` (no auto-update metadata, since the app makes no network calls). The Linux build was made and the packaged app starts and reads `config/` from its resources folder.
- Finding: better-sqlite3 13 ships N-API prebuilt binaries, so the same binary loads in Node and Electron. The planned workaround for testing it is not needed.
- `CLAUDE.md`: Commands, Code Style, and the new folders.

## 2026-10-30 – Exercise configs

Decisions (approved):
- Definition Exercise: 20 questions in 15 minutes: 14 multiple choice (4 choices; each picks its direction at random) and 6 typed (definition → term, `typeable` records only).
- Acronym Exercise: 20 typed questions in 12 minutes. The earlier 30-minute limit is gone.
- Time up: the exercise ends at once and the results open. Unanswered questions count as incorrect and show "Not answered".
- Setup: certification, then exam when the certification has more than one (A+: Core 1, Core 2, or Both, the default). A record is in the pool when its `exams` includes a selected exam.
- Selection: plain random, no repeats within one exercise.

Changes:
- New `config/`: `certifications/a-plus.json`, `certifications/network-plus.json`, `exercises/acronym.json`, `exercises/definition.json`.
- New `tools/extract/check_config.py`: checks the config fields, the question-type counts, and that every certification and exam choice has enough records. The smallest pool is A+ Core 1 acronyms with 207 records.
- `CLAUDE.md`, `docs/spec.md`, `content/README.md`, `tools/extract/README.md`: the configs and the decisions above.
- UI drafts: an exam picker on the setup screen (A+ only), a 12-minute timer, time-up to results (`#timeup`), a "Not answered" row and time-up notice in the results, and 12 and 15 min on the home screen.

## 2026-10-30 – Definitions: Network+ Domains 2–5

Decisions:
- Network+ Domains 2–5 are written and reviewed as one batch (the user asked for it; recorded in CLAUDE.md).
- Where the books disagree, the definitions follow Exam Cram for: ARP poisoning vs ARP spoofing, DNS poisoning vs DNS spoofing, IP helper (forwards several UDP services) vs DHCP relay agent (DHCP only), and Static NAT (no Source NAT record, because the books use SNAT for different things). They follow West for: tailgating vs piggybacking, suspended port (an aggregation member whose settings do not match), divide and conquer, and the SNMP trap port (UDP 162).
- Golden configuration is one record; "Baseline configuration" is an accepted answer.
- Lockable rack is one record for objectives 2.4 and 4.1.
- A few terms keep an acronym with words where the full name is awkward ("Rogue DHCP server", "DHCP snooping", "URL filtering", "MAC filtering"); the full name is an accepted answer. Device commands are lowercase terms ("tracert", "show vlan").

Changes:
- New definition files in `content/definitions/network-plus/`, written from Exam Cram, West and their glossaries:
  - `d2-network-implementation.json`: 119 terms
  - `d3-network-operations.json`: 128 terms
  - `d4-network-security.json`: 90 terms
  - `d5-network-troubleshooting.json`: 117 terms
- The Network+ definition pool now holds 657 terms in 104 groups.
- `content/README.md`: the groups for each file.
- `CLAUDE.md`: the one-batch rule for these domains.

## 2026-10-30 – Definitions: Network+ Domain 1 (Networking Concepts)

- New `content/definitions/network-plus/d1-networking-concepts.json`: 203 terms for objectives 1.1–1.8, in 33 groups.
  - Written from the Network+ books only: Exam Cram and West chapters and both glossaries.
  - Protocols use their full names as the term, and the definition gives the port.
- Decisions on conflicts:
  - Secure Access Service Edge is the term; the objectives' "Secure Access Secure Edge" is an accepted answer.
  - Collapsed core and spine and leaf are separate terms (Exam Cram), not synonyms (West).
  - Playbook and template are separate terms (Exam Cram).
  - Direct attach copper is the factory-made cable; twinaxial is the cable type it uses.
  - Fibre Channel is one record for objectives 1.2 and 1.5.
  - Long-Term Evolution is described as 4G.
- `content/README.md`: the Network+ Domain 1 groups. Group names are unique within a certification.
- Network+ definitions stay one domain per batch. Domains 2–5 are not started.

## 2026-10-30 – Definitions: the rest of A+ (Core 1 Domains 3–5, Core 2 Domains 1–4)

Decisions:
- The remaining A+ domains are written and reviewed as one batch (the user asked for it; recorded in CLAUDE.md).
- A concept that two domains name gets one record that lists both objectives (videoconferencing, hardware virtualization, personally identifiable information).
- No two records accept the same typed answer, and a group name is used in one file only.
- Full names are typeable, even long ones such as "Peripheral Component Interconnect Express". Only very long names and symptom phrases are multiple choice only (17 records).

Changes:
- New definition files, written from Exam Cram 2e and Docter:
  - `core1-d3-hardware.json`: 139 terms
  - `core1-d4-virtualization-cloud.json`: 45 terms
  - `core1-d5-hw-network-troubleshooting.json`: 96 terms
  - `core2-d1-operating-systems.json`: 158 terms
  - `core2-d2-security.json`: 152 terms
  - `core2-d3-software-troubleshooting.json`: 71 terms
  - `core2-d4-operational-procedures.json`: 127 terms
- The A+ definition pool now holds 924 terms in 149 groups.
- `content/README.md`: the groups for each file.
- `CLAUDE.md`: the one-batch rule for these domains, and a rule to compact the conversation over 400k tokens.

## 2026-10-30 – Definitions: A+ Core 1 Domain 2 (Networking)

- New `content/definitions/a-plus/core1-d2-networking.json`: 98 terms for objectives 2.1–2.8, in 15 groups.
  - Written from Exam Cram 2e chapters 4–11.
  - Protocols use their full names as the term, and the definition gives the port.
  - Three book terms are added: three-way handshake, channel bonding, port number.
- Long names that can't fairly be typed are multiple choice only (`typeable: false`). Here, that is DMARC.
- Bluetooth and NFC are not repeated: they are already in Domain 1.

## 2026-10-30 – Definitions: A+ Core 1 Domain 1 (Mobile Devices)

- New `content/definitions/a-plus/core1-d1-mobile-devices.json`: 38 terms for objectives 1.1–1.3, in 6 groups.
  - Most terms are named in the objectives. Others come from the current books (cable lock, privacy screen, airplane mode, geofencing, MAM, COPE) or from the AIO glossary (digitizer, checked against Docter).
  - Definitions are written from Exam Cram 2e chapters 1–3 and Docter Core 1 chapters 4 and 10.
- Terms that are only acronyms or model names (3G/4G/5G, eSIM, M.2) are left out, because a typed answer cannot be an acronym. They are covered by the Acronym Exercise or later domains.

## 2026-10-30 – Exercise "Try again"

- "Try again" on the exercise results starts a new exercise at once: the same module and certification, a new set of questions, and no setup screen. `references/ui-drafts/exercise-results.html`, `README.md`, `CLAUDE.md`, `docs/spec.md`.

## 2026-10-30 – "Not sure" feedback without a scoring caption

- The "Not sure" feedback no longer says "Not sure counts as incorrect". It still counts as incorrect. `references/ui-drafts/exercise-question.html`, `CLAUDE.md`.

## 2026-10-30 – Acronym meanings and objective tags

Decisions:
- After each acronym answer, the feedback box shows a one-sentence meaning and a small neutral pill tag for each objective the acronym is tied to (exam, objective number, domain name; at most 3, then "+n more"). There's no tag when no objective names the acronym. Exam short names and domain names come from the exam config.
- New required acronym field `meaning`: one sentence, 10–25 words, in our own words, with key exam facts such as port numbers.

Changes:
- `content/acronyms/a-plus.json`, `network-plus.json`: a `meaning` for all 394 records. A+ sentences were checked against Exam Cram 2e and Docter, and Network+ sentences against the Network+ books, where a fact was uncertain.
- `tools/extract/check_content.py`: `meaning` is required and must be one sentence. The word count is a warning.
- `references/ui-drafts/drafts.css`: new neutral `.tag` pill (existing tokens only). `exercise-question.html` shows the meaning and the tags.
- `CLAUDE.md`, `docs/spec.md`, `content/README.md`: the field and the feedback box rule.

## 2026-10-30 – Acronym Exercise: "Not sure" button

Decisions:
- The Acronym Exercise question has a "Not sure" button (outline style) next to "Check answer". It works even when the field is empty. It shows the correct answer under the label "Not sure" and counts as incorrect. The results list shows "Not sure" as the answer.

Changes:
- `CLAUDE.md`, `docs/spec.md`: the rule.
- `references/ui-drafts/exercise-question.html`, `exercise-results.html`, `README.md`: the button, its feedback, and a "Not sure" row in the results.

## 2026-10-30 – Acronym Exercise: typed questions only

Decisions:
- The Acronym Exercise has type-the-answer questions only. Every question shows the acronym, and the user types the expanded form. There are no multiple-choice questions and no expanded-form → acronym direction. The Definition Exercise is unchanged.
- Acronym records have no `typeable` and no `group` field: every acronym is typed, and no distractors are needed. Definition records keep both fields.
- One acronym has one record per certification. A second meaning goes in `acceptedAnswers`.

Changes:
- `CLAUDE.md`, `docs/spec.md`, `content/README.md`: the new question rule and record format.
- `content/acronyms/a-plus.json`, `network-plus.json`: removed `typeable` and `group`. DB-9 now accepts the common connector names, so it can be typed.
- `tools/extract/check_content.py`: acronyms are checked without groups or a typeable flag. Two records with the same acronym are an error. `seed_acronyms.py` no longer writes the two fields.
- `references/ui-drafts/`: the exercise question, setup, results, and home drafts show typed acronym questions only.

## 2026-10-30 – Network+ in scope; acronym pools for A+ and Network+

Decisions:
- Network+ is in scope: its exam, acronym, and definition content get built. Each module and certification has an `active` config setting. It is true once its config and content exist; until then the module is greyed out.
- The Acronym Exercise and the Definition Exercise are separate pools (`content/acronyms/`, `content/definitions/`).
- Acronym and definition record formats approved (see `content/README.md` and CLAUDE.md "Record formats").
- Acronym pool: the official list plus vetted book extras. An extra must be used by a current book, match a current objective, not be obsolete, and have one agreed expanded form.
- Definition pool: the terms named in the objectives plus book glossary terms that match a current objective. Definitions are written in our own words. The typed answer is never an acronym.
- Where the official list has an error, `expanded` holds the correct form and `acceptedAnswers` keeps the official wording (plain typos excepted). A `note` explains each case.
- One record per certification. An acronym on both lists has one record in each file.
- Review order: acronyms first, one batch per certification (an approved exception to "one domain at a time"). Then definitions, one domain per batch.

Changes:
- `CLAUDE.md`, `docs/spec.md`, `docs/compTIA-exam-overviews.md`: Network+ no longer "inactive, do not build"; the record formats, pool scope, and acronym batch rule.
- `references/ui-drafts/home.html`, `exercise-setup.html`, `README.md`: Network+ shown as active (the inactive state is described in comments). The acronym counts come from the content (222 and 172).
- New `tools/extract/seed_acronyms.py` and `tools/extract/check_content.py`; `tools/extract/README.md` has the commands.
- New `content/acronyms/a-plus.json`: 222 records (200 official, 22 extras), in 17 groups. Fixed: NAT, WISP, IMAP, RADIUS, SAML, VNC, HDMI, CAC, NAS, SPICE, IAM, OTP, PCL. XXS was merged into XSS.
- New `content/acronyms/network-plus.json`: 172 records (162 official, 10 extras), in 12 groups. Fixed: TACAS+ → TACACS+, IPSec → IPsec, LC, RFID, SSL, LDAPS, and others.
- New `content/README.md`: the formats, rules, and groups.

Found: in the extracted 220-1201 objectives, two 3.2 lines have a broken character (for example "Shielded twisted pair ըDirect burial"). The extractor should fix it.

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
