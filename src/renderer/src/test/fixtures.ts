import { words, type SpellChecker } from '@engine/spell'
import type { AcronymRecord, Catalog, ExamConfig, ExerciseConfig } from '@shared/types'
import type { MultipleChoiceQuestion, TypedQuestion } from '@engine/exercise/types'

/** A spell checker that knows only these words, for component tests. */
export function fakeSpell(known: string): SpellChecker {
  const dict = new Set(known.toLowerCase().split(' '))
  const isCorrect = (w: string) => dict.has(w.toLowerCase())
  return { isCorrect, misspelled: (text) => words(text).filter((s) => !isCorrect(s.word)) }
}

export const exams: ExamConfig[] = [
  {
    id: '220-1201',
    certification: 'a-plus',
    name: 'Core 1 Exam',
    shortName: 'Core 1',
    active: false,
    domains: [
      { id: '1', name: 'Mobile Devices', weight: 50 },
      { id: '2', name: 'Networking', weight: 50 }
    ]
  },
  {
    id: '220-1202',
    certification: 'a-plus',
    name: 'Core 2 Exam',
    shortName: 'Core 2',
    active: false,
    domains: [{ id: '1', name: 'Operating Systems', weight: 100 }]
  },
  {
    id: 'N10-009',
    certification: 'network-plus',
    name: 'Network+ Exam',
    shortName: 'Network+',
    active: false,
    domains: [{ id: '1', name: 'Networking Concepts', weight: 100 }]
  }
]

export const acronymExercise: ExerciseConfig = {
  id: 'acronym-exercise',
  name: 'Acronym Exercise',
  description: 'Type the expanded form of each acronym from memory.',
  notSure: true,
  active: true,
  content: 'acronyms',
  certifications: ['a-plus', 'network-plus'],
  questionCount: 2,
  timeLimitMinutes: 12,
  onTimeUp: 'end',
  selection: 'random',
  questionTypes: [{ type: 'typed', prompt: 'acronym', answer: 'expanded', count: 2 }]
}

export const catalog: Catalog = {
  certifications: [
    {
      id: 'a-plus',
      name: 'CompTIA A+ (Core 1 and Core 2)',
      shortName: 'CompTIA A+',
      active: true,
      exams: ['220-1201', '220-1202']
    },
    {
      id: 'network-plus',
      name: 'CompTIA Network+ (N10-009)',
      shortName: 'CompTIA Network+',
      active: true,
      exams: ['N10-009']
    }
  ],
  exams,
  exercises: [acronymExercise]
}

const record = (acronym: string, expanded: string, exams: string[], cert = 'a-plus'): AcronymRecord => ({
  id: `acr-${acronym}`,
  acronym,
  expanded,
  meaning: `${acronym} meaning.`,
  acceptedAnswers: [],
  certifications: [cert],
  exams,
  objectives: []
})

export const records: AcronymRecord[] = [
  record('DNS', 'Domain Name System', ['220-1201', '220-1202']),
  record('BIOS', 'Basic Input/Output System', ['220-1201']),
  record('EFS', 'Encrypting File System', ['220-1202']),
  record('VLAN', 'Virtual Local Area Network', ['N10-009'], 'network-plus')
]

export const questions: TypedQuestion[] = [
  {
    kind: 'typed',
    recordId: 'dns',
    prompt: 'acronym',
    text: 'DNS',
    answer: 'Domain Name System',
    accepted: ['Domain Name System'],
    meaning: 'DNS translates host names into IP addresses, using port 53.',
    objectives: ['220-1201/2.1', '220-1201/2.3', '220-1201/2.4', '220-1202/1.1', '220-1202/1.2']
  },
  {
    kind: 'typed',
    recordId: 'kvm',
    prompt: 'acronym',
    text: 'KVM',
    answer: 'Keyboard-Video-Mouse',
    accepted: ['Keyboard-Video-Mouse'],
    meaning: 'A KVM switch lets one keyboard, monitor, and mouse control several computers.',
    objectives: []
  }
]

export const definitionExercise: ExerciseConfig = {
  id: 'definition-exercise',
  name: 'Definition Exercise',
  active: true,
  content: 'definitions',
  certifications: ['a-plus'],
  questionCount: 2,
  timeLimitMinutes: 15,
  onTimeUp: 'end',
  selection: 'random',
  questionTypes: [
    {
      type: 'multiple-choice',
      direction: 'random',
      directions: ['term-to-definition', 'definition-to-term'],
      choices: 4,
      count: 1
    },
    { type: 'typed', prompt: 'definition', answer: 'term', requires: 'typeable', count: 1 }
  ]
}

export const choiceQuestion: MultipleChoiceQuestion = {
  kind: 'multiple-choice',
  recordId: 'raid-5',
  direction: 'term-to-definition',
  text: 'RAID 5',
  options: [
    'Mirrors two drives.',
    'Stripes data and parity across three or more drives.',
    'Stripes with no parity.',
    'Mirrored stripes.'
  ],
  correctIndex: 1,
  answer: 'Stripes data and parity across three or more drives.',
  term: 'RAID 5',
  definition: 'Stripes data and parity across three or more drives.',
  objectives: ['220-1201/3.4']
}

export const typedDefinition: TypedQuestion = {
  kind: 'typed',
  recordId: 'firewall',
  prompt: 'definition',
  text: 'A device or program that allows or blocks traffic based on rules.',
  answer: 'Firewall',
  accepted: ['Firewall', 'FW'],
  acronyms: ['FW'],
  objectives: []
}
