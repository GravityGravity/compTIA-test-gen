# Content

The records that the app uses. The app does not read the books; the books in `sources-text/` help write these files. Run `tools/extract/check_content.py` after every change to `acronyms/` or `definitions/`, and `tools/extract/check_questions.py` after every change to an exam module.

| Folder | Module | Files |
|---|---|---|
| `acronyms/` | Acronym Exercise | `a-plus.json`, `network-plus.json`, `security-plus.json` – one file for each certification |
| `definitions/` | Definition Exercise | `a-plus/`, `network-plus/`, `security-plus/` – one file for each exam domain |
| `core1/`, `core2/`, `network/`, `security/` (planned) | Core 1 Exam, Core 2 Exam, Network+ Exam, Security+ Exam | `pool/d<N>.json` (pool questions, one file for each domain), `scenarios/d<N>.json` (scenario records), `grammar.json` (grammar rules for this exam) |
| `shared/` | All exam modules | `grammar.json` – grammar rules and noun pools that every exam uses |

Each file is a JSON array of records. The app reads every `*.json` under a module's folder, so the file split is only for review. The domain of an acronym or definition record comes from its `objectives`, not from the file name. Exam module records also have a `domain` field, and it must match the file. How to build an exam module: `docs/exam-modules.md`.

The Acronym Exercise and the Definition Exercise are separate pools. Never put acronyms in `definitions/` or definitions in `acronyms/`.

The Acronym Exercise has typed questions only: the app shows the acronym and the user types the expanded form. So acronym records have no distractor group and no multiple-choice flag. The Definition Exercise has multiple choice and typed questions.

## Acronym record

```json
{
  "id": "aplus-acr-dhcp",
  "acronym": "DHCP",
  "expanded": "Dynamic Host Configuration Protocol",
  "meaning": "DHCP automatically gives clients an IP address, subnet mask, default gateway, and DNS servers, using UDP ports 67 and 68.",
  "acceptedAnswers": [],
  "certifications": ["a-plus"],
  "exams": ["220-1201", "220-1202"],
  "objectives": ["220-1201/2.1", "220-1201/2.3", "220-1201/2.4"],
  "official": true,
  "origin": "official",
  "source": "CompTIA A+ Core 1 (220-1201) and Core 2 (220-1202) Exam Objectives – Acronym Lists"
}
```

| Field | Meaning |
|---|---|
| `id` | Stable key: `aplus-acr-…`, `netplus-acr-…`, or `secplus-acr-…`. |
| `acronym` | Shown in the question. Keep the official capitals (`DoS`, `IPsec`). |
| `expanded` | The correct expanded form, as the objectives and current books write it. The typed answer, and the answer the app shows after "Check answer". |
| `meaning` | One sentence, 10–25 words, in our own words: what the thing is or does, with key exam facts (for example a port number). Shown in the feedback box after the user answers. |
| `acceptedAnswers` | Other typed forms that are also correct, for example the official list's wording where it differs from `expanded`, or the long form of a short word in it (`Virtual LAN` / `Virtual Local Area Network`). The app compares typed answers after it removes case, extra spaces, and punctuation, and accepts no close matches, so every valid variant must be listed. |
| `certifications` | `["a-plus"]`, `["network-plus"]`, or `["security-plus"]`. One certification per record: an acronym on more than one list has one record in each file, because each record's source and objectives belong to its own certification. |
| `exams` | The exams whose acronym list (or objectives) have it: `220-1201`, `220-1202`, `N10-009`, `SY0-801`. |
| `objectives` | `<exam>/<objective>`, for example `220-1201/2.1`. The objectives that name the acronym or its expanded form. Empty for an official acronym that no objective names. The feedback box shows one tag for each objective. |
| `official` | `true` when the acronym is on the official list. |
| `origin` | `official` (the official list) or `book` (an extra from a current book). |
| `source` | The acronym list, or for an extra, the book and chapter. |
| `note` | Optional. Why a record differs from the official list. Not shown in the app. |

**Rule that follows from the data:** one acronym has one record per certification. The question shows only the acronym, so if an acronym has two meanings, the second meaning goes in `acceptedAnswers` (the checker reports two records with the same acronym as an error).

