import { joinList } from '@engine/exam/scenario/grammar'
import type { AttemptSummary } from '@shared/exam'
import type { Catalog, ExamConfig, ExerciseConfig } from '@shared/types'
import { AttemptTable } from '../components/AttemptTable'
import { Facts } from '../components/Facts'
import { Hero } from '../components/Hero'
import { ResumeCard } from '../components/ResumeCard'

interface HomeScreenProps {
  catalog: Catalog
  /** False for a module whose question types the app cannot run yet. */
  canStart?: (exercise: ExerciseConfig) => boolean
  onStartExercise?: (exercise: ExerciseConfig) => void
  onOpenExam?: (exam: ExamConfig) => void
  /** Attempts saved for later or interrupted. */
  inProgress?: AttemptSummary[]
  /** Completed attempts, newest first. */
  attempts?: AttemptSummary[]
  onResume?: (id: string) => void
  onDiscard?: (id: string) => void
  onReview?: (id: string) => void
  onViewAttempts?: () => void
}

const RECENT = 3

const attemptsText = (n: number) => `${n} attempt${n === 1 ? '' : 's'}`

// The draft's line icons, one per exam card in order.
const EXAM_ICONS = [
  <>
    <rect x="4" y="6" width="24" height="16" rx="1" />
    <path d="M11 27h10M16 22v5" />
  </>,
  <>
    <rect x="7" y="4" width="18" height="24" rx="2" />
    <path d="M12 10h8M12 15h8M12 20h5" />
  </>,
  <>
    <rect x="13" y="4" width="6" height="6" />
    <rect x="4" y="22" width="6" height="6" />
    <rect x="22" y="22" width="6" height="6" />
    <path d="M16 10v6M7 22v-6h18v6" />
  </>
]

/** "Mobile devices, networking, and hardware." from the domain names. */
function topics(exam: ExamConfig): string {
  const text = joinList(exam.domains.map((d) => d.name.toLowerCase()))
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`
}

function ExamCard({
  exam,
  index,
  active,
  onOpen
}: {
  exam: ExamConfig
  index: number
  active: boolean
  onOpen?: () => void
}) {
  const { min, max } = exam.questionCount
  return (
    <article className={`card module${active ? '' : ' inactive'}`} aria-disabled={!active || undefined}>
      <svg className="icon" viewBox="0 0 32 32" aria-hidden="true">
        {EXAM_ICONS[index % EXAM_ICONS.length]}
      </svg>
      <div className="stack-2">
        <span className="eyebrow">Exam</span>
        <h3 className="h3">{exam.name}</h3>
      </div>
      <p className="grow">{topics(exam)}</p>
      <Facts
        items={[
          ['Exam code', exam.id],
          ['Questions', min === max ? String(min) : `${min}–${max}`],
          ['Time', `${exam.timeLimitMinutes} min`],
          ['Passing score', String(exam.passingScore)],
          ...(active ? [] : [['Status', 'Coming later'] as [string, string]])
        ]}
      />
      <div>
        <button className="btn btn-primary" disabled={!active || !onOpen} onClick={onOpen}>
          {active ? 'Start exam' : 'Not available'}
        </button>
      </div>
    </article>
  )
}

function ExerciseCard({ exercise, onStart }: { exercise: ExerciseConfig; onStart?: () => void }) {
  const { active } = exercise
  return (
    <article className={`card module${active ? '' : ' inactive'}`} aria-disabled={!active || undefined}>
      <div className="stack-2">
        <span className="eyebrow">Exercise</span>
        <h3 className="h3">{exercise.name}</h3>
      </div>
      {exercise.description && <p className="grow">{exercise.description}</p>}
      <Facts
        items={[
          ['Questions', String(exercise.questionCount)],
          ['Time', `${exercise.timeLimitMinutes} min`],
          ...(active ? [] : [['Status', 'Coming later'] as [string, string]])
        ]}
      />
      <div>
        <button className="btn btn-primary" disabled={!active || !onStart} onClick={onStart}>
          {active ? 'Start exercise' : 'Not available'}
        </button>
      </div>
    </article>
  )
}

/** Module selection. Every module comes from config/, so new ones need no code change. */
export function HomeScreen({
  catalog,
  canStart = () => true,
  onStartExercise,
  onOpenExam,
  inProgress = [],
  attempts = [],
  onResume,
  onDiscard,
  onReview,
  onViewAttempts
}: HomeScreenProps) {
  const certActive = (exam: ExamConfig) =>
    catalog.certifications.find((c) => c.id === exam.certification)?.active === true
  // The best score of up to two exams, next to the number of exams taken.
  const best = catalog.exams
    .map((exam) => ({ exam, scores: attempts.filter((a) => a.examId === exam.id).map((a) => a.score ?? 0) }))
    .filter((b) => b.scores.length > 0)
    .slice(0, 2)
  const counts = best.map((b) => `${b.scores.length} ${b.exam.shortName}`)
  const countsText = `${joinList(counts)} attempt${attempts.length === 1 ? '' : 's'}.`
  return (
    <>
      <Hero
        title="Practice for your certification exams"
        subtitle="Take a timed practice exam, or drill acronyms and definitions."
      />
      <main className="page">
        {inProgress.map((a) => (
          <ResumeCard
            key={a.id}
            attempt={a}
            eyebrow="In progress"
            title={a.examName}
            onResume={() => onResume?.(a.id)}
            onDiscard={() => onDiscard?.(a.id)}
          />
        ))}

        {catalog.exams.length > 0 && (
          <section className="stack-6" aria-labelledby="examsTitle">
            <div className="stack-2">
              <h2 className="h2" id="examsTitle">
                Practice exams
              </h2>
              <p>
                Each exam follows the domains, weights, and time limit of the real exam. The questions change
                every attempt.
              </p>
            </div>
            <div className="grid-3">
              {catalog.exams.map((exam, i) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  index={i}
                  active={exam.active && certActive(exam)}
                  onOpen={onOpenExam ? () => onOpenExam(exam) : undefined}
                />
              ))}
            </div>
          </section>
        )}

        <section className="stack-6" aria-labelledby="exTitle">
          <div className="stack-2">
            <h2 className="h2" id="exTitle">
              Exercises
            </h2>
            <p>Short timed drills. Results are not saved.</p>
          </div>
          <div className="grid-2">
            {catalog.exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onStart={onStartExercise && canStart(exercise) ? () => onStartExercise(exercise) : undefined}
              />
            ))}
          </div>
        </section>

        {onReview && (
          <section className="card stack-6" aria-labelledby="attTitle">
            <div className="stack-2">
              <h2 className="h2" id="attTitle">
                Previous attempts
              </h2>
              <p>
                Exam attempts saved on this computer. Open one to see your results and review each question.
              </p>
            </div>
            {attempts.length > 0 && (
              <div className="grid-3">
                <div>
                  <p className="stat-num">{attempts.length}</p>
                  <p className="stat-label">Exams taken</p>
                  <p className="stat-text">{countsText}</p>
                </div>
                {best.map(({ exam, scores }) => (
                  <div key={exam.id}>
                    <p className="stat-num">{Math.max(...scores)}</p>
                    <p className="stat-label">Best {exam.shortName} score</p>
                    <p className="stat-text">{exam.passingScore} is needed to pass.</p>
                  </div>
                ))}
              </div>
            )}
            <AttemptTable
              attempts={attempts.slice(0, RECENT)}
              onReview={onReview}
              empty="No attempts yet. Finished exams show here."
            />
            {attempts.length > 0 && (
              <div>
                <button className="btn btn-primary" onClick={onViewAttempts}>
                  {attempts.length === 1 ? 'View the attempt' : `View all ${attemptsText(attempts.length)}`}
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </>
  )
}
