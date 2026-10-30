import type { QuestionTypeHandler } from './index'

/** One correct option: full credit for it, nothing else. */
export const single: QuestionTypeHandler = {
  credit: (question, selected) => (selected?.length === 1 && question.answer.includes(selected[0]!) ? 1 : 0)
}
