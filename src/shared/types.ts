// Shapes of the configs in config/. The field rules are in content/README.md.

export interface CertificationConfig {
  id: string
  name: string
  active: boolean
  /** Exam codes in picker order. */
  exams: string[]
}

export type QuestionTypeConfig =
  | {
      type: 'typed'
      prompt: 'acronym' | 'definition'
      answer: 'expanded' | 'term'
      requires?: 'typeable'
      count: number
    }
  | {
      type: 'multiple-choice'
      direction: 'random' | 'term-to-definition' | 'definition-to-term'
      directions?: Array<'term-to-definition' | 'definition-to-term'>
      choices: number
      count: number
    }

export interface ExerciseConfig {
  id: string
  name: string
  active: boolean
  content: 'acronyms' | 'definitions'
  certifications: string[]
  questionCount: number
  timeLimitMinutes: number
  onTimeUp: 'end'
  selection: 'random'
  questionTypes: QuestionTypeConfig[]
}

/** Everything the UI needs to list the modules. */
export interface Catalog {
  certifications: CertificationConfig[]
  exercises: ExerciseConfig[]
}
