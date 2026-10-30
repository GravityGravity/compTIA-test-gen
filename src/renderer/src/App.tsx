import { useCallback, useEffect, useState } from 'react'
import { generateExercise } from '@engine/exercise/generate'
import { buildPool } from '@engine/exercise/pool'
import type { AnswerResult, ExerciseQuestion, ExerciseSelection } from '@engine/exercise/types'
import { newSeed } from '@engine/random'
import { createSpellChecker, type SpellChecker } from '@engine/spell'
import type { AcronymRecord, Catalog, ContentByKind, DefinitionRecord, ExerciseConfig } from '@shared/types'
import { TopBar } from './components/TopBar'
import { selectionLabel } from './labels'
import { ExerciseResultsScreen } from './screens/ExerciseResultsScreen'
import { ExerciseScreen } from './screens/ExerciseScreen'
import { ExerciseSetupScreen } from './screens/ExerciseSetupScreen'
import { HomeScreen } from './screens/HomeScreen'

type Screen =
  | { name: 'home' }
  | { name: 'setup'; exercise: ExerciseConfig }
  | {
      name: 'run'
      exercise: ExerciseConfig
      selection: ExerciseSelection
      questions: ExerciseQuestion[]
      key: number
    }
  | {
      name: 'results'
      exercise: ExerciseConfig
      selection: ExerciseSelection
      questions: ExerciseQuestion[]
      results: AnswerResult[]
      timeUp: boolean
    }

export function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [content, setContent] = useState<Partial<ContentByKind>>({})
  const [spell, setSpell] = useState<SpellChecker | null>(null)
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  useEffect(() => {
    void window.certPractice.getCatalog().then(setCatalog)
    void window.certPractice
      .getContent('acronyms')
      .then((acronyms) => setContent((c) => ({ ...c, acronyms })))
    void window.certPractice
      .getContent('definitions')
      .then((definitions) => setContent((c) => ({ ...c, definitions })))
    void window.certPractice.getSpellData().then((d) => setSpell(createSpellChecker(d.aff, d.dic, d.words)))
  }, [])

  const goHome = useCallback(() => setScreen({ name: 'home' }), [])

  const start = (exercise: ExerciseConfig, selection: ExerciseSelection) => {
    const records: ReadonlyArray<AcronymRecord | DefinitionRecord> = content[exercise.content] ?? []
    const pool = buildPool(records, selection.certification, selection.exams)
    // Multiple-choice distractors may come from any exam of the same certification.
    const certRecords = records.filter((r) => r.certifications.includes(selection.certification))
    const questions = generateExercise(exercise, pool, newSeed(), certRecords)
    setScreen({ name: 'run', exercise, selection, questions, key: Date.now() })
  }

  if (!catalog) return <TopBar />

  const labelFor = (selection: ExerciseSelection) => {
    const cert = catalog.certifications.find((c) => c.id === selection.certification)
    return cert ? selectionLabel(cert, selection.exams, catalog.exams) : selection.certification
  }

  switch (screen.name) {
    case 'home':
      return (
        <>
          <TopBar />
          <HomeScreen
            catalog={catalog}
            onStartExercise={(exercise) => setScreen({ name: 'setup', exercise })}
          />
        </>
      )
    case 'setup':
      return (
        <>
          <TopBar onHome={goHome} />
          <ExerciseSetupScreen
            exercise={screen.exercise}
            catalog={catalog}
            records={spell ? (content[screen.exercise.content] ?? null) : null}
            onStart={(selection) => start(screen.exercise, selection)}
            onHome={goHome}
          />
        </>
      )
    case 'run':
      return (
        <ExerciseScreen
          key={screen.key}
          exercise={screen.exercise}
          certificationLabel={labelFor(screen.selection)}
          questions={screen.questions}
          exams={catalog.exams}
          spell={spell!}
          onFinish={(results, timeUp) => setScreen({ ...screen, name: 'results', results, timeUp })}
          onLeave={goHome}
        />
      )
    case 'results':
      return (
        <>
          <TopBar onHome={goHome} />
          <ExerciseResultsScreen
            exercise={screen.exercise}
            certificationLabel={labelFor(screen.selection)}
            questions={screen.questions}
            results={screen.results}
            timeUp={screen.timeUp}
            onTryAgain={() => start(screen.exercise, screen.selection)}
            onHome={goHome}
          />
        </>
      )
  }
}
