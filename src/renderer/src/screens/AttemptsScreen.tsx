import { useState } from 'react'
import type { AttemptSummary } from '@shared/exam'
import type { ExamConfig } from '@shared/types'
import { AttemptTable } from '../components/AttemptTable'
import { Crumbs } from '../components/Crumbs'
import { Hero } from '../components/Hero'

interface AttemptsScreenProps {
  attempts: AttemptSummary[]
  exams: ExamConfig[]
  onReview: (id: string) => void
  onHome: () => void
}

/** Previous attempts: every completed attempt, with a filter by exam. */
export function AttemptsScreen({ attempts, exams, onReview, onHome }: AttemptsScreenProps) {
  const [filter, setFilter] = useState<string>('all')
  // A filter for each exam that has attempts.
  const examIds = exams.map((e) => e.id).filter((id) => attempts.some((a) => a.examId === id))
  const shown = attempts.filter((a) => filter === 'all' || a.examId === filter)
  return (
    <>
      <Crumbs onHome={onHome} trail={['Previous attempts']} />
      <Hero
        title="Previous attempts"
        subtitle="Open an attempt to see your results and review each question."
      />
      <main className="page">
        <section className="card stack-6" aria-labelledby="listTitle">
          <div className="btn-row" style={{ justifyContent: 'space-between' }}>
            <h2 className="h3" id="listTitle">
              Exam attempts
            </h2>
            {examIds.length > 1 && (
              <div className="seg" role="group" aria-label="Filter by exam">
                <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
                  All
                </button>
                {examIds.map((id) => (
                  <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>
                    {exams.find((e) => e.id === id)!.shortName}
                  </button>
                ))}
              </div>
            )}
          </div>
          <AttemptTable
            attempts={shown}
            full
            onReview={onReview}
            empty={
              <>
                No attempts yet.{' '}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    onHome()
                  }}
                >
                  Start an exam
                </a>{' '}
                to see it here.
              </>
            }
          />
          <p className="small">
            Exercise results are not saved. Only finished exam attempts show here. An attempt in progress
            shows on the home screen.
          </p>
        </section>
      </main>
    </>
  )
}
