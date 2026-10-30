import type { AttemptSummary } from '@shared/exam'
import { dateTime, hms } from '../exam/format'
import { Facts } from './Facts'

interface ResumeCardProps {
  attempt: AttemptSummary
  /** "In progress" on the home screen, "Saved for later" on the exam's page. */
  eyebrow: string
  title: string
  note?: string
  onResume: () => void
  onDiscard: () => void
}

/** An attempt in progress, with Resume and Discard. */
export function ResumeCard({ attempt, eyebrow, title, note, onResume, onDiscard }: ResumeCardProps) {
  return (
    <section className="card resume" aria-labelledby={`resume-${attempt.id}`}>
      <svg className="icon" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="17" r="11" />
        <path d="M16 11v6l4 3M12 3h8" />
      </svg>
      <div className="stack-4">
        <div className="stack-2">
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="h3" id={`resume-${attempt.id}`}>
            {title}
          </h2>
        </div>
        <Facts
          items={[
            ['Saved', dateTime(attempt.updatedAt)],
            ['Question', `${attempt.currentIndex + 1} of ${attempt.questionCount}`],
            ['Answered', String(attempt.answered)],
            ['Marked to revisit', String(attempt.flagged)],
            ['Time left', hms(attempt.timeLeftS)]
          ]}
        />
        {note && <p className="small">{note}</p>}
        <div className="btn-row">
          <button className="btn btn-primary" onClick={onResume}>
            Resume exam
          </button>
          <button className="btn btn-outline" onClick={onDiscard}>
            Discard attempt
          </button>
        </div>
      </div>
    </section>
  )
}
