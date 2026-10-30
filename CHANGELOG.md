# Changelog

A summary of the changes and decisions in each task. Newest first.

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
