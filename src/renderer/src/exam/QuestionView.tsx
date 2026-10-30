import type { ExamQuestion } from '@shared/exam'
import { LETTERS, paceClock, sameAnswer } from './format'
import { Cross, Warning } from './icons'

interface QuestionViewProps {
  index: number
  count: number
  question: ExamQuestion
  /** The confirmed answer. */
  answer: number[] | null
  /** The selection that is not confirmed yet. */
  pick: number[]
  struck: boolean[]
  justSaved: boolean
  /** Suggested seconds left for this question (negative when over). */
  paceLeft: number
  onChoose: (option: number) => void
  onStrike: (option: number) => void
  onConfirm: () => void
}

/** One question: the stem and options on the left, the answer keys and Confirm on the right. */
export function QuestionView(p: QuestionViewProps) {
  const { question: q, answer, pick } = p
  const changed = !sameAnswer(pick, answer)
  const ready = pick.length > 0 && changed
  const savedText = answer ? answer.map((k) => LETTERS[k]).join(', ') : ''
  return (
    <>
      <div className="qa">
        <div style={{ minWidth: 0 }}>
          <p className="qnum">
            Question {p.index + 1} of {p.count}
            {answer !== null ? ' · Answered' : ''}
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
              <li key={k} className={p.struck[k] ? 'struck' : ''}>
                {LETTERS[k]}. {o}
              </li>
            ))}
          </ol>
        </div>
        <div className="keys">
          {q.options.map((_, k) => {
            const struck = !!p.struck[k]
            const on = pick.includes(k)
            return (
              <div className="krow" key={k}>
                <button
                  className="x"
                  aria-pressed={struck}
                  aria-label={`${struck ? 'Restore' : 'Eliminate'} option ${LETTERS[k]}`}
                  title={`${struck ? 'Restore' : 'Eliminate'} option`}
                  onClick={() => p.onStrike(k)}
                >
                  <Cross />
                </button>
                <button
                  className={`key${on ? ' on' : ''}`}
                  disabled={struck}
                  aria-pressed={on}
                  onClick={() => p.onChoose(k)}
                >
                  {LETTERS[k]}
                </button>
              </div>
            )
          })}
          <button className="confirm" disabled={!ready} onClick={p.onConfirm}>
            Confirm
          </button>
          <div className="saved" aria-live="polite">
            {p.justSaved ? 'Answer saved.' : answer !== null && !changed ? `Answer ${savedText} saved.` : ''}
          </div>
        </div>
      </div>
      <div className="foot">
        <button className="report" disabled title="Not available">
          <Warning /> Report Content Errors
        </button>
        <div id="qTimer" className={p.paceLeft < 0 ? 'neg' : ''} title="Suggested time for this question">
          This question: <b>{paceClock(p.paceLeft)}</b>
        </div>
      </div>
    </>
  )
}