## Definition record

```json
{
  "id": "aplus-def-raid-5",
  "term": "RAID 5",
  "acceptedAnswers": ["RAID level 5"],
  "definition": "A disk array that stripes data and parity across three or more drives, so it survives the loss of any one drive.",
  "typeable": true,
  "certifications": ["a-plus"],
  "exams": ["220-1201"],
  "objectives": ["220-1201/3.4"],
  "group": "storage-raid",
  "origin": "objectives",
  "source": "CompTIA A+ Complete Study Guide (Docter) – Core 1 Chapter 2; 220-1201 objective 3.4"
}
```

Same fields as the acronym record except `acronym`, `expanded`, `meaning` and `official`, plus:

| Field | Meaning |
|---|---|
| `term` | The term. It is the typed answer, so it is never an acronym: use the full name (`Dynamic Host Configuration Protocol`, not `DHCP`). |
| `definition` | One sentence, about 30 words or fewer, in our own words (never copied from a book). It must not contain the term or an accepted answer, and it must fit no other term in the same group. |
| `acceptedAnswers` | Spelling variants of the term only. Never an acronym: the app links the term's acronym from `content/acronyms/` when it loads (an acronym record of the same certification whose `expanded` or `acceptedAnswers` matches the term), and accepts it as a typed answer. |
| `typeable` | `false`: multiple choice only (the term cannot fairly be typed from memory). |
| `group` | Topic slug. Multiple-choice distractors come from the same group first, so they are plausible. A group with fewer than 4 records gets its other distractors from the same certification. A record with the same term or definition as the target is never a distractor. |
| `objectives` | At least one. |
| `origin` | `objectives` (named in an objective), `glossary` (from a book glossary and matched to an objective), or `book` (from a chapter). |

## Configs

The app reads these records through the configs in `config/` (approved 2026-10-30):

- `config/certifications/<cert>.json` – `id` (the file name), `name`, `shortName` (for example `CompTIA A+`, used in exercise headers and results), `active`, and `exams` (exam codes in picker order, each with a config in `config/exams/`). The exercise setup shows an exam picker when there is more than one exam, plus "Both".
- `config/exams/<code>.json` – `id` (the exam code and the file name), `certification`, `name` (`Core 1 Exam`), `shortName` (`Core 1`), `active` (false until the exam module and its content exist), and `domains` (`id` `"1"`, `"2"`, …, `name` as the official objectives write it, `weight` in percent, and `objectives`; the weights add up to 100). The objective tags in the Acronym Exercise feedback use the short name and the domain name. Exam engine fields (approved 2026-10-30; how to get each value: `docs/exam-modules.md`):
  - `content` – the exam module's folder in `content/` (`core1`, `core2`, `network`, `security`). The app reads the pool, scenarios, and grammar of the exam from it.
  - `questionCount` – `{ "min": 75, "max": 90 }`. Each attempt selects a count in this range.
  - `timeLimitMinutes`, `passingScore`, `maxScore` (for example 90, 675, 900).
  - `scenarioShare` – the estimated percentage of scenario-based questions from `docs/compTIA-exam-overviews.md`.
  - `generatedScenarioShare` – the percentage of scenario questions that the generator writes (default 70). The rest are pool questions with `structure: "scenario"`.
  - `domains[].objectives` – every objective of the domain, in order: `{ "id": "2.6", "kind": "scenario" }`. `kind` is `scenario` when the title starts with "Given a scenario", else `knowledge`.
- `config/exercises/<module>.json` – `id`, `name`, optional `description` (one sentence for the home card and the setup screen), optional `notSure` (true: typed questions get a "Not sure" button), `active`, `content` (`acronyms` or `definitions`), `certifications`, `questionCount`, `timeLimitMinutes`, `onTimeUp` (`end`), `selection` (`random`), and `questionTypes`. Each question type has a `type` (`typed` or `multiple-choice`) and a `count`; the counts add up to `questionCount`.
  - `typed`: `prompt` and `answer` (`acronym` → `expanded`, or `definition` → `term`), and `requires: "typeable"` for definitions.
  - `multiple-choice` (definitions only): `direction` (`random`, `term-to-definition`, or `definition-to-term`), `directions` (the ones `random` picks from), and `choices`.

