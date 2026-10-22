| Layer | Tool | Reason |
|---|---|---|
| Desktop shell | Electron | It uses the same Chromium engine on Linux and Windows. The exam screens look and operate the same on the two systems. |
| Language | TypeScript | Use one language for the UI and the logic. |
| UI | React + Vite | Fast build. Familiar from full-stack work. |
| Local storage | SQLite (`better-sqlite3`) | One file on the disk. It keeps all exam attempts between sessions. |
| Packaging | electron-builder | Makes an `.exe` installer for Windows and an `.AppImage`/`.deb` for Linux. |
| Tests | Vitest | Test the question generator and the scoring logic. |

## Question generation (cognitive model)

The app builds scenario-based questions from a cognitive model. The app does not use a language model.

1. Keep fault records in JSON files. Each record has the cause, the symptoms, the correct action, and related faults.
2. Keep a set of question types, for example "most likely cause," "first step," and "next step."
3. For each question, the app selects one fault, two or three symptoms (random order), a setting, and a question type.
4. The app takes the distractors from the actions of related faults.
5. A sentence grammar (Tracery method) joins the parts. Each part has many phrasings, so the sentence structure changes.
6. Noun pools fill the placeholders (names, devices, offices).
7. A random generator with a seed controls all selections.
8. Save the full question text and answers with each attempt. This lets the user review the exact question after grading.

Example fault record:

```json
{
  "fault": "Failed printer driver",
  "domain": "Core 1 – Hardware and network troubleshooting",
  "symptoms": ["prints garbled text", "jobs stay in the queue", "printer shows ready"],
  "correctAction": "Reinstall the printer driver",
  "relatedFaults": ["Print spooler stopped", "Wrong default printer"]
}
```

## Database tables (minimum)

- `questions` – template ID, exam (Core 1 or Core 2), domain, correct answer.
- `attempts` – date, exam, score, time used.
- `attempt_answers` – attempt ID, question text, user answer, correct answer.
- `terms` – acronyms and definitions for the practice exercises.