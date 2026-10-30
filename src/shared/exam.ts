// Exam module shapes that main, preload, renderer, and the engine share.
// The content record formats are in content/README.md; the method is in docs/exam-modules.md.

/** How a question is answered. PBQ types are added later as new values, each with its own code. */
export type QuestionType = 'single' | 'multiple'

/** The question structures of docs/compTIA-exam-overviews.md. */
export type Structure = 'recall' | 'select-item' | 'scenario' | 'procedure' | 'calculation'

export type Qualifier = 'BEST' | 'FIRST' | 'NEXT' | 'MOST LIKELY' | 'LEAST'

/** content/<module>/pool/d<N>.json */
export interface PoolQuestion {
  id: string
  type: QuestionType
  structure: Structure
  qualifier: Qualifier | null
  exam: string
  domain: string
  objectives: string[]
  topics: string[]
  stem: string
  options: string[]
  /** Indexes of the correct options. */
  answer: number[]
  selectCount: number
  /** True: the options keep their order (for example "All of the above"). */
  fixedOrder: boolean
  explanation: string
  /** One entry per option: a sentence for a wrong option, null for a correct one. */
  whyWrong: (string | null)[]
  origin: 'book' | 'written'
  source: string
}

export type ScenarioKind = 'fault' | 'requirement' | 'procedure' | 'calculation'

interface ScenarioBase {
  id: string
  kind: ScenarioKind
  exam: string
  domain: string
  objectives: string[]
  topics: string[]
  /** Grammar rule names: the generator picks one of each. */
  settings: string[]
  devices: string[]
  explanation: string
  origin: 'written'
  source: string
}

export interface FaultRecord extends ScenarioBase {
  kind: 'fault'
  clues: string[]
  answer: { cause: string; action: string }
  firstStep?: string
  appliesWhen: string
  related: string[]
}

export interface RequirementRecord extends ScenarioBase {
  kind: 'requirement'
  /** What the person must do, as a phrase: "encrypt every drive on the company laptops". */
  need: string
  clues: string[]
  /** The tool, setting, command, device, or method. */
  answer: { item: string }
  /** What the answer is, for the question: "tool", "command", "setting". */
  itemType: string
  appliesWhen: string
  related: string[]
}

export interface ProcedureStep {
  /** The step as an instruction: "Quarantine the infected system". */
  do: string
  /** The step as done, after "has": "quarantined the infected system". */
  done: string
}

export interface ProcedureRecord extends ScenarioBase {
  kind: 'procedure'
  /** The procedure, after "is": "removing malware from a workstation". */
  task: string
  steps: ProcedureStep[]
}

export type CalculationName = 'subnet-hosts' | 'subnet-mask' | 'network-address' | 'broadcast-address'

export interface CalculationRecord extends ScenarioBase {
  kind: 'calculation'
  calculation: CalculationName
  /** The prefix lengths to choose from, both included. */
  prefixMin: number
  prefixMax: number
}

export type ScenarioRecord = FaultRecord | RequirementRecord | ProcedureRecord | CalculationRecord

/** Grammar rule name → phrasings. */
export type Grammar = Record<string, string[]>

/** Everything the engine needs to build attempts for one exam. */
export interface ExamContent {
  pool: PoolQuestion[]
  scenarios: ScenarioRecord[]
  /** The shared grammar merged with the exam's grammar (the exam's rules win). */
  grammar: Grammar
}

/** A question as it is asked and saved with an attempt: the full text, in the order shown. */
export interface ExamQuestion {
  /** The pool question id or the scenario record id. */
  sourceId: string
  origin: 'pool' | 'generated'
  /** The scenario kind of a generated question, else null. */
  kind: ScenarioKind | null
  type: QuestionType
  structure: Structure
  qualifier: Qualifier | null
  domain: string
  objectives: string[]
  topics: string[]
  stem: string
  options: string[]
  answer: number[]
  selectCount: number
  explanation: string
  whyWrong: (string | null)[]
}

/** The user's work on one question. */
export interface QuestionState {
  /** The confirmed answer (option indexes, sorted), or null. */
  selected: number[] | null
  flagged: boolean
  /** Eliminated options. */
  struck: boolean[]
  /** Seconds spent on the question. */
  seconds: number
}

export interface DomainResult {
  id: string
  name: string
  correct: number
  total: number
}

export interface AttemptResult {
  points: number
  score: number
  passed: boolean
  correct: number
  partial: number
  timeUsedS: number
  domains: DomainResult[]
}

/** The exam values saved with an attempt, so a review shows them as they were. */
export interface AttemptExam {
  id: string
  name: string
  shortName: string
  certification: string
  passingScore: number
  maxScore: number
  domains: { id: string; name: string }[]
}

export interface Attempt {
  id: string
  exam: AttemptExam
  seed: number
  status: 'in_progress' | 'completed'
  timeLimitS: number
  timeLeftS: number
  currentIndex: number
  startedAt: string
  updatedAt: string
  completedAt: string | null
  questions: ExamQuestion[]
  states: QuestionState[]
  result: AttemptResult | null
}

/** A row in the attempt lists. */
export interface AttemptSummary {
  id: string
  examId: string
  examName: string
  status: 'in_progress' | 'completed'
  startedAt: string
  updatedAt: string
  completedAt: string | null
  questionCount: number
  answered: number
  flagged: number
  currentIndex: number
  timeLeftS: number
  passingScore: number
  maxScore: number
  score: number | null
  passed: boolean | null
  correct: number | null
  timeUsedS: number | null
}

/** What the renderer sends to autosave an attempt. */
export interface AttemptProgress {
  timeLeftS: number
  currentIndex: number
  states: QuestionState[]
}