A record is in an exercise's pool when its `certifications` is the selected certification and its `exams` includes a selected exam. Run `tools/extract/check_config.py` to check the configs and that each pool is big enough.

## Groups

Definition groups, by file. Within a certification, a group name is used in one file only, so distractors stay within one domain.

A+ Core 1 Domain 1 (`core1-d1-mobile-devices.json`, 38 terms): `mobile-hardware`, `physical-security`, `input-accessories`, `mobile-connections`, `cellular-location`, `mobile-management`.

A+ Core 1 Domain 2 (`core1-d2-networking.json`, 98 terms): `transport`, `web-mail-protocols`, `file-remote-protocols`, `wireless`, `server-roles`, `appliances-systems`, `dns-records`, `email-authentication`, `dhcp-configuration`, `network-devices`, `power-provider-equipment`, `ip-addressing`, `connection-types`, `network-types`, `networking-tools`.

A+ Core 1 Domain 3 (`core1-d3-hardware.json`, 139 terms): `display-types`, `display-attributes`, `twisted-pair`, `fiber-coax`, `copper-connectors`, `peripheral-cables`, `video-cables`, `storage-interfaces`, `storage-drives`, `raid`, `ram`, `motherboards`, `expansion-cards`, `firmware`, `firmware-security`, `cpu-cooling`, `power-supply`, `power-connectors`, `printer-drivers`, `printer-settings`, `scanning`, `printer-security`, `printer-types`, `laser-printer-parts`, `inkjet-thermal-impact-parts`.

A+ Core 1 Domain 4 (`core1-d4-virtualization-cloud.json`, 45 terms): `vm-purposes`, `virtualization-platforms`, `vm-networking`, `vm-requirements`, `cloud-models`, `cloud-billing-scaling`, `cloud-resources`.

A+ Core 1 Domain 5 (`core1-d5-hw-network-troubleshooting.json`, 96 terms): `system-symptoms`, `hardware-diagnostics`, `drive-symptoms`, `raid-issues`, `image-quality`, `display-input-projector`, `mobile-power-damage`, `mobile-input-software`, `network-symptoms`, `network-causes-fixes`, `print-quality`, `paper-handling`, `print-queue`.

A+ Core 2 Domain 1 (`core2-d1-operating-systems.json`, 158 terms): `mobile-desktop-os`, `os-file-systems`, `compatibility-requirements`, `boot-partitioning`, `installation-types`, `windows-editions`, `windows-mmc-tools`, `windows-system-tools`, `cmd-files`, `cmd-network`, `cmd-system`, `control-panel`, `power-options`, `windows-networking`, `macos-interface`, `macos-services`, `macos-maintenance`, `macos-apps`, `linux-file-commands`, `linux-admin-commands`, `linux-info-commands`, `linux-network-commands`, `linux-config-files`, `linux-components`, `cloud-productivity`.

A+ Core 2 Domain 2 (`core2-d2-security.json`, 152 terms): `facility-security`, `physical-access`, `logical-access`, `mfa`, `windows-accounts`, `windows-protection`, `ntfs-permissions`, `active-directory`, `wireless-authentication`, `malware-infection`, `malware-surveillance`, `malware-tools`, `malware-removal`, `phishing`, `social-engineering`, `network-attacks`, `password-and-web-attacks`, `threats-and-vulnerabilities`, `passwords`, `account-hardening`, `mobile-security`, `data-destruction`, `soho-firewall`, `soho-router`, `browser-trust`, `browser-settings`.

A+ Core 2 Domain 3 (`core2-d3-software-troubleshooting.json`, 71 terms): `windows-stability`, `windows-performance`, `windows-fixes`, `boot-and-crash`, `mobile-app-symptoms`, `mobile-fixes`, `mobile-security-concerns`, `mobile-security-symptoms`, `pc-security-symptoms`, `browser-symptoms`.

