import { useState } from 'react'
import { buildPool } from '@engine/exercise/pool'
import type { ExerciseSelection } from '@engine/exercise/types'
import type { AcronymRecord, Catalog, DefinitionRecord, ExerciseConfig } from '@shared/types'
import { Crumbs } from '../components/Crumbs'
import { Facts } from '../components/Facts'
import { Hero } from '../components/Hero'
import { RadioGroup } from '../components/RadioGroup'
import { examLabel, questionTypeLabel, recordNoun } from '../labels'

const BOTH = 'all'

interface ExerciseSetupScreenProps {
  exercise: ExerciseConfig
  catalog: Catalog
  /** The module's records; null while they load. */
  records: ReadonlyArray<AcronymRecord | DefinitionRecord> | null
  onStart: (selection: ExerciseSelection) => void
  onHome: () => void
}

/** Select the certification, then the exam when the certification has more than one. */
export function ExerciseSetupScreen({
  exercise,
  catalog,
  records,
  onStart,
  onHome
}: ExerciseSetupScreenProps) {
  const certs = exercise.certifications
    .map((id) => catalog.certifications.find((c) => c.id === id))
    .filter((c) => c !== undefined)
  const [certId, setCertId] = useState(() => certs.find((c) => c.active)?.id ?? '')
  const [examChoice, setExamChoice] = useState(BOTH)
  const cert = certs.find((c) => c.id === certId)

  const count = (certification: string, exams: readonly string[]) =>
    records ? recordNoun(exercise, buildPool(records, certification, exams).length) : 'Loading…'

  const exams = cert && examChoice !== BOTH ? [examChoice] : (cert?.exams ?? [])
  const certExams = (cert?.exams ?? [])
    .map((code) => catalog.exams.find((e) => e.id === code))
    .filter((e) => !!e)
  const noun = exercise.content === 'acronyms' ? 'Acronyms' : 'Terms'

  const pickCert = (id: string) => {
    setCertId(id)
    setExamChoice(BOTH)
  }

  return (
    <>
      <Crumbs onHome={onHome} trail={[exercise.name]} />
      <Hero title={exercise.name} subtitle={exercise.description} />
      <main className="page">
        <section className="card stack-6" aria-labelledby="certTitle">
          <div className="stack-2">
            <h2 className="h3" id="certTitle">
              Select a certification
            </h2>
            <p className="small">
              The exercise uses only the {exercise.content === 'acronyms' ? 'acronyms' : 'terms'} for this
              certification.
            </p>
          </div>
          <RadioGroup
            labelledBy="certTitle"
            value={certId}
            onChange={pickCert}
            options={certs.map((c) => ({
              value: c.id,
              label: c.name,
              detail: c.active ? count(c.id, c.exams) : 'Coming later',
              disabled: !c.active
            }))}
          />
        </section>

        {cert && cert.exams.length > 1 && (
          <section className="card stack-6" aria-labelledby="examTitle">
            <div className="stack-2">
              <h2 className="h3" id="examTitle">
                Select an exam
              </h2>
              <p className="small">{noun} that belong to more than one exam appear under each of them.</p>
            </div>
            <RadioGroup
              labelledBy="examTitle"
              value={examChoice}
              onChange={setExamChoice}
              options={[
                {
                  value: BOTH,
                  label: `${certExams.length === 2 ? 'Both' : 'All'} (${certExams.map((e) => e.shortName).join(' and ')})`,
                  detail: count(cert.id, cert.exams)
                },
                ...certExams.map((e) => ({
                  value: e.id,
                  label: examLabel(e),
                  detail: count(cert.id, [e.id])
                }))
              ]}
            />
          </section>
        )}

        <section className="card stack-6" aria-labelledby="sumTitle">
          <h2 className="h3" id="sumTitle">
            What to expect
          </h2>
          <div style={{ maxWidth: 480 }}>
            <Facts
              items={[
                ['Questions', String(exercise.questionCount)],
                // One type: name it. Several: one row for each, with its count.
                ...exercise.questionTypes.map((qt): [string, string] =>
                  exercise.questionTypes.length > 1
                    ? [questionTypeLabel(qt), String(qt.count)]
                    : ['Question type', questionTypeLabel(qt)]
                ),
                ['Time', `${exercise.timeLimitMinutes} minutes`]
              ]}
            />
          </div>
          <p>
            A typed answer with a spelling error is incorrect. Close matches are not accepted. When the time
            runs out, the exercise ends and unanswered questions count as incorrect.
          </p>
          <div className="btn-row">
            <button
              className="btn btn-primary"
              disabled={!cert || !records}
              onClick={() => cert && onStart({ exerciseId: exercise.id, certification: cert.id, exams })}
            >
              Start exercise
            </button>
            <button className="btn btn-outline" onClick={onHome}>
              Back to home
            </button>
          </div>
        </section>
      </main>
    </>
  )
}
