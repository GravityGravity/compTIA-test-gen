import { planAttempt } from '@engine/exam/allocate'
import type { AttemptSummary } from '@shared/exam'
import type { CertificationConfig, ExamConfig } from '@shared/types'
import { Crumbs } from '../components/Crumbs'
import { Facts } from '../components/Facts'
import { Hero } from '../components/Hero'
import { ResumeCard } from '../components/ResumeCard'

interface ExamIntroScreenProps {
  exam: ExamConfig
  certification: CertificationConfig
  saved: AttemptSummary | null
  error: string | null
  starting: boolean
  onStart: () => void
  onResume: (id: string) => void
  onDiscard: (id: string) => void
  onHome: () => void
}

/** An exam's page: what the attempt is like, its domains, and a saved attempt. All values come from the config. */
export function ExamIntroScreen(p: ExamIntroScreenProps) {
  const { exam } = p
  const { min, max } = exam.questionCount
  // The domain table shows the counts for a mid-range attempt.
  const sample = Math.round((min + max) / 2)
  const plan = planAttempt(exam, sample)
  const heaviest = Math.max(...exam.domains.map((d) => d.weight))
  const scenario = plan.reduce((s, d) => s + d.generated + d.poolScenario, 0)
  return (
    <>
      <Crumbs onHome={p.onHome} trail={[exam.name]} />
      <Hero title={exam.name} subtitle={`${p.certification.shortName} ${exam.id} practice exam`} />
      <main className="page">
        {p.saved && (
          <ResumeCard
            attempt={p.saved}
            eyebrow="Saved for later"
            title={`You have a ${exam.name} in progress`}
            note="Starting a new exam deletes this saved attempt."
            onResume={() => p.onResume(p.saved!.id)}
            onDiscard={() => p.onDiscard(p.saved!.id)}
          />
        )}
        <section className="card stack-6" aria-labelledby="sumTitle">
          <h2 className="h2" id="sumTitle">
            Before you start
          </h2>
          <div style={{ maxWidth: 480 }}>
            <Facts
              items={[
                ['Questions', min === max ? String(min) : `${min}–${max}`],
                ['Question types', 'Single and multiple response'],
                ['Time', `${exam.timeLimitMinutes} minutes`],
                ['Passing score', `${exam.passingScore} of ${exam.maxScore}`]
              ]}
            />
          </div>
          <ul className="stack-2" style={{ margin: 0, paddingLeft: 20 }}>
            <li>You can pause the exam. The questions are hidden while the timer is stopped.</li>
            <li>
              Mark a question with <b>Revisit Later</b> and go back to it from the review screen.
            </li>
            <li>
              On a &quot;Choose two&quot; question, you get part credit only if you select no wrong answers.
            </li>
            <li>If you close the app, your attempt is saved. You can resume it from the home screen.</li>
          </ul>
          {p.error && (
            <p className="small" role="alert">
              {p.error}
            </p>
          )}
          <div className="btn-row">
            <button className="btn btn-primary" disabled={!exam.active || p.starting} onClick={p.onStart}>
              {p.starting ? 'Starting…' : 'Start exam'}
            </button>
            <button className="btn btn-outline" onClick={p.onHome}>
              Back to home
            </button>
          </div>
        </section>

        <section className="card stack-6" aria-labelledby="domTitle">
          <div className="stack-2">
            <h2 className="h2" id="domTitle">
              Domains
            </h2>
            <p>The number of questions from each domain follows its weight.</p>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Domain</th>
                <th className="num">Weight</th>
                <th style={{ width: '30%' }}>
                  <span className="visually-hidden">Weight bar</span>
                </th>
                <th className="num">Questions</th>
              </tr>
            </thead>
            <tbody>
              {plan.map(({ domain, total }) => (
                <tr key={domain.id}>
                  <td>{domain.name}</td>
                  <td className="num">{domain.weight}%</td>
                  <td>
                    <div className="bar">
                      <i style={{ width: `${Math.round((100 * domain.weight) / heaviest)}%` }} />
                    </div>
                  </td>
                  <td className="num">{total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small">
            Counts are for {/^(8|11|18)/.test(String(sample)) ? 'an' : 'a'} {sample}-question exam. About{' '}
            {Math.round((100 * scenario) / sample)}% of the questions are scenario-based.
          </p>
        </section>
      </main>
    </>
  )
}
