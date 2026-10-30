import type { ExamQuestion, QuestionType } from '@shared/exam'
import { multiple } from './multiple'
import { single } from './single'

/** The code for one question type. A new type (for example a PBQ) adds a handler here. */
export interface QuestionTypeHandler {
  /** Points for the confirmed answer, from 0 to 1. */
  credit(question: ExamQuestion, selected: readonly number[] | null): number
}

export const questionTypes: Record<QuestionType, QuestionTypeHandler> = { single, multiple }
