import type { Catalog, ExerciseConfig } from '@shared/types'
import { Facts } from '../components/Facts'
import { Hero } from '../components/Hero'

interface HomeScreenProps {
  catalog: Catalog
  onStartExercise?: (exercise: ExerciseConfig) => void
}

function ExerciseCard({ exercise, onStart }: { exercise: ExerciseConfig; onStart?: () => void }) {
  const { active } = exercise
  return (
    <article className={`card module${active ? '' : ' inactive'}`} aria-disabled={!active || undefined}>
      <div className="stack-2">
        <span className="eyebrow">Exercise</span>
        <h3 className="h3">{exercise.name}</h3>
      </div>
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
export function HomeScreen({ catalog, onStartExercise }: HomeScreenProps) {
  return (
    <>
      <Hero
        title="Practice for your certification exams"
        subtitle="Take a timed practice exam, or drill acronyms and definitions."
      />
      <main className="page">
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
                onStart={onStartExercise && (() => onStartExercise(exercise))}
              />
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
