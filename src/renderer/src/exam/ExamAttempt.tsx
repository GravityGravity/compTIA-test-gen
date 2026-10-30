import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CertPracticeApi } from '@shared/api'
import type { Attempt, AttemptProgress } from '@shared/exam'
import { TopBar } from '../components/TopBar'
import { hms, sameAnswer } from './format'
import { Hourglass, Next, Prev } from './icons'
import { LeaveDialog } from './LeaveDialog'
import { QuestionView } from './QuestionView'
import { type ResultFilter, ResultsView } from './ResultsView'
import { ReviewPanel } from './ReviewPanel'
import { ReviewQuestion } from './ReviewQuestion'
import { TimeUpDialog } from './TimeUpDialog'

// The exam attempt, rebuilt from references/exam-simulation-ui.html: the question screen, Review &
// Finalize, pause, the timers, the time-up and leave dialogs, the results, and the review of each
// question. A completed attempt opens on its results, so a previous attempt uses the same screens.

export type AttemptApi = Pick<
  CertPracticeApi,
  'saveAttempt' | 'finishAttempt' | 'discardAttempt' | 'setAttemptOpen' | 'onCloseRequested' | 'confirmClose'
>

type Mode = 'q' | 'review' | 'confirm' | 'loading' | 'results' | 'rq'

interface State {
  i: number
  ans: (number[] | null)[]
  pick: number[][]
  flag: boolean[]
  strike: boolean[][]
  /** Seconds spent on each question. */
  qt: number[]
  left: number
  paused: boolean
  mode: Mode
  done: boolean
  timeout: boolean
  filter: ResultFilter
  justSaved: boolean
  /** The leave dialog is open, from the Return button or from closing the window. */
  leaving: null | 'return' | 'close'
  busy: boolean
  error: string | null
  /** The results row to scroll to. */
  focus: number | null
  /** The short spinner between questions. */
  loadingNext: boolean
}

interface ExamAttemptProps {
  attempt: Attempt
  /** "CompTIA A+ Core 1 Exam (220-1201)" */
  title: string
  api: AttemptApi
  /** After Save for later or Cancel attempt: back to the exam's page. */
  onExit: () => void
  /** "Start a new attempt" on the results: the exam's page. */
  onNewAttempt: () => void
  onHome: () => void
  /** The "Submitting your exam" delay. The draft's is 3–15 s. */
  submitDelayMs?: () => number
}

const draftDelay = () => 3000 + Math.floor(Math.random() * 12001)
const NEXT_SPINNER_MS = 250

function initial(attempt: Attempt): State {
  const done = attempt.status === 'completed'
  return {
    i: attempt.currentIndex,
    ans: attempt.states.map((s) => s.selected),
    pick: attempt.states.map((s) => s.selected ?? []),
    flag: attempt.states.map((s) => s.flagged),
    strike: attempt.states.map((s, k) =>
      s.struck.length ? s.struck : attempt.questions[k]!.options.map(() => false)
    ),
    qt: attempt.states.map((s) => s.seconds),
    left: attempt.timeLeftS,
    paused: false,
    mode: done ? 'results' : 'q',
    done,
    timeout: !done && attempt.timeLeftS <= 0,
    filter: 'all',
    justSaved: false,
    leaving: null,
    busy: false,
    error: null,
    focus: null,
    loadingNext: false
  }
}

function progress(s: State): AttemptProgress {
  return {
    timeLeftS: s.left,
    currentIndex: s.i,
    states: s.ans.map((selected, k) => ({
      selected,
      flagged: s.flag[k]!,
      struck: s.strike[k]!,
      seconds: s.qt[k]!
    }))
  }
}

const replace = <T,>(list: readonly T[], k: number, value: T): T[] =>
  list.map((v, j) => (j === k ? value : v))

