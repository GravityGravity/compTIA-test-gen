import { useEffect, useRef } from 'react'

interface DialogProps {
  title: string
  text: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** A small modal with one primary and one outline button. Escape cancels. */
export function Dialog({ title, text, confirmLabel, cancelLabel, onConfirm, onCancel }: DialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="backdrop" role="alertdialog" aria-modal="true" aria-labelledby="dialogTitle">
      <div className="card stack-4">
        <h2 className="h3" id="dialogTitle">
          {title}
        </h2>
        <p>{text}</p>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className="btn btn-outline" ref={cancelRef} onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
