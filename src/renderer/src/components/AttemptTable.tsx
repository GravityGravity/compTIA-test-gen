import type { AttemptSummary } from '@shared/exam'
import { dateTime, hms } from '../exam/format'

interface AttemptTableProps {
  attempts: AttemptSummary[]
  /** The full list adds the Correct and Time used columns. */
  full?: boolean
  onReview: (id: string) => void
  empty: React.ReactNode
}

/** Completed attempts: date, exam, score, and result, with Review attempt. */
export function AttemptTable({ attempts, full, onReview, empty }: AttemptTableProps) {
  const columns = full ? 7 : 5
  return (
    <table className={`table ${full ? 'attempts' : 'recent'}`}>
      <thead>
        <tr>
          <th>Date</th>
          <th>Exam</th>
          <th className="num">Score</th>
          <th>Result</th>
          {full && <th className="num">Correct</th>}
          {full && <th className="num">Time used</th>}
          <th>
            <span className="visually-hidden">Action</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {attempts.length === 0 ? (
          <tr>
            <td colSpan={columns} className="empty">
              {empty}
            </td>
          </tr>
        ) : (
          attempts.map((a) => (
            <tr key={a.id}>
              <td>{dateTime(a.completedAt ?? a.updatedAt)}</td>
              <td>{a.examName}</td>
              <td className="num score">{a.score}</td>
              <td>
                <span className={`result ${a.passed ? 'pass' : 'fail'}`}>
                  {a.passed ? 'Pass' : 'Did not pass'}
                </span>
              </td>
              {full && (
                <td className="num">
                  {a.correct} of {a.questionCount}
                </td>
              )}
              {full && <td className="num">{hms(a.timeUsedS ?? 0)}</td>}
              <td className="num">
                <button className="btn btn-outline btn-sm" onClick={() => onReview(a.id)}>
                  Review attempt
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
