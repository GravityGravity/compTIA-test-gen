import type { WordSpan } from '../spell'

/** What the user picked on the setup screen. */
export interface ExerciseSelection {
  exerciseId: string
  certification: string
  /** The selected exam codes ("Both" selects all of them). */
  exams: string[]
}

/** Type the answer. Acronym Exercise: acronym → expanded form. Definition Exercise: definition → term. */
export interface TypedQuestion {
  kind: 'typed'
  recordId: string
  prompt: 'acronym' | 'definition'
  /** The acronym or definition that the question shows. */
  text: string
  /** The answer shown after "Check answer". */
  answer: string
  /** Every typed form that counts as correct (the answer first). */
  accepted: string[]
  /** Definition Exercise: the term's acronyms, which also count as correct. */
  acronyms?: string[]
  /** Acronym Exercise only: one sentence on what the acronym means. */
  meaning?: string
  objectives: string[]
}

export type Direction = 'term-to-definition' | 'definition-to-term'

/** Definition Exercise: select the definition of a term, or the term for a definition. */
export interface MultipleChoiceQuestion {
  kind: 'multiple-choice'
  recordId: string
  direction: Direction
  /** The term or definition that the question shows. */
  text: string
  options: string[]
  correctIndex: number
  /** The correct option. */
  answer: string
  /** The record's term and definition, for the feedback. */
  term: string
  definition: string
  objectives: string[]
}

export type ExerciseQuestion = TypedQuestion | MultipleChoiceQuestion

export type AnswerResult =
  | { status: 'unanswered' }
  | { status: 'unsure' }
  | { status: 'answered'; text: string; correct: boolean; misspelled: WordSpan[] }
  | { status: 'chosen'; choice: number; correct: boolean }
