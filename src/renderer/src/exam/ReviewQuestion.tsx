import { verdict } from '@engine/exam/grade'
import type { ExamQuestion } from '@shared/exam'
import { LETTERS } from './format'
import { Cross, VerdictIcon } from './icons'

interface ReviewQuestionProps {
  index: number
  count: number
  question: ExamQuestion
  answer: number[] | null
  struck: boolean[]
  onBack: () => void
}

const TITLES = {
  correct: 'Correct',
  partial: 'Partially correct',
  incorrect: 'Incorrect',
  unanswered: 'Not answered'
}
const COLORS = {
  correct: ['--ok', '--ok-bg'],
  partial: ['--flag', '--flag-bg'],
  incorrect: ['--bad', '--bad-bg'],
  unanswered: ['--bad', '--bad-bg']
}

/** A graded question: the result banner, the marked answer keys, and the explanations. */
export function ReviewQuestion({ index, count, question: q, answer, struck, onBack }: ReviewQuestionProps) {
  const v = verdict(q, answer)
  const mine = answer ?? []
  const [color, background] = COLORS[v]
  const line = {
    correct: 'You selected the correct answer.',
    partial: `You selected ${mine.length} of ${q.answer.length} correct answers.`,
    unanswered: 'You did not answer this question.',
    incorrect: 'Your answer is not correct. The correct answer is marked in green.'
  }[v]
  const wrongOptions = q.options.map((_, k) => k).filter((k) => q.whyWrong[k])
  return (
    <>
      <div
        className="verdict"
        role="status"
        style={{ ['--vc' as string]: `var(${color})`, ['--vbg' as string]: `var(${background})` }}
      >
        <VerdictIcon ok={v === 'correct'} />
        <div>
          <b>{TITLES[v]}</b>
          <span>{line}</span>
        </div>
      </div>
      <div className="qa">
        <div style={{ minWidth: 0 }}>
          <p className="qnum">
            Question {index + 1} of {count} · <span style={{ color: `var(${color})` }}>{TITLES[v]}</span>
          </p>
          <p className="stem">
            {q.stem}
            {q.selectCount > 1 && (
              <>
                {' '}
                <b>Select all that apply.</b>
              </>
            )}
          </p>
          <ol className="opts">
            {q.options.map((o, k) => (
              <li key={k} className={struck[k] ? 'struck' : ''}>
                {LETTERS[k]}. {o}
              </li>
            ))}
          </ol>
          <div className="explain">
            <b>Explanation:</b> {q.explanation}
            {wrongOptions.length > 0 && (
              <ul className="whywrong" aria-label="Why the other options are wrong">
                {wrongOptions.map((k) => (
                  <li key={k}>
                    <b>{LETTERS[k]}.</b> {q.whyWrong[k]}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="keys">
          {q.options.map((_, k) => {
            const isMine = mine.includes(k)
            const right = q.answer.includes(k)
            return (
              <div className="krow" key={k}>
                <span
                  className="x"
                  aria-hidden="true"
                  style={{ cursor: 'default', ...(struck[k] ? { color: 'var(--bad)' } : { opacity: 0.3 }) }}
                >
                  <Cross />
                </span>
                <button
                  className={`key ro${isMine ? ' on mine' : ''}${right ? ' right' : ''}`}
                  disabled
                  aria-label={`Option ${LETTERS[k]}${isMine ? ', your answer' : ''}${right ? ', correct answer' : ''}`}
                >
                  {LETTERS[k]}
                </button>
              </div>
            )
          })}
          <div className="klegend">
            <span>
              <i className="sw ok" />
              Correct answer
            </span>
            <span>
              <i className="sw bad" />
              Your incorrect answer
            </span>
            <span>
              <i className="dot" />
              Your selected answer
            </span>
          </div>
          <button className="confirm" onClick={onBack}>
            Back to results
          </button>
        </div>
      </div>
    </>
  )
}
