import { useEffect, useRef } from 'react'

/** Time is up: the answers are locked, and the only way on is to submit. */
export function TimeUpDialog({ onSubmit }: { onSubmit: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => ref.current?.focus(), [])
  return (
    <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="toTitle">
      <div className="dlg">
        <h2 id="toTitle">Time is up</h2>
        <p>
          The time for this section has ended. You cannot change your answers. Submit the exam to see your
          results.
        </p>
        <div className="actions">
          <button className="sm pri" ref={ref} onClick={onSubmit}>
            Submit Exam
          </button>
        </div>
      </div>
    </div>
  )
}
