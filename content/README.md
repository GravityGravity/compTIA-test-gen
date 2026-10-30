# Content

The records that the app uses. The app does not read the books; the books in `sources-text/` help write these files. Run `tools/extract/check_content.py` after every change.

| Folder | Module | Files |
|---|---|---|
| `acronyms/` | Acronym Exercise | `a-plus.json`, `network-plus.json` – one file for each certification |
| `definitions/` | Definition Exercise | `a-plus/`, `network-plus/` – one file for each exam domain |
| `core1/`, `core2/`, `network/` | Exam modules | Not built yet |

Each file is a JSON array of records. The app reads every `*.json` under a module's folder, so the file split is only for review. The domain of a record comes from its `objectives`, not from the file name.

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
| `id` | Stable key: `aplus-acr-…` or `netplus-acr-…`. |
| `acronym` | Shown in the question. Keep the official capitals (`DoS`, `IPsec`). |
| `expanded` | The correct expanded form, as the objectives and current books write it. The typed answer, and the answer the app shows after "Check answer". |
| `meaning` | One sentence, 10–25 words, in our own words: what the thing is or does, with key exam facts (for example a port number). Shown in the feedback box after the user answers. |
| `acceptedAnswers` | Other typed forms that are also correct, for example the official list's wording where it differs from `expanded`, or the long form of a short word in it (`Virtual LAN` / `Virtual Local Area Network`). The app compares typed answers after it removes case, extra spaces, and punctuation, and accepts no close matches, so every valid variant must be listed. |
| `certifications` | `["a-plus"]` or `["network-plus"]`. One certification per record: an acronym on both lists has one record in each file, because each record's source and objectives belong to its own certification. |
| `exams` | The exams whose acronym list (or objectives) have it: `220-1201`, `220-1202`, `N10-009`. |
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
| `acceptedAnswers` | Spelling variants of the term only. Never an acronym. |
| `typeable` | `false`: multiple choice only (the term cannot fairly be typed from memory). |
| `group` | Topic slug. Multiple-choice distractors come from the same group first, so they are plausible. A group with fewer than 4 records gets its other distractors from the same certification. A record with the same term or definition as the target is never a distractor. |
| `objectives` | At least one. |
| `origin` | `objectives` (named in an objective), `glossary` (from a book glossary and matched to an objective), or `book` (from a chapter). |

## Groups

Definition groups are listed here as each domain is written.

A+ Core 1 Domain 1 (`core1-d1-mobile-devices.json`): `mobile-hardware`, `physical-security`, `input-accessories`, `mobile-connections`, `cellular-location`, `mobile-management`.

A+ Core 1 Domain 2 (`core1-d2-networking.json`): `transport`, `web-mail-protocols`, `file-remote-protocols`, `wireless`, `server-roles`, `appliances-systems`, `dns-records`, `email-authentication`, `dhcp-configuration`, `network-devices`, `power-provider-equipment`, `ip-addressing`, `connection-types`, `network-types`, `networking-tools`.

## How the acronym files were made

1. `tools/extract/seed_acronyms.py <cert>` seeded one record per official acronym from `sources-text/derived/<cert>-acronyms.md` and mapped it to the objectives that name it. It does not overwrite an existing file.
2. By hand: corrected expanded forms where the official list has errors or the two A+ lists differ (each one has a `note`), added objective links the seed missed, and added the extras.
3. Extras (`official: false`) are kept only when a current book uses them (A+: Exam Cram 2e or Docter; Network+: Exam Cram or West), their topic is a current objective, they are not obsolete, and the books agree on the expanded form.
