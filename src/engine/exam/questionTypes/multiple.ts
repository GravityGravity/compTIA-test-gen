import type { QuestionTypeHandler } from './index'

/**
 * "Choose two" and similar: part credit (selected correct / total correct), but only when no wrong
 * option is selected. Any wrong option gives 0.
 */
export const multiple: QuestionTypeHandler = {
  credit: (question, selected) => {
    if (!selected || selected.length === 0) return 0
    if (selected.some((k) => !question.answer.includes(k))) return 0
    return selected.length / question.answer.length
  }
}
