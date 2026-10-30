// Shapes of the configs in config/. The field rules are in content/README.md.

export interface ObjectiveConfig {
  /** For example "2.6". */
  id: string
  /** "scenario" when the objective title starts with "Given a scenario", else "knowledge". */
  kind: 'scenario' | 'knowledge'
}

export interface DomainConfig {
  /** "1", "2", … — the first number of an objective id. */
  id: string
  name: string
  /** Percent of the exam. */
  weight: number
  /** Every objective of the domain, in order. */
  objectives: ObjectiveConfig[]
}

/** config/exams/<code>.json. How to get each value: docs/exam-modules.md. */
export interface ExamConfig {
  /** The exam code, for example "220-1201". */
  id: string
  certification: string
  name: string
  /** Short label, for example "Core 1". */
  shortName: string
  active: boolean
  /** The exam module's folder in content/, for example "core1". */
  content: string
  /** Each attempt selects a count in this range. */
  questionCount: { min: number; max: number }
  timeLimitMinutes: number
  passingScore: number
  /** The top of the score scale, for example 900. */
  maxScore: number
  /** Estimated percent of scenario-based questions. */
  scenarioShare: number
  /** Percent of the scenario questions that the generator writes; the rest come from the pool. */
  generatedScenarioShare: number
  domains: DomainConfig[]
}

export interface CertificationConfig {
  id: string
  name: string
  /** Short label, for example "CompTIA A+". */
  shortName: string
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
  description?: string
  /** Shows a "Not sure" button on typed questions. */
  notSure?: boolean
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
  exams: ExamConfig[]
  exercises: ExerciseConfig[]
}

// Content records in content/. The field rules are in content/README.md.

interface ContentRecordBase {
  id: string
  acceptedAnswers: string[]
  certifications: string[]
  exams: string[]
  /** "<exam>/<objective>", for example "220-1201/2.1". */
  objectives: string[]
}

export interface AcronymRecord extends ContentRecordBase {
  acronym: string
  expanded: string
  meaning: string
}

export interface DefinitionRecord extends ContentRecordBase {
  term: string
  definition: string
  typeable: boolean
  group: string
  /**
   * The acronyms of the term, from content/acronyms/ (same certification, where the expanded form or
   * an accepted answer is the term). Not in the content files: the app links them when it loads.
   * A typed answer may be the acronym.
   */
  acronyms?: string[]
}

export interface ContentByKind {
  acronyms: AcronymRecord[]
  definitions: DefinitionRecord[]
}

export type ContentKind = keyof ContentByKind

/** The Hunspell dictionary and the extra words from content/, for the spell checker. */
export interface SpellData {
  aff: string
  dic: string
  words: string[]
}
