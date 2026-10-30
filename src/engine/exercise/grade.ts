import { normalizeAnswer } from '../normalize'
import type { SpellChecker } from '../spell'
import type { AnswerResult, MultipleChoiceQuestion, TypedQuestion } from './types'

/** Correct only when the text matches an accepted answer and has no spelling error. No close matches. */
export function gradeTyped(
  question: TypedQuestion,
  text: string,
  spell: SpellChecker
): Extract<AnswerResult, { status: 'answered' }> {
  const misspelled = spell.misspelled(text)
  const typed = normalizeAnswer(text)
  const matches = question.accepted.some((a) => normalizeAnswer(a) === typed)
  return { status: 'answered', text, correct: matches && misspelled.length === 0, misspelled }
}

export function gradeChoice(
  question: MultipleChoiceQuestion,
  choice: number
): Extract<AnswerResult, { status: 'chosen' }> {
  return { status: 'chosen', choice, correct: choice === question.correctIndex }
}

export function isCorrect(result: AnswerResult): boolean {
  return (result.status === 'answered' || result.status === 'chosen') && result.correct
}

export interface ExerciseSummary {
  total: number
  correct: number
  /** Includes "Not sure" and unanswered questions. */
  incorrect: number
  /** Incorrect answers with at least one misspelled word. */
  spellingErrors: number
  percent: number
}

export function summarize(results: readonly AnswerResult[]): ExerciseSummary {
  const correct = results.filter(isCorrect).length
  const spellingErrors = results.filter(
    (r) => r.status === 'answered' && !r.correct && r.misspelled.length > 0
  ).length
  const total = results.length
  return {
    total,
    correct,
    incorrect: total - correct,
    spellingErrors,
    percent: total === 0 ? 0 : Math.round((correct / total) * 100)
  }
}