A+ Core 2 Domain 4 (`core2-d4-operational-procedures.json`, 127 terms): `ticketing`, `asset-management`, `support-documents`, `agreements-policies`, `change-planning`, `change-control`, `backup-methods`, `backup-recovery`, `esd-protection`, `personal-safety`, `environmental-controls`, `power-protection`, `incident-response`, `software-licensing`, `regulated-data`, `customer-communication`, `professional-conduct`, `script-file-types`, `scripting-basics`, `remote-access-methods`, `ai-limitations`, `ai-privacy-use`.

Network+ Domain 1 (`network-plus/d1-networking-concepts.json`, 203 terms): `osi-layers`, `osi-encapsulation`, `appliance-forwarding`, `appliance-security`, `appliance-storage`, `appliance-traffic`, `cloud-models`, `cloud-characteristics`, `cloud-networking`, `proto-file-remote`, `proto-web-mail-voice`, `proto-network-services`, `proto-ip-types`, `proto-ports-transport`, `traffic-types`, `media-wireless`, `media-copper`, `media-cable-jackets`, `media-fiber`, `media-transceivers`, `media-fiber-connectors`, `media-copper-connectors`, `topo-types`, `topo-architecture`, `ipv4-special`, `ipv4-subnetting`, `ipv4-classes`, `modern-sdn`, `modern-vxlan`, `modern-zero-trust`, `modern-iac`, `modern-source-control`, `modern-ipv6`.

Network+ Domain 2 (`network-plus/d2-network-implementation.json`, 119 terms): `route-protocols`, `route-types`, `route-selection`, `route-nat`, `route-redundancy`, `switch-intervlan`, `switch-vlan`, `switch-ports`, `switch-duplex`, `switch-features`, `wifi-channels`, `wifi-service-sets`, `wifi-network-types`, `wifi-security`, `wifi-antennas-aps`, `install-locations-racks`, `install-cabling`, `install-power`, `install-environment`.

Network+ Domain 3 (`network-plus/d3-network-operations.json`, 128 terms): `ops-documentation`, `ops-assets`, `ops-lifecycle`, `ops-change-config`, `monitor-snmp`, `monitor-data`, `monitor-logs`, `monitor-solutions`, `access-vpn`, `access-management`, `dr-metrics`, `dr-sites`, `dr-ha`, `dr-plans`, `dhcp-config`, `dhcp-process`, `dhcp-ipv6`, `dns-records`, `dns-zones`, `dns-resolution`, `dns-security`, `time-sync`.

Network+ Domain 4 (`network-plus/d4-network-security.json`, 90 terms): `sec-crypto`, `sec-compliance`, `sec-authentication`, `sec-iam`, `sec-physical-deception`, `sec-risk-terms`, `sec-segmentation`, `attack-dos`, `attack-layer2`, `attack-redirection`, `attack-social`, `attack-malware`, `defense-hardening`, `defense-nac`, `defense-rules-zones`.

Network+ Domain 5 (`network-plus/d5-network-troubleshooting.json`, 117 terms): `ts-method-steps`, `ts-method-techniques`, `cable-signal`, `cable-faults`, `interface-issues`, `interface-hardware`, `svc-issue-stp-roles`, `svc-issue-stp-states`, `svc-issue-routing`, `svc-issue-config`, `perf-network`, `perf-wireless`, `tool-commands-reachability`, `tool-commands-host`, `tool-software`, `tool-hardware`, `tool-device-show`.

Security+ Domain 1 (`security-plus/d1-general-security-concepts.json`, 96 terms): `concepts-cia`, `concepts-aaa`, `concepts-principles`, `control-categories`, `control-types`, `change-planning`, `change-execution`, `change-technical`, `pki-keys`, `certificate-trust`, `certificate-lifecycle`, `encryption-levels`, `encryption-types`, `crypto-tools`, `obfuscation`, `hashing`. Obfuscation, tokenization, and data masking are tagged 1.3 and 3.3, so the Domain 3 file does not repeat them.

