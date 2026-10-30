import { useCallback, useEffect, useRef, useState } from 'react'
import { gradeChoice, gradeTyped, isCorrect } from '@engine/exercise/grade'
import type { AnswerResult, ExerciseQuestion, MultipleChoiceQuestion } from '@engine/exercise/types'
import type { SpellChecker } from '@engine/spell'
import type { ExamConfig, ExerciseConfig } from '@shared/types'
import { Dialog } from '../components/Dialog'
import { ObjectiveTags } from '../components/ObjectiveTags'
import { TopBar } from '../components/TopBar'
import { TypedAnswer } from '../components/TypedAnswer'
import { clock } from '../labels'

/** The timer turns red in the last 5 minutes. */
const LOW_SECONDS = 300
const LETTERS = 'ABCDEFGH'

interface ExerciseScreenProps {
  exercise: ExerciseConfig
  /** For example "CompTIA A+". */
  certificationLabel: string
  questions: ExerciseQuestion[]
  exams: ExamConfig[]
  spell: SpellChecker
  onFinish: (results: AnswerResult[], timeUp: boolean) => void
  onLeave: () => void
  /** For tests: the clock. */
  now?: () => number
}

type Ask = 'end' | 'leave' | null

/** What each kind of question says above the prompt. */
function heading(question: ExerciseQuestion): { eyebrow: string; direction: string; ask: string } {
  if (question.kind === 'multiple-choice')
    return question.direction === 'term-to-definition'
      ? {
          eyebrow: 'Multiple choice',
          direction: 'Term to definition',
          ask: 'Select the definition of this term.'
        }
      : {
          eyebrow: 'Multiple choice',
          direction: 'Definition to term',
          ask: 'Select the term for this definition.'
        }
  return question.prompt === 'acronym'
    ? {
        eyebrow: 'Type the answer',
        direction: 'Acronym to expanded form',
        ask: 'Type the expanded form of this acronym.'
      }
    : {
        eyebrow: 'Type the answer',
        direction: 'Definition to term',
        ask: 'Type the term for this definition.'
      }
}

/** A long prompt (a definition) uses the smaller prompt size. */
function isLongPrompt(question: ExerciseQuestion): boolean {
  return question.kind === 'typed'
    ? question.prompt === 'definition'
    : question.direction === 'definition-to-term'
}

