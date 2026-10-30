interface ReviewPanelProps {
  answered: boolean[]
  flagged: boolean[]
  current: number
  confirming: boolean
  onGo: (index: number) => void
  onFinalize: () => void
  onSubmit: () => void
  onCancel: () => void
}

/** Review & Finalize: the counts, a grid of all questions, and the two-step submit. */
export function ReviewPanel(p: ReviewPanelProps) {
  const total = p.answered.length
  const answered = p.answered.filter(Boolean).length
  const unanswered = total - answered
  const marked = p.flagged.filter(Boolean).length
  return (
    <div className="panel">
      <h2>Review &amp; Finalize Section</h2>
      <ul className="stats">
        <li>
          Answered:{' '}
          <b>
            {answered} of {total}
          </b>
        </li>
        <li>
          Unanswered: <b>{unanswered}</b>
        </li>
        <li>
          Marked to revisit: <b>{marked}</b>
        </li>
      </ul>
      <p className="sub">Select a question to go back to it.</p>
      <div className="legend">
        <span>
          <i style={{ background: 'var(--sel)', borderColor: 'var(--sel-border)' }} />
          Answered
        </span>
        <span>
          <i />
          Unanswered
        </span>
        <span>
          <i style={{ borderRadius: '50%', background: 'var(--flag)', border: 0, width: 9, height: 9 }} />
          Revisit later
        </span>
      </div>
      <div className="grid">
        {p.answered.map((a, k) => (
          <button
            key={k}
            className={`cell${a ? ' ans' : ''}${p.flagged[k] ? ' flag' : ''}`}
            aria-label={`Question ${k + 1}, ${a ? 'answered' : 'unanswered'}${p.flagged[k] ? ', marked to revisit' : ''}`}
            onClick={() => p.onGo(k)}
          >
            {k + 1}
          </button>
        ))}
      </div>
      {p.confirming ? (
        <>
          <div className="warn">
            {unanswered > 0 && `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. `}
            After you finalize, you cannot change your answers. Submit the exam now?
          </div>
          <div className="actions">
            <button className="sm pri" onClick={p.onSubmit}>
              Submit Exam
            </button>
            <button className="sm" onClick={p.onCancel}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div className="actions">
          <button className="sm" onClick={() => p.onGo(p.current)}>
            Return to question {p.current + 1}
          </button>
          <button className="sm pri" onClick={p.onFinalize}>
            Finalize Submission
          </button>
        </div>
      )}
    </div>
  )
}