export function ExamAttempt({
  attempt,
  title,
  api,
  onExit,
  onNewAttempt,
  onHome,
  submitDelayMs = draftDelay
}: ExamAttemptProps) {
  const [s, setS] = useState(() => initial(attempt))
  const [final, setFinal] = useState<Attempt | null>(attempt.status === 'completed' ? attempt : null)
  // The newest state for the timer, autosave, and key handlers.
  const latest = useRef(s)
  useLayoutEffect(() => {
    latest.current = s
  })
  const ticks = useRef(0)
  const n = attempt.questions.length
  const pace = Math.floor(attempt.timeLimitS / n)

  const save = useCallback(() => api.saveAttempt(attempt.id, progress(latest.current)), [api, attempt.id])

  // Autosave after each change, and every 5 s of the timer (see the tick below).
  useEffect(() => {
    if (s.done) return
    const t = setTimeout(() => void save().catch(() => {}), 400)
    return () => clearTimeout(t)
  }, [s.ans, s.flag, s.strike, s.i, s.done, s.timeout, save])

  // The 1-second timer. It stops while paused, while the leave dialog is open, and at time up.
  useEffect(() => {
    const id = setInterval(() => {
      setS((p) => {
        if (p.paused || p.done || p.timeout || p.leaving) return p
        const left = Math.max(0, p.left - 1)
        const qt = p.mode === 'q' ? replace(p.qt, p.i, p.qt[p.i]! + 1) : p.qt
        return { ...p, left, qt, timeout: left === 0, paused: false }
      })
      if (++ticks.current % 5 === 0 && !latest.current.done) void save().catch(() => {})
    }, 1000)
    return () => clearInterval(id)
  }, [save])

  // While the attempt is open, closing the window asks first (the main process stops the close).
  useEffect(() => {
    api.setAttemptOpen(!s.done)
    return () => api.setAttemptOpen(false)
  }, [api, s.done])

  useEffect(
    () =>
      api.onCloseRequested(() => {
        const cur = latest.current
        if (cur.done) api.confirmClose()
        else if (cur.timeout) void save().finally(() => api.confirmClose())
        else setS((p) => ({ ...p, leaving: 'close', error: null }))
      }),
    [api, save]
  )

  const go = useCallback(
    (j: number) => {
      setS((p) => {
        const i = Math.max(0, Math.min(n - 1, j))
        const forward = p.mode === 'q' && !p.done && i > p.i
        return { ...p, i, mode: p.mode === 'rq' ? 'rq' : 'q', justSaved: false, loadingNext: forward }
      })
    },
    [n]
  )

  useEffect(() => {
    if (!s.loadingNext) return
    const t = setTimeout(() => setS((p) => ({ ...p, loadingNext: false })), NEXT_SPINNER_MS)
    return () => clearTimeout(t)
  }, [s.loadingNext])

  const choose = (k: number) =>
    setS((p) => {
      if (p.strike[p.i]![k]) return p
      const q = attempt.questions[p.i]!
      const cur = p.pick[p.i]!
      const next = q.selectCount === 1 ? [k] : cur.includes(k) ? cur.filter((j) => j !== k) : [...cur, k]
      return { ...p, pick: replace(p.pick, p.i, next), justSaved: false }
    })

  const strike = (k: number) =>
    setS((p) => {
      const struck = !p.strike[p.i]![k]
      const ans = p.ans[p.i]
      return {
        ...p,
        strike: replace(p.strike, p.i, replace(p.strike[p.i]!, k, struck)),
        pick: struck
          ? replace(
              p.pick,
              p.i,
              p.pick[p.i]!.filter((j) => j !== k)
            )
          : p.pick,
        ans: struck && ans?.includes(k) ? replace(p.ans, p.i, null) : p.ans,
        justSaved: struck && ans?.includes(k) ? false : p.justSaved
      }
    })

  const confirm = () => {
    const i = latest.current.i
    setS((p) => ({
      ...p,
      ans: replace(
        p.ans,
        i,
        [...p.pick[i]!].sort((a, b) => a - b)
      ),
      justSaved: true
    }))
    if (i < n - 1) go(i + 1)
    else setS((p) => ({ ...p, mode: 'review', justSaved: false }))
  }

  const finalize = () => {
    const snapshot = progress(latest.current)
    setS((p) => ({ ...p, done: true, timeout: false, paused: false, mode: 'loading', error: null }))
    const wait = new Promise((resolve) => setTimeout(resolve, submitDelayMs()))
    Promise.all([api.finishAttempt(attempt.id, snapshot), wait])
      .then(([graded]) => {
        setFinal(graded)
        setS((p) => ({ ...p, mode: 'results' }))
        window.scrollTo(0, 0)
      })
      .catch((e: unknown) =>
        setS((p) => ({
          ...p,
          done: false,
          mode: 'review',
          error: `The exam could not be submitted: ${String(e)}`
        }))
      )
  }

  const leave = (how: 'save' | 'cancel') => {
    const closing = latest.current.leaving === 'close'
    setS((p) => ({ ...p, busy: true, error: null }))
    const work = how === 'save' ? save() : api.discardAttempt(attempt.id)
    work
      .then(() => {
        api.setAttemptOpen(false)
        if (closing) api.confirmClose()
        else onExit()
      })
      .catch((e: unknown) => setS((p) => ({ ...p, busy: false, error: `That did not work: ${String(e)}` })))
  }

  // Keys on the question screen: A–F select, Enter confirms, the arrow keys move.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const p = latest.current
      if (p.timeout || p.paused || p.leaving || p.mode !== 'q' || p.loadingNext) return
      if ((e.target as HTMLElement).matches?.('textarea,input')) return
      const q = attempt.questions[p.i]!
      const k = e.key.length === 1 ? 'abcdef'.indexOf(e.key.toLowerCase()) : -1
      if (k >= 0 && k < q.options.length) choose(k)
      else if (e.key === 'Enter') {
        const pick = p.pick[p.i]!
        if (pick.length > 0 && !sameAnswer(pick, p.ans[p.i]!)) {
          e.preventDefault()
          confirm()
        }
      } else if (e.key === 'ArrowRight') go(p.i + 1)
      else if (e.key === 'ArrowLeft') go(p.i - 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const answered = s.ans.filter((a) => a !== null).length
  const pct = (answered / n) * 100
  const navOn = (s.mode === 'q' || s.mode === 'rq') && !s.paused
  const modal = (s.timeout && !s.done) || s.leaving !== null

  let view
  if (s.paused)
    view = (
      <div
        className="panel"
        style={{
          minHeight: 320,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          textAlign: 'center'
        }}
      >
        <h2>Assessment paused</h2>
        <p className="sub" style={{ margin: 0, maxWidth: '44ch' }}>
          The timer is stopped and the questions are hidden. Select Resume to continue from question {s.i + 1}
          .
        </p>
        <button
          className="sm pri"
          style={{ padding: '10px 30px' }}
          onClick={() => setS((p) => ({ ...p, paused: false }))}
        >
          Resume
        </button>
      </div>
    )
  else if (s.loadingNext)
    view = (
      <div className="panel loading" role="status" aria-label="Loading next question">
        <div className="spin" aria-hidden="true" />
      </div>
    )
  else if (s.mode === 'q')
    view = (
      <QuestionView
        index={s.i}
        count={n}
        question={attempt.questions[s.i]!}
        answer={s.ans[s.i]!}
        pick={s.pick[s.i]!}
        struck={s.strike[s.i]!}
        justSaved={s.justSaved}
        paceLeft={pace - s.qt[s.i]!}
        onChoose={choose}
        onStrike={strike}
        onConfirm={confirm}
      />
    )
  else if (s.mode === 'review' || s.mode === 'confirm')
    view = (
      <>
        {s.error && (
          <p className="err" role="alert" style={{ padding: '12px 22px 0' }}>
            {s.error}
          </p>
        )}
        <ReviewPanel
          answered={s.ans.map((a) => a !== null)}
          flagged={s.flag}
          current={s.i}
          confirming={s.mode === 'confirm'}
          onGo={go}
          onFinalize={() => setS((p) => ({ ...p, mode: 'confirm' }))}
          onSubmit={finalize}
          onCancel={() => setS((p) => ({ ...p, mode: 'review' }))}
        />
      </>
    )
  else if (s.mode === 'loading')
    view = (
      <div className="panel loading" role="status" aria-live="polite">
        <div className="spin" aria-hidden="true" />
        <h2>Submitting your exam</h2>
        <p className="sub" style={{ margin: 0 }}>
          Your results are loading. Do not close or refresh this page.
        </p>
      </div>
    )
  else if (s.mode === 'results' && final?.result)
    view = (
      <ResultsView
        exam={final.exam}
        result={final.result}
        questions={final.questions}
        answers={s.ans}
        filter={s.filter}
        focus={s.focus}
        onFilter={(filter) => setS((p) => ({ ...p, filter }))}
        onOpen={(k) => {
          setS((p) => ({ ...p, i: k, mode: 'rq' }))
          window.scrollTo(0, 0)
        }}
        onNewAttempt={onNewAttempt}
      />
    )
  else if (s.mode === 'rq')
    view = (
      <ReviewQuestion
        index={s.i}
        count={n}
        question={attempt.questions[s.i]!}
        answer={s.ans[s.i]!}
        struck={s.strike[s.i]!}
        onBack={() => setS((p) => ({ ...p, mode: 'results', focus: p.i }))}
      />
    )

  return (
    <>
      {s.done && s.mode !== 'loading' && <TopBar onHome={onHome} />}
      <div className="exam">
        <div className="wrap" inert={modal}>
          <div className="head">
            <div>
              <h1>{title}</h1>
              <span className="sec">Section 1 of 1</span>
            </div>
            <div className="head-actions">
              <button
                className="pause"
                hidden={s.done || s.timeout}
                onClick={() => setS((p) => ({ ...p, paused: !p.paused }))}
              >
                {s.paused ? 'Resume' : 'Pause'}
              </button>
              <button
                className="ct-btn"
                hidden={s.done || s.timeout}
                onClick={() => setS((p) => ({ ...p, leaving: 'return', error: null }))}
              >
                Return
              </button>
            </div>
            <div className={`timers${s.left <= 300 ? ' low' : ''}`} role="timer" aria-label="Time left">
              <span>
                <Hourglass />
                This section: <b>{hms(s.left)}</b>
              </span>
              <span>
                <Hourglass />
                Total <b>{hms(s.left)}</b>
              </span>
            </div>
          </div>

          <div className="card">
            <div className="bar">
              <div className="nav">
                <button
                  aria-label="Previous question"
                  disabled={!navOn || s.i === 0}
                  onClick={() => go(s.i - 1)}
                >
                  <Prev />
                </button>
                <button
                  aria-label="Next question"
                  disabled={!navOn || s.i === n - 1}
                  onClick={() => go(s.i + 1)}
                >
                  <Next />
                </button>
              </div>
              <div className="pct">{pct.toFixed(1)}% Complete</div>
              <div className="track" aria-hidden="true">
                <div className="fill" style={{ width: `${pct}%` }} />
                <div className="tick" style={{ left: '25%' }} />
                <div className="tick" style={{ left: '50%' }} />
                <div className="tick" style={{ left: '75%' }} />
                <div className="knob l" />
                <div className="knob r" />
              </div>
              <label className="revisit" hidden={s.mode !== 'q' || s.done || s.paused}>
                <input
                  type="checkbox"
                  checked={s.flag[s.i]!}
                  onChange={(e) => setS((p) => ({ ...p, flag: replace(p.flag, p.i, e.target.checked) }))}
                />{' '}
                Revisit Later
              </label>
              <button
                className="review"
                disabled={s.done}
                onClick={() => setS((p) => ({ ...p, paused: false, mode: 'review', loadingNext: false }))}
              >
                {s.done ? 'Section finalized' : 'Review & Finalize Section'}
              </button>
            </div>
            {view}
          </div>
        </div>
        {s.timeout && !s.done && <TimeUpDialog onSubmit={finalize} />}
        {s.leaving && (
          <LeaveDialog
            busy={s.busy}
            error={s.error}
            onSave={() => leave('save')}
            onCancelAttempt={() => leave('cancel')}
            onStay={() => setS((p) => ({ ...p, leaving: null, error: null }))}
          />
        )}
      </div>
    </>
  )
}
