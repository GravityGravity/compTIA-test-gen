import type { ExamConfig } from '@shared/types'

export const MAX_TAGS = 3

/** "220-1201/2.1" → "Core 1 · 2.1 Networking". The names come from the exam config. */
export function objectiveLabel(objective: string, exams: readonly ExamConfig[]): string {
  const [code = '', number = ''] = objective.split('/')
  const exam = exams.find((e) => e.id === code)
  if (!exam) return objective
  const domain = exam.domains.find((d) => d.id === number.split('.')[0])
  return [`${exam.shortName} · ${number}`, domain?.name].filter(Boolean).join(' ')
}

/** At most MAX_TAGS labels, then the number of the rest. */
export function objectiveTags(
  objectives: readonly string[],
  exams: readonly ExamConfig[]
): { shown: string[]; hidden: string[] } {
  const labels = objectives.map((o) => objectiveLabel(o, exams))
  return { shown: labels.slice(0, MAX_TAGS), hidden: labels.slice(MAX_TAGS) }
}
