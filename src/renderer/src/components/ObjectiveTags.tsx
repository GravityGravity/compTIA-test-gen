import type { ExamConfig } from '@shared/types'
import { objectiveTags } from '@engine/objectives'

/** One neutral tag for each exam objective: at most 3, then "+n more". */
export function ObjectiveTags({ objectives, exams }: { objectives: string[]; exams: ExamConfig[] }) {
  const { shown, hidden } = objectiveTags(objectives, exams)
  if (shown.length === 0) return null
  return (
    <div className="tags" aria-label="Exam objectives">
      {shown.map((label) => (
        <span key={label} className="tag">
          {label}
        </span>
      ))}
      {hidden.length > 0 && (
        <span className="tag" title={hidden.join(', ')}>
          +{hidden.length} more
        </span>
      )}
    </div>
  )
}
