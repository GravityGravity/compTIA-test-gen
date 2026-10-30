import { useCallback, useEffect, useState } from 'react'
import { generateExercise } from '@engine/exercise/generate'
import { buildPool } from '@engine/exercise/pool'
import type { AnswerResult, ExerciseQuestion, ExerciseSelection } from '@engine/exercise/types'
import { newSeed } from '@engine/random'
import { createSpellChecker, type SpellChecker } from '@engine/spell'
import type { Attempt, AttemptSummary } from '@shared/exam'
import type {
  AcronymRecord,
  Catalog,
  ContentByKind,
  DefinitionRecord,
  ExamConfig,
  ExerciseConfig
} from '@shared/types'
import { Dialog } from './components/Dialog'
import { TopBar } from './components/TopBar'
import { ExamAttempt } from './exam/ExamAttempt'
import { selectionLabel } from './labels'
import { AttemptsScreen } from './screens/AttemptsScreen'
import { ExamIntroScreen } from './screens/ExamIntroScreen'
import { ExerciseResultsScreen } from './screens/ExerciseResultsScreen'
import { ExerciseScreen } from './screens/ExerciseScreen'
import { ExerciseSetupScreen } from './screens/ExerciseSetupScreen'
import { HomeScreen } from './screens/HomeScreen'

type Screen =
  | { name: 'home' }
  | { name: 'examIntro'; exam: ExamConfig }
  | { name: 'exam'; attempt: Attempt; key: number }
  | { name: 'attempts' }
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
  const [inProgress, setInProgress] = useState<AttemptSummary[]>([])
  const [attempts, setAttempts] = useState<AttemptSummary[]>([])
  const [discarding, setDiscarding] = useState<AttemptSummary | null>(null)
  const [examError, setExamError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  // The attempt lists change after every exam, so they reload on the screens that show them.
  const refreshAttempts = useCallback(() => {
    void window.certPractice.inProgressAttempts().then(setInProgress)
    void window.certPractice.listAttempts().then(setAttempts)
  }, [])
  useEffect(() => {
    if (screen.name === 'home' || screen.name === 'examIntro' || screen.name === 'attempts') refreshAttempts()
  }, [screen, refreshAttempts])

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

  const openExam = (exam: ExamConfig) => {
    setExamError(null)
    setScreen({ name: 'examIntro', exam })
  }

  const startExam = (exam: ExamConfig) => {
    setStarting(true)
    setExamError(null)
    window.certPractice
      .startExam(exam.id)
      .then((attempt) => setScreen({ name: 'exam', attempt, key: Date.now() }))
      .catch((e: unknown) =>
        setExamError(`The exam could not start. ${e instanceof Error ? e.message : String(e)}`)
      )
      .finally(() => setStarting(false))
  }

  const openAttempt = (id: string) => {
    void window.certPractice.getAttempt(id).then((attempt) => {
      if (attempt) setScreen({ name: 'exam', attempt, key: Date.now() })
    })
  }

  const discard = (summary: AttemptSummary) => setDiscarding(summary)
  const discardDialog = discarding && (
    <Dialog
      title="Discard this attempt?"
      text={`Your answers for the ${discarding.examName} attempt in progress will be deleted. You cannot undo this.`}
      confirmLabel="Discard attempt"
      cancelLabel="Keep it"
      onConfirm={() => {
        void window.certPractice.discardAttempt(discarding.id).then(refreshAttempts)
        setDiscarding(null)
      }}
      onCancel={() => setDiscarding(null)}
    />
  )

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
            onOpenExam={openExam}
            inProgress={inProgress}
            attempts={attempts}
            onResume={openAttempt}
            onDiscard={(id) => discard(inProgress.find((a) => a.id === id)!)}
            onReview={openAttempt}
            onViewAttempts={() => setScreen({ name: 'attempts' })}
          />
          {discardDialog}
        </>
      )
    case 'examIntro': {
      const { exam } = screen
      const certification = catalog.certifications.find((c) => c.id === exam.certification)!
      const saved = inProgress.find((a) => a.examId === exam.id) ?? null
      return (
        <>
          <TopBar onHome={goHome} />
          <ExamIntroScreen
            exam={exam}
            certification={certification}
            saved={saved}
            error={examError}
            starting={starting}
            onStart={() => startExam(exam)}
            onResume={openAttempt}
            onDiscard={() => saved && discard(saved)}
            onHome={goHome}
          />
          {discardDialog}
        </>
      )
    }
    case 'exam': {
      const { attempt } = screen
      const exam = catalog.exams.find((e) => e.id === attempt.exam.id)
      const certification = catalog.certifications.find((c) => c.id === attempt.exam.certification)
      const backToExam = () => (exam ? openExam(exam) : goHome())
      return (
        <ExamAttempt
          key={screen.key}
          attempt={attempt}
          title={`${certification?.shortName ?? ''} ${attempt.exam.name} (${attempt.exam.id})`.trim()}
          api={window.certPractice}
          onExit={backToExam}
          onNewAttempt={backToExam}
          onHome={goHome}
        />
      )
    }
    case 'attempts':
      return (
        <>
          <TopBar onHome={goHome} />
          <AttemptsScreen attempts={attempts} exams={catalog.exams} onReview={openAttempt} onHome={goHome} />
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