Security+ Domain 2 (`security-plus/d2-threats-vulnerabilities-attacks.json`, 189 terms): `threat-actors`, `threat-actor-attributes`, `threat-motives-gain`, `threat-motives-cause`, `threat-intel-sources`, `vuln-scoring`, `threat-vector-message`, `threat-vector-file`, `threat-vector-browser`, `threat-vector-network`, `threat-supply-chain`, `threat-vector-devices`, `attack-physical-entry`, `attack-wireless-signal`, `vuln-system-state`, `vuln-app-code`, `vuln-attack-surfaces`, `attack-malware-delivery`, `attack-malware-payload`, `attack-network-traffic`, `attack-phishing`, `attack-social-tactics`, `indicator-artifacts`, `indicator-behavior`, `attack-app-injection`, `attack-app-abuse`, `attack-credential`, `ai-attacks`, `ai-risks`.

Security+ Domain 3 (`security-plus/d3-security-architecture.json`, 121 terms): `arch-cloud`, `arch-infrastructure`, `arch-considerations`, `infra-design`, `infra-zero-trust`, `infra-remote`, `infra-identity`, `data-types-states`, `data-classifications`, `data-methods`, `data-roles`, `data-handling`, `data-lifecycle`, `data-compliance`, `resilience-sites`, `resilience-redundancy`, `resilience-power`, `resilience-backups`, `resilience-continuity`, `resilience-metrics`.

Security+ Domain 4 (`security-plus/d4-security-operations.json`, 228 terms): `ops-mitigation`, `ops-deception`, `ops-ids`, `ops-firewall`, `ops-content-filter`, `ops-endpoint`, `ops-nac`, `ops-appsec`, `ops-email`, `asset-lifecycle`, `asset-records`, `asset-disposal`, `vm-identify`, `vm-response`, `vm-reporting`, `monitor-resources`, `monitor-activities`, `monitor-tools`, `monitor-protocols`, `iam-lifecycle`, `iam-account-types`, `iam-federation`, `iam-mfa`, `iam-access-models`, `iam-access-mgmt`, `iam-password-tools`, `iam-password-rules`, `auto-use-cases`, `auto-devops`, `auto-ai`, `ir-preparation`, `ir-identification`, `ir-response`, `ir-post`, `ir-notification`, `inv-forensics`, `inv-log-access`, `inv-log-sources`, `inv-data-sources`, `inv-evidence`.

Security+ Domain 5 (`security-plus/d5-security-program-management.json`, 136 terms): `gov-artifacts`, `gov-guidance`, `gov-standards`, `gov-policies-org`, `gov-policies-data`, `risk-process`, `risk-analysis`, `risk-treatment`, `vendor-selection`, `vendor-agreements`, `vendor-oversight`, `compliance-programs`, `compliance-consequences`, `compliance-privacy`, `compliance-legal`, `audit-internal`, `audit-external`, `audit-evidence`, `audit-pentest`, `audit-recon-frameworks`, `awareness-training`, `awareness-delivery`, `awareness-topics`.

A Security+ term that more than one objective names has one record, in the file of its main objective, tagged with every objective (for example Snapshot 3.4 and 4.8, Service account 4.5 and 3.2, Simulation exercise 3.4 and 4.7). The concepts Business continuity and Disaster recovery (3.4) and their plans (5.1) are separate records.

## How the acronym files were made

1. `tools/extract/seed_acronyms.py <cert>` seeded one record per official acronym from `sources-text/derived/<cert>-acronyms.md` and mapped it to the objectives that name it. It does not overwrite an existing file.
2. By hand: corrected expanded forms where the official list has errors or the two A+ lists differ (each one has a `note`), added objective links the seed missed, and added the extras.
3. Extras (`official: false`) are kept only when a current book uses them (A+: Exam Cram 2e or Docter; Network+: Exam Cram or West), their topic is a current objective, they are not obsolete, and the books agree on the expanded form. Security+ has no SY0-801 book, so its extras (80) come from the four SY0-701 books, only where the SY0-801 objectives still cover the topic (2026-10-30). Its official list is short (106) and leaves out common acronyms that the objectives name in full, for example AES, ACL, and RADIUS.

## Pool question (exam modules)