export function ExerciseScreen(props: ExerciseScreenProps) {
  const { exercise, certificationLabel, questions, exams, spell, onFinish, onLeave } = props
  const now = props.now ?? Date.now
  const [deadline] = useState(() => now() + exercise.timeLimitMinutes * 60_000)
  const [secondsLeft, setSecondsLeft] = useState(exercise.timeLimitMinutes * 60)
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<AnswerResult[]>(() =>
    questions.map(() => ({ status: 'unanswered' }))
  )
  const [draft, setDraft] = useState('')
  const [choice, setChoice] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [ask, setAsk] = useState<Ask>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const resultsRef = useRef(results)
  useEffect(() => {
    resultsRef.current = results
  }, [results])

  const question = questions[index]!
  const result = results[index]!
  const last = index === questions.length - 1
  const ready = question.kind === 'typed' ? draft.trim() !== '' : choice !== null
  const head = heading(question)

  // The timer counts down to a fixed deadline. At 0 the exercise ends and the results open.
  useEffect(() => {
    const tick = () => {
      const left = (deadline - now()) / 1000
      setSecondsLeft(left)
      if (left <= 0) onFinish(resultsRef.current, true)
    }
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [deadline, now, onFinish])

  useEffect(() => {
    if (checked) nextRef.current?.focus()
    else inputRef.current?.focus()
  }, [checked, index])

  const record = (r: AnswerResult) => setResults((all) => all.map((old, i) => (i === index ? r : old)))

  const check = () => {
    if (!ready || checked) return
    record(question.kind === 'typed' ? gradeTyped(question, draft, spell) : gradeChoice(question, choice!))
    setChecked(true)
  }

  const notSure = () => {
    if (checked) return
    record({ status: 'unsure' })
    setChecked(true)
  }

  const next = () => {
    if (last) return onFinish(results, false)
    setIndex(index + 1)
    setDraft('')
    setChoice(null)
    setChecked(false)
  }

  const closeDialog = useCallback(() => setAsk(null), [])

  // Keys work wherever the focus is: A–D select an option, Enter checks the answer and then goes on.
  const onKey = (e: KeyboardEvent) => {
    if (ask) return
    const letter = LETTERS.indexOf(e.key.toUpperCase())
    if (
      question.kind === 'multiple-choice' &&
      !checked &&
      e.key.length === 1 &&
      letter >= 0 &&
      letter < question.options.length
    ) {
      setChoice(letter)
      return
    }
    // A focused button handles Enter itself.
    if (e.key !== 'Enter' || e.target instanceof HTMLButtonElement) return
    e.preventDefault()
    if (checked) next()
    else check()
  }
  const onKeyRef = useRef(onKey)
  useEffect(() => {
    onKeyRef.current = onKey
  })
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKeyRef.current(e)
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [])

  return (
    <>
      <TopBar onHome={() => setAsk('leave')} />
      <main className="page" style={{ gap: 'var(--space-6)' }}>
        <div className="exbar">
          <div className="grow stack-2">
            <span className="eyebrow">{exercise.name}</span>
            <span className="small">{certificationLabel}</span>
            <span className="h4">
              Question {index + 1} of {questions.length}
            </span>
            <div className="bar" aria-hidden="true">
              <i style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
            </div>
          </div>
          <span className="small">
            Time left{' '}
            <span className={`timer${secondsLeft <= LOW_SECONDS ? ' low' : ''}`} role="timer">
              {clock(secondsLeft)}
            </span>
          </span>
          <button className="btn btn-outline btn-sm" onClick={() => setAsk('end')}>
            End exercise
          </button>
        </div>

        <section className="card stack-6" aria-live="polite">
          <div className="stack-2">
            <span className="eyebrow">{head.eyebrow}</span>
            <span className="small">{head.direction}</span>
            <p>{head.ask}</p>
          </div>
          <p className={`prompt${isLongPrompt(question) ? ' long' : ''}`}>{question.text}</p>
          {question.kind === 'typed' ? (
            <TypedAnswer
              ref={inputRef}
              value={draft}
              onChange={setDraft}
              spell={spell}
              disabled={checked}
              placeholder={question.prompt === 'acronym' ? 'Type the expanded form' : 'Type the term'}
            />
          ) : (
            <Choices question={question} choice={choice} checked={checked} onChoose={setChoice} />
          )}
          {checked && <Feedback question={question} result={result} exams={exams} />}
          <div className="btn-row">
            {checked ? (
              <button className="btn btn-primary" ref={nextRef} onClick={next}>
                {last ? 'See results' : 'Next question'}
              </button>
            ) : (
              <>
                <button className="btn btn-primary" disabled={!ready} onClick={check}>
                  Check answer
                </button>
                {exercise.notSure && question.kind === 'typed' && (
                  <button className="btn btn-outline" onClick={notSure}>
                    Not sure
                  </button>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      {ask === 'end' && (
        <Dialog
          title="End the exercise?"
          text="Questions you did not answer count as incorrect. Your results are not saved."
          confirmLabel="See results"
          cancelLabel="Keep going"
          onConfirm={() => onFinish(results, false)}
          onCancel={closeDialog}
        />
      )}
      {ask === 'leave' && (
        <Dialog
          title="Leave the exercise?"
          text="Your answers are not saved."
          confirmLabel="Leave"
          cancelLabel="Keep going"
          onConfirm={onLeave}
          onCancel={closeDialog}
        />
      )}
    </>
  )
}

function Choices({
  question,
  choice,
  checked,
  onChoose
}: {
  question: MultipleChoiceQuestion
  choice: number | null
  checked: boolean
  onChoose: (choice: number) => void
}) {
  return (
    <div className="stack-2" role="radiogroup" aria-label="Answers">
      {question.options.map((option, k) => {
        const right = checked && k === question.correctIndex
        const wrong = checked && k === choice && !right
        return (
          <button
            key={k}
            type="button"
            className={`choice${right ? ' right' : wrong ? ' wrong' : ''}`}
            role="radio"
            aria-checked={k === choice}
            disabled={checked}
            onClick={() => onChoose(k)}
          >
            <span className="key">{LETTERS[k]}</span>
            <span>{option}</span>
            {right && <span className="mark">Correct answer</span>}
            {wrong && <span className="mark">Your answer</span>}
          </button>
        )
      })}
    </div>
  )
}

function Feedback({
  question,
  result,
  exams
}: {
  question: ExerciseQuestion
  result: AnswerResult
  exams: ExamConfig[]
}) {
  const ok = isCorrect(result)
  const title = ok ? 'Correct' : result.status === 'unsure' ? 'Not sure' : 'Incorrect'
  const spelling = result.status === 'answered' && !ok && result.misspelled.length > 0
  const spellingNote = spelling && ' Spelling errors count as incorrect.'

  let body
  if (question.kind === 'multiple-choice')
    body = (
      <p>
        <b>{question.term}</b>: {question.definition}
      </p>
    )
  else if (question.prompt === 'acronym')
    body = (
      <>
        <p>
          <b>{question.text}</b> stands for <b>{question.answer}</b>.{spellingNote}
        </p>
        {question.meaning && <p>{question.meaning}</p>}
        <ObjectiveTags objectives={question.objectives} exams={exams} />
      </>
    )
  else
    body = (
      <p>
        The term is <b>{question.answer}</b>
        {question.acronyms && <> ({question.acronyms.join(', ')})</>}.{spellingNote}
      </p>
    )

  return (
    <div className={`feedback ${ok ? 'ok' : 'bad'}`} role="status">
      <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
        {ok ? <path d="M4 12l5 5L20 6" /> : <path d="M6 6l12 12M18 6 6 18" />}
      </svg>
      <div className="stack-2">
        <span className="h4">{title}</span>
        {body}
      </div>
    </div>
  )
}
