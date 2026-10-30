import type { AttemptExam, AttemptResult, ExamQuestion, QuestionState } from '@shared/exam'
import { questionTypes } from './questionTypes'

export function credit(question: ExamQuestion, selected: readonly number[] | null): number {
  return questionTypes[question.type].credit(question, selected)
}

/** Fully correct: the selection is exactly the answer. */
export function isCorrect(question: ExamQuestion, selected: readonly number[] | null): boolean {
  return credit(question, selected) === 1
}

export type Verdict = 'correct' | 'partial' | 'incorrect' | 'unanswered'

export function verdict(question: ExamQuestion, selected: readonly number[] | null): Verdict {
  if (!selected || selected.length === 0) return 'unanswered'
  const c = credit(question, selected)
  return c === 1 ? 'correct' : c > 0 ? 'partial' : 'incorrect'
}

/**
 * Grades an attempt. Score = round(maxScore × points / questions). It passes at the passing score
 * or above. The domain breakdown counts fully correct questions (partly correct counts as incorrect).
 */
export function gradeAttempt(
  exam: AttemptExam,
  questions: readonly ExamQuestion[],
  states: readonly QuestionState[],
  timeUsedS: number
): AttemptResult {
  const credits = questions.map((q, i) => credit(q, states[i]?.selected ?? null))
  const points = credits.reduce((s, c) => s + c, 0)
  const score = questions.length === 0 ? 0 : Math.round((exam.maxScore * points) / questions.length)
  const domains = exam.domains.map((d) => {
    const mine = questions.map((q, i) => ({ q, c: credits[i]! })).filter(({ q }) => q.domain === d.id)
    return { id: d.id, name: d.name, correct: mine.filter(({ c }) => c === 1).length, total: mine.length }
  })
  return {
    points,
    score,
    passed: score >= exam.passingScore,
    correct: credits.filter((c) => c === 1).length,
    partial: credits.filter((c) => c > 0 && c < 1).length,
    timeUsedS,
    domains: domains.filter((d) => d.total > 0)
  }
}
