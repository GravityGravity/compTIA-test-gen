import { useEffect, useRef } from 'react'

interface LeaveDialogProps {
  busy: boolean
  error: string | null
  onSave: () => void
  onCancelAttempt: () => void
  onStay: () => void
}

/** Return, or closing the window, during an attempt: save for later, cancel the attempt, or keep working. */
export function LeaveDialog({ busy, error, onSave, onCancelAttempt, onStay }: LeaveDialogProps) {
  const saveRef = useRef<HTMLButtonElement>(null)
  useEffect(() => saveRef.current?.focus(), [])
  return (
    <div
      className="modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="lvTitle"
      aria-describedby="lvText"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onStay()
        }
      }}
    >
      <div className="dlg lv">
        <h2 id="lvTitle">Leave this exam?</h2>
        <p id="lvText">The timer is stopped while you decide.</p>
        <div className="lv-opts">
          <button className="lv-opt pri" ref={saveRef} disabled={busy} onClick={onSave}>
            <b>Save for later</b>
            <span>
              Keep your answers and remaining time. Resume it from the home screen or the exam page.
            </span>
          </button>
          <button className="lv-opt" disabled={busy} onClick={onCancelAttempt}>
            <b>Cancel attempt</b>
            <span>Delete this attempt. It is not graded or saved.</span>
          </button>
        </div>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        <button className="lv-stay" disabled={busy} onClick={onStay}>
          Keep working
        </button>
      </div>
    </div>
  )
}
