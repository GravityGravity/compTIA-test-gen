# Product Requirement Document
## Purpose
Provide a way to prepare users for compTIA A+ core 1 and compTIA A+ core 2 exams.

## Problem
There is a lack of locally ran applications that generate practice tests and excercises for the compTIA A+ core exams.

## Goals
- Application is ran locally
- Simulate compTIA A+ core exams environment
- Provide capability to review exam attempts
- Provide reasoning for correct answers and incorrect answers.
- Create excercises to practice term definition and ACRONYM expanded form.

## Requirements

- multiple choice only questions for exams.
- Exam attempts are graded
- Persistent Storage of Exam attempts (not included for definition excercises)
- Correct answers have in-dephth explanations
- Incorrect answers have short explanations
- Separate module selection, one for compTIA core+ 1 exams, one for compTIA core+ 2 exams (same module structure as one), and an Acronym/Definition module (different module structure)
- Simulate compTIA core exam environment with timers, question structures, and mimiced UI.
- Dynamically generate / change certain question type structures to prevent user memorization of question structures.
- The application must not have user accounts. Each local installation must keep its own data and settings
- Language: English Only


### TEMP POINTS:
- Modules have their own folders to store persistent data
- three moudles (A+ core1 exam, A+ core 2 exam, acronym and definition practice)
- A+ core 1 exam, A+ core 2 exam will have similar module structure but different testing content.
- Application will mimic topics and question structures (answers multiple-choice only)
- During exam attempts, exam UI will mimic the exam UI reference in the references folder.
- During development, creating question pools / generating questions and generating exams should follow exam structures given in coreAexamguide.md file.