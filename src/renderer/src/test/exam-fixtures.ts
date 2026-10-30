import { gradeAttempt } from '@engine/exam/grade'
import type { Attempt, AttemptExam, AttemptSummary, ExamQuestion } from '@shared/exam'
import type { AttemptApi } from '../exam/ExamAttempt'
import { type Mock, vi } from 'vitest'

export const attemptExam: AttemptExam = {
  id: '220-1201',
  name: 'Core 1 Exam',
  shortName: 'Core 1',
  certification: 'a-plus',
  passingScore: 675,
  maxScore: 900,
  domains: [
    { id: '1', name: 'Mobile Devices' },
    { id: '2', name: 'Networking' }
  ]
}

const q = (stem: string, options: string[], answer: number[], domain: string): ExamQuestion => ({
  sourceId: stem,
  origin: 'pool',
  kind: null,
  type: answer.length > 1 ? 'multiple' : 'single',
  structure: 'recall',
  qualifier: null,
  domain,
  objectives: [],
  topics: [],
  stem,
  options,
  answer,
  selectCount: answer.length,
  explanation: `Explanation of ${stem}`,
  whyWrong: options.map((o, i) => (answer.includes(i) ? null : `${o} is wrong.`))
})

export const examQuestions: ExamQuestion[] = [
  q('Which port does RDP use?', ['3389', '22', '443', '25'], [0], '2'),
  q(
    'Which TWO are input devices? (Choose two.)',
    ['Stylus', 'Speaker', 'Keyboard', 'Projector'],
    [0, 2],
    '1'
  ),
  q('Which device forwards frames by MAC address?', ['Hub', 'Switch', 'Modem', 'Patch panel'], [1], '2')
]

export function inProgressAttempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    exam: attemptExam,
    seed: 1,
    status: 'in_progress',
    timeLimitS: 5400,
    timeLeftS: 5400,
    currentIndex: 0,
    startedAt: '2026-10-30T10:00:00.000Z',
    updatedAt: '2026-10-30T10:00:00.000Z',
    completedAt: null,
    questions: examQuestions,
    states: examQuestions.map((x) => ({
      selected: null,
      flagged: false,
      struck: x.options.map(() => false),
      seconds: 0
    })),
    result: null,
    ...overrides
  }
}

/** A completed attempt: question 1 right, question 2 partly right, question 3 wrong. */
export function completedAttempt(): Attempt {
  const a = inProgressAttempt()
  const states = a.states.map((s, i) => ({ ...s, selected: [[0], [0], [2]][i]! }))
  return {
    ...a,
    status: 'completed',
    timeLeftS: 5000,
    completedAt: '2026-10-30T11:00:00.000Z',
    states,
    result: gradeAttempt(attemptExam, a.questions, states, 400)
  }
}

export type FakeApi = { [K in keyof AttemptApi]: Mock<AttemptApi[K]> }

export function fakeApi(finished: Attempt = completedAttempt()): { api: FakeApi; requestClose: () => void } {
  let onClose: (() => void) | null = null
  const api: FakeApi = {
    saveAttempt: vi.fn<AttemptApi['saveAttempt']>(() => Promise.resolve()),
    finishAttempt: vi.fn<AttemptApi['finishAttempt']>(() => Promise.resolve(finished)),
    discardAttempt: vi.fn<AttemptApi['discardAttempt']>(() => Promise.resolve()),
    setAttemptOpen: vi.fn<AttemptApi['setAttemptOpen']>(),
    onCloseRequested: vi.fn<AttemptApi['onCloseRequested']>((listener) => {
      onClose = listener
      return () => {
        onClose = null
      }
    }),
    confirmClose: vi.fn<AttemptApi['confirmClose']>()
  }
  return { api, requestClose: () => onClose?.() }
}

export const summary = (overrides: Partial<AttemptSummary> = {}): AttemptSummary => ({
  id: '00000000-0000-4000-8000-000000000002',
  examId: '220-1201',
  examName: 'Core 1 Exam',
  status: 'completed',
  startedAt: '2026-10-27T08:00:00.000Z',
  updatedAt: '2026-10-27T09:12:00.000Z',
  completedAt: '2026-10-27T09:12:00.000Z',
  questionCount: 84,
  answered: 84,
  flagged: 0,
  currentIndex: 83,
  timeLeftS: 0,
  passingScore: 675,
  maxScore: 900,
  score: 712,
  passed: true,
  correct: 64,
  timeUsedS: 4900,
  ...overrides
})