```json
{
  "id": "core1-q-examcram-04-03",
  "type": "single",
  "structure": "recall",
  "qualifier": null,
  "exam": "220-1201",
  "domain": "2",
  "objectives": ["220-1201/2.1"],
  "topics": ["220-1201/2.1.1"],
  "stem": "Which port does Remote Desktop Protocol use by default?",
  "options": ["22", "443", "3389", "5900"],
  "answer": [2],
  "selectCount": 1,
  "fixedOrder": false,
  "explanation": "Remote Desktop Protocol listens on TCP port 3389 by default. Firewalls must allow this port for RDP sessions to reach the host.",
  "whyWrong": ["Port 22 is SSH.", "Port 443 is HTTPS.", null, "Port 5900 is VNC."],
  "origin": "book",
  "source": "CompTIA A+ Exam Cram 2e – Chapter 4, Cram Quiz question 3"
}
```

| Field | Meaning |
|---|---|
| `id` | Stable key: `<module>-q-<book>-<chapter>-<n>` for a book question, `<module>-q-w-<objective>-<n>` for a written one. |
| `type` | `single` (one answer) or `multiple` (`selectCount` answers, "Choose two"). New types (PBQs) are added later as new values, each with its own code. |
| `structure` | `recall`, `select-item`, `scenario`, `procedure`, or `calculation` (the overview's question structures). Pool questions with `scenario` fill part of an attempt's scenario share. |
| `qualifier` | `BEST`, `FIRST`, `NEXT`, `MOST LIKELY`, `LEAST`, or `null`. The word is in capitals in the stem. |
| `exam`, `domain` | The exam code and the domain id. The domain matches the file (`d2.json` → `"2"`). |
| `objectives` | At least one, `<exam>/<objective>`, all in `domain`. |
| `topics` | At least one, `<exam>/<objective>.<n>`: the n-th topic under the objective in the official objectives file. A topic is a top-level bullet, a numbered step (the malware removal steps of Core 2 2.6), or a table (the Network+ 1.4 ports table is one topic). `check_questions.py --topics <code>` prints the numbered list. |
| `stem`, `options` | The question and its options (2–8). For a book question, as the book has them. |
| `answer` | The indexes of the correct options. One for `single`, `selectCount` for `multiple`. |
| `selectCount` | The number of answers to select. |
| `fixedOrder` | `true` when the options must keep their order (for example "All of the above"). Else the app shuffles them. |
| `explanation` | Why the correct answer is correct: 2–5 sentences. For a book question, the book's explanation. |
| `whyWrong` | One entry for each option, in the same order: 1 sentence for a wrong option, `null` for a correct one. |
| `origin` | `book` (copied from a book, with the book's answers) or `written` (written from a chapter). |
| `answerOrigin` | Optional: `written` when the book gives no answer and we wrote it from the chapter. |
| `source` | Book, chapter, and question number (for `written`: book and chapter). |
| `note` | Optional. For an older-objective book question: the old objective and why the current objective was chosen. Not shown in the app. |
| `sourceUrls`, `verified` | Only for a record written from online sources (Security+ SY0-801 topics that no book covers; also allowed on acronym and definition records): `sourceUrls` lists the pages of the facts, and `verified` is `false` until the verification pass checks the record against at least two independent sources, then the date (`"2026-11-02"`). `source` names the main page. An exam cannot be activated while a record has `verified: false`. |

Rules: copy every book practice question for the exam (older-objective books too, as they are); keep one copy of a question that is in two books; every topic has at least 1 question (2 is the target); each exam has at least 800.

## Scenario record (exam modules)

```json
{
  "id": "core1-s-printer-driver",
  "kind": "fault",
  "exam": "220-1201",
  "domain": "5",
  "objectives": ["220-1201/5.6"],
  "topics": ["220-1201/5.6.1"],
  "settings": ["office", "home-office"],
  "devices": ["laser-printer", "inkjet-printer"],
  "clues": ["pages print with strange symbols", "only jobs from one PC print badly", "a test page from the printer panel prints correctly"],
  "answer": { "cause": "a corrupt or wrong printer driver", "action": "Reinstall the correct printer driver" },
  "firstStep": "Print a test page from the printer's own panel",
  "appliesWhen": "the driver on the PC is corrupt or is for a different model",
  "explanation": "Garbled output from one PC while the printer's own test page is clean puts the fault in that PC's print path. The driver turns the job into the printer's language, so a corrupt or wrong driver sends data the printer cannot read. Reinstalling the correct driver fixes it.",
  "related": ["core1-s-print-spooler", "core1-s-default-printer", "core1-s-toner-low"],
  "origin": "written",
  "source": "CompTIA A+ Complete Study Guide (Docter) – Core 1 Chapter 13"
}
```

| Field | Meaning |
|---|---|
| `id` | Stable key: `<module>-s-<slug>`. |
| `kind` | `fault`, `requirement`, `procedure`, or `calculation`. Selects the generator. |
| `exam`, `domain`, `objectives`, `topics` | As in the pool question. The objectives are scenario objectives. |
| `settings`, `devices` | Optional. Grammar rule names that fit the record (for example `office`, `laser-printer`). The generator selects one of each for `#setting#` and `#device#`; without them it uses the shared `setting` and `device` rules. |
| `clues` | `fault` and `requirement`: 3–6 symptoms (`fault`) or conditions (`requirement`) as lower-case clauses ("pages print with strange symbols"). The generator selects 2–3 (`fault`) or 1–2 (`requirement`). A clue never gives away the answer. |
| `answer` | `fault`: `cause` and `action`. `requirement`: `item` (the tool, setting, command, device, or method). `procedure`: not used (see `steps`). `calculation`: not used. |
| `firstStep` | `fault` only, optional: the FIRST thing to check. Without it the record is not used for FIRST step questions. |
| `task`, `steps` | `procedure` only. `task`: the procedure after "is" ("removing malware from a workstation"). `steps`: at least 4 steps in order, each `{ "do": "Quarantine the infected system", "done": "quarantined the infected system" }` (`done` follows "The technician has"). FIRST step questions need 4 steps; NEXT step questions need 5. |
| `need`, `itemType` | `requirement` only. `need`: what the person must do, after "needs to" ("encrypt every drive on the company laptops"). `itemType`: what the answer is, for the question ("tool", "command", "setting", "feature"). |
| `calculation`, `prefixMin`, `prefixMax` | `calculation` only: the calculation (`subnet-hosts`, `subnet-mask`, `network-address`, `broadcast-address`) and the IPv4 prefix lengths to choose from (8–30). The code works out the values, the distractors, and the explanation. |
| `appliesWhen` | When this record's answer is the right one, as a phrase. When the record's answer is a distractor, its 1-sentence explanation is made from this phrase. |
| `explanation` | Why the answer fits the clues: 1–3 sentences. The generator adds a sentence that links the selected clues (and for a FIRST step question, one more), so the asked question has 2–5. |
| `related` | `fault` and `requirement`: at least 3 records of the same exam and kind with different answers. Their answers are the distractors. |
| `origin`, `source` | `written`, and the book and chapter of the facts. |
| `sourceUrls`, `verified` | As for pool questions: only for a record written from online sources. |

## Grammar files (exam modules)

`content/shared/grammar.json` and `content/<module>/grammar.json` are JSON objects: each key is a rule name, and each value is a list of phrasings. The app merges the shared file and the exam's file; a rule in both takes the exam's phrasings. The shared file has the sentence frames the generators use (`faultOpening`, `askCause`, `askAction`, `askFirst`, `requirementOpening`, `askItem`, `procedureOpening`, `askNext`, `calculationOpening`, the `wrong…` and `link…` frames) and the noun pools (`person`, `role`, `firstName`, `tech`, `setting` and its place rules, `device`). The generators bind `#fits#`, `#clues#`, `#need#`, `#conditions#`, `#itemType#`, `#task#`, `#done#`, and `#order#` from the record. Write the qualifier words (BEST, FIRST, NEXT, MOST LIKELY, LEAST) in capitals in the `ask…` frames: the app reads them from the stem.

```json
{
  "person": ["#firstName#, a #role#,", "a #role# named #firstName#"],
  "role": ["sales manager", "receptionist", "graphic designer"],
  "firstName": ["Ana", "Sam", "Priya"],
  "office": ["a small accounting office", "a dental clinic"]
}
```

`#rule#` is replaced by one phrasing of that rule, chosen by the seeded generator. Modifiers: `#rule.a#` adds "a" or "an", `#rule.capitalize#` starts with a capital. Every `#rule#` must name a rule that exists. A phrasing never contains an answer.
