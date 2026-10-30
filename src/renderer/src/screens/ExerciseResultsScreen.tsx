import { useState } from 'react'
import { isCorrect, summarize } from '@engine/exercise/grade'
import type { AnswerResult, ExerciseQuestion } from '@engine/exercise/types'
import type { ExerciseConfig } from '@shared/types'
import { Crumbs } from '../components/Crumbs'
import { Hero } from '../components/Hero'
import { MarkedText } from '../components/MarkedText'

interface ExerciseResultsScreenProps {
  exercise: ExerciseConfig
  certificationLabel: string
  questions: ExerciseQuestion[]
  results: AnswerResult[]
  timeUp: boolean
  onTryAgain: () => void
  onHome: () => void
}

function YourAnswer({ question, result }: { question: ExerciseQuestion; result: AnswerResult }) {
  if (result.status === 'unsure') return <>Not sure</>
  if (result.status === 'unanswered') return <>Not answered</>
  if (result.status === 'chosen')
    return <>{question.kind === 'multiple-choice' ? question.options[result.choice] : ''}</>
  return <MarkedText text={result.text} misspelled={result.misspelled} />
}

/** The acronym or term in bold; a definition as plain text. */
function QuestionText({ question }: { question: ExerciseQuestion }) {
  const short =
    question.kind === 'typed' ? question.prompt === 'acronym' : question.direction === 'term-to-definition'
  return short ? <b>{question.text}</b> : <>{question.text}</>
}

/** Exercise results. Not saved: they clear when the user leaves this screen. */
export function ExerciseResultsScreen(props: ExerciseResultsScreenProps) {
  const { exercise, certificationLabel, questions, results, timeUp, onTryAgain, onHome } = props
  const [filter, setFilter] = useState<'all' | 'wrong'>('all')
  const summary = summarize(results)
  const rows = questions
    .map((question, i) => ({ n: i + 1, question, result: results[i]!, ok: isCorrect(results[i]!) }))
    .filter((row) => filter === 'all' || !row.ok)

  return (
    <>
      <Crumbs onHome={onHome} trail={[exercise.name, 'Results']} />
      <Hero title="Exercise results" subtitle={`${exercise.name} for ${certificationLabel}`} />
      <main className="page">
        <section className="card stack-6" aria-labelledby="sumTitle">
          <h2 className="visually-hidden" id="sumTitle">
            Summary
          </h2>
          {timeUp && (
            <p className="h4">
              Time is up. The exercise ended after {exercise.timeLimitMinutes} minutes, and unanswered
              questions count as incorrect.
            </p>
          )}
          <div className="grid-3">
            <div>
              <p className="stat-num">
                {summary.correct}/{summary.total}
              </p>
              <p className="stat-label">Correct</p>
              <p className="stat-text">{summary.percent}% of the questions.</p>
            </div>
            <div>
              <p className="stat-num">{summary.incorrect}</p>
              <p className="stat-label">Incorrect</p>
              <p className="stat-text">Including &quot;Not sure&quot; and unanswered questions.</p>
            </div>
            <div>
              <p className="stat-num">{summary.spellingErrors}</p>
              <p className="stat-label">Spelling errors</p>
              <p className="stat-text">Answers marked incorrect for spelling.</p>
            </div>
          </div>
          <p className="small">These results are not saved. They clear when you leave this screen.</p>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={onTryAgain}>
              Try again
            </button>
            <button className="btn btn-outline" onClick={onHome}>
              Back to home
            </button>
          </div>
        </section>

        <section className="card stack-6" aria-labelledby="listTitle">
          <div className="btn-row" style={{ justifyContent: 'space-between' }}>
            <h2 className="h3" id="listTitle">
              Your answers
            </h2>
            <div className="seg" role="group" aria-label="Filter answers">
              <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
                All questions
              </button>
              <button aria-pressed={filter === 'wrong'} onClick={() => setFilter('wrong')}>
                Incorrect only ({summary.incorrect})
              </button>
            </div>
          </div>
          <table className="table rtable">
            <thead>
              <tr>
                <th>#</th>
                <th>Question</th>
                <th>Your answer</th>
                <th>Correct answer</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ n, question, result, ok }) => (
                <tr key={n}>
                  <td>{n}</td>
                  <td>
                    <QuestionText question={question} />
                  </td>
                  <td>
                    <YourAnswer question={question} result={result} />
                  </td>
                  <td>{question.answer}</td>
                  <td>
                    <span className={ok ? 'result-ok' : 'result-bad'}>{ok ? 'Correct' : 'Incorrect'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  )
}
