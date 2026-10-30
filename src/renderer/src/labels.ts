import type { CertificationConfig, ExamConfig, ExerciseConfig, QuestionTypeConfig } from '@shared/types'

/** "CompTIA A+" when every exam is selected, else "CompTIA A+ (Core 1)". */
export function selectionLabel(
  cert: CertificationConfig,
  selected: readonly string[],
  exams: readonly ExamConfig[]
): string {
  if (cert.exams.every((e) => selected.includes(e))) return cert.shortName
  const names = selected.map((code) => exams.find((e) => e.id === code)?.shortName ?? code)
  return `${cert.shortName} (${names.join(' and ')})`
}

/**
 * The exam attempt's title: "CompTIA A+ Core 1 Exam (220-1201)". Words that end the certification
 * name and start the exam name are said once: "CompTIA Network+ Exam (N10-009)".
 */
export function attemptTitle(certName: string, exam: { name: string; id: string }): string {
  const cert = certName.split(' ').filter(Boolean)
  const name = exam.name.split(' ')
  let overlap = Math.min(cert.length, name.length)
  while (overlap > 0 && cert.slice(-overlap).join(' ') !== name.slice(0, overlap).join(' ')) overlap--
  return [...cert, ...name.slice(overlap), `(${exam.id})`].join(' ')
}

/** "Core 1 (220-1201)" */
export function examLabel(exam: ExamConfig): string {
  return `${exam.shortName} (${exam.id})`
}

/** What one kind of question asks, for the setup screen. */
export function questionTypeLabel(qt: QuestionTypeConfig): string {
  if (qt.type === 'typed')
    return qt.prompt === 'acronym'
      ? 'Type the expanded form of each acronym'
      : 'Type the term for each definition'
  return `Multiple choice (${qt.choices} choices)`
}

/** The record noun for counts: "222 acronyms", "924 terms". */
export function recordNoun(exercise: ExerciseConfig, count: number): string {
  const noun = exercise.content === 'acronyms' ? 'acronym' : 'term'
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

/** mm:ss */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  return [Math.floor(s / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':')
}
