import { useEffect } from 'react'
import { credit, isCorrect } from '@engine/exam/grade'
import type { AttemptExam, AttemptResult, ExamQuestion } from '@shared/exam'
import { hms, LETTERS } from './format'
import { SmallCross, Tick } from './icons'

export type ResultFilter = 'all' | 'right' | 'wrong'

interface ResultsViewProps {
  exam: AttemptExam
  result: AttemptResult
  questions: ExamQuestion[]
  answers: (number[] | null)[]
  filter: ResultFilter
  /** The question to scroll to (after "Back to results"). */
  focus: number | null
  onFilter: (filter: ResultFilter) => void
  onOpen: (index: number) => void
  onNewAttempt: () => void
}

function AnswerList({ question, options }: { question: ExamQuestion; options: number[] }) {
  return (
    <ul className="alist">
      {options.map((j) => (
        <li key={j}>
          <b>{LETTERS[j]}.</b> {question.options[j]}
        </li>
      ))}
    </ul>
  )
}

/** Assessment Results: the score, the per-domain breakdown, and the list of questions with filters. */
export function ResultsView(p: ResultsViewProps) {
  const { exam, result, questions } = p
  const total = questions.length
  const items = questions
    .map((q, k) => ({ q, k, ok: isCorrect(q, p.answers[k] ?? null), pc: credit(q, p.answers[k] ?? null) }))
    .filter((x) => p.filter === 'all' || (p.filter === 'wrong' && !x.ok) || (p.filter === 'right' && x.ok))

  useEffect(() => {
    if (p.focus !== null)
      document.querySelector(`[data-rv="${p.focus}"]`)?.scrollIntoView?.({ block: 'center' })
  }, [p.focus])

  return (
    <div className="panel">
      <h2>Assessment Results</h2>
      <div className="score">
        <span className="big">{result.score}</span>
        <span>
          out of {exam.maxScore} · {result.correct} of {total} correct
          {result.partial > 0 && ` · ${result.partial} partially correct`}
        </span>
        <span className={`pill ${result.passed ? 'pass' : 'fail'}`}>
          {result.passed ? 'Pass' : 'Did not pass'} ({exam.passingScore} required)
        </span>
        <span className="sub" style={{ margin: 0 }}>
          Time used {hms(result.timeUsedS)}
        </span>
      </div>
      <p className="sub" style={{ margin: '-6px 0 14px' }}>
        Each question is worth {(exam.maxScore / total).toFixed(2)} points. On multi-answer questions, you get
        part of the points if all your selected answers are correct.
      </p>
      <table className="domains">
        <caption className="visually-hidden">Results by domain</caption>
        <thead>
          <tr>
            <th>Domain</th>
            <th className="num">Correct</th>
            <th>
              <span className="visually-hidden">Bar</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {result.domains.map((d) => (
            <tr key={d.id}>
              <td>
                {d.id}.0 {d.name}
              </td>
              <td className="num">
                {d.correct} of {d.total}
              </td>
              <td>
                <div className="dbar">
                  <i style={{ width: `${(100 * d.correct) / d.total}%` }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="filters">
        <button
          className="sm"
          data-f="all"
          aria-pressed={p.filter === 'all'}
          onClick={() => p.onFilter('all')}
        >
          All questions
        </button>
        <button
          className="sm"
          data-f="right"
          aria-pressed={p.filter === 'right'}
          onClick={() => p.onFilter('right')}
        >
          Correct only ({result.correct})
        </button>
        <button
          className="sm"
          data-f="wrong"
          aria-pressed={p.filter === 'wrong'}
          onClick={() => p.onFilter('wrong')}
        >
          Incorrect only ({total - result.correct})
        </button>
      </div>
      <ul className="rlist">
        {items.map(({ q, k, ok, pc }) => {
          const mine = p.answers[k] ?? null
          const open = () => p.onOpen(k)
          return (
            <li
              key={k}
              className={ok ? 'ok' : pc > 0 ? 'part' : ''}
              data-rv={k}
              tabIndex={0}
              title="Open this question"
              onClick={open}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  open()
                }
              }}
            >
              <span
                className="mark"
                role="img"
                aria-label={ok ? 'Correct' : pc > 0 ? 'Partially correct' : 'Incorrect'}
              >
                {ok || pc > 0 ? <Tick /> : <SmallCross />}
              </span>
              <div className="q">
                {k + 1}. {q.stem}
              </div>
              {!ok && pc > 0 && mine && (
                <div className="pnote">
                  Partial credit: {mine.length} of {q.answer.length} correct answers selected
                </div>
              )}
              <div className="acols">
                <div>
                  <div className="albl">Your answer:</div>
                  {mine === null ? (
                    <ul className="alist">
                      <li>
                        <b>Not answered</b>
                      </li>
                    </ul>
                  ) : (
                    <AnswerList question={q} options={mine} />
                  )}
                </div>
                {!ok && (
                  <div>
                    <div className="albl" style={{ textDecoration: 'underline' }}>
                      Correct answer(s):
                    </div>
                    <AnswerList question={q} options={q.answer} />
                  </div>
                )}
              </div>
              <div className="a">{q.explanation}</div>
            </li>
          )
        })}
        {items.length === 0 &&
          (p.filter === 'right' ? (
            <li>No correct answers.</li>
          ) : (
            <li className="ok">No incorrect answers.</li>
          ))}
      </ul>
      <div className="actions" style={{ marginTop: 16 }}>
        <button className="sm pri" onClick={p.onNewAttempt}>
          Start a new attempt
        </button>
      </div>
    </div>
  )
}
