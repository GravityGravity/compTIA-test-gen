import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Catalog, ExerciseConfig } from '@shared/types'
import { summary } from '../test/exam-fixtures'
import { exams } from '../test/fixtures'
import { HomeScreen } from './HomeScreen'

const exercise = (id: string, name: string, active: boolean): ExerciseConfig => ({
  id,
  name,
  active,
  content: 'acronyms',
  certifications: ['a-plus'],
  questionCount: 20,
  timeLimitMinutes: 12,
  onTimeUp: 'end',
  selection: 'random',
  questionTypes: [{ type: 'typed', prompt: 'acronym', answer: 'expanded', count: 20 }]
})

const catalog: Catalog = {
  exams: [],
  certifications: [
    { id: 'a-plus', name: 'A+', shortName: 'A+', active: true, exams: ['220-1201', '220-1202'] }
  ],
  exercises: [
    exercise('acronym-exercise', 'Acronym Exercise', true),
    exercise('later', 'Later Exercise', false)
  ]
}

function card(name: string): HTMLElement {
  return screen.getByRole('heading', { name }).closest('article') as HTMLElement
}

describe('HomeScreen', () => {
  it('shows each exercise with its question count and time', () => {
    render(<HomeScreen catalog={catalog} onStartExercise={() => {}} />)
    const acronym = within(card('Acronym Exercise'))
    expect(acronym.getByText('20')).toBeInTheDocument()
    expect(acronym.getByText('12 min')).toBeInTheDocument()
    expect(acronym.getByRole('button', { name: 'Start exercise' })).toBeEnabled()
  })

  it('greys out an inactive module so it cannot be selected', () => {
    render(<HomeScreen catalog={catalog} onStartExercise={() => {}} />)
    const later = card('Later Exercise')
    expect(later).toHaveAttribute('aria-disabled', 'true')
    expect(later).toHaveClass('inactive')
    expect(within(later).getByText('Coming later')).toBeInTheDocument()
    expect(within(later).getByRole('button', { name: 'Not available' })).toBeDisabled()
  })
})

describe('HomeScreen: exams and attempts', () => {
  const withExams: Catalog = { ...catalog, exams: [{ ...exams[0]!, active: true }, exams[1]!] }

  it('shows each exam from its config, and greys out an inactive one', () => {
    const onOpenExam = vi.fn()
    render(<HomeScreen catalog={withExams} onOpenExam={onOpenExam} />)
    const core1 = within(card('Core 1 Exam'))
    expect(core1.getByText('75–90')).toBeInTheDocument()
    expect(core1.getByText('675')).toBeInTheDocument()
    expect(core1.getByRole('button', { name: 'Start exam' })).toBeEnabled()
    expect(card('Core 2 Exam')).toHaveClass('inactive')
    expect(within(card('Core 2 Exam')).getByRole('button', { name: 'Not available' })).toBeDisabled()
  })

  it('shows an attempt in progress with Resume and Discard', async () => {
    const onResume = vi.fn()
    const onDiscard = vi.fn()
    const saved = summary({
      status: 'in_progress',
      currentIndex: 33,
      answered: 33,
      flagged: 4,
      timeLeftS: 3138
    })
    render(<HomeScreen catalog={withExams} inProgress={[saved]} onResume={onResume} onDiscard={onDiscard} />)
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('34 of 84')).toBeInTheDocument()
    expect(screen.getByText('00:52:18')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Resume exam' }))
    await userEvent.click(screen.getByRole('button', { name: 'Discard attempt' }))
    expect(onResume).toHaveBeenCalledWith(saved.id)
    expect(onDiscard).toHaveBeenCalledWith(saved.id)
  })

  it('lists the 3 most recent attempts, with the best score and a link to all', async () => {
    const onViewAttempts = vi.fn()
    const list = [712, 641, 590, 700].map((score, i) =>
      summary({ id: `id-${i}`, score, passed: score >= 675 })
    )
    render(
      <HomeScreen catalog={withExams} attempts={list} onReview={() => {}} onViewAttempts={onViewAttempts} />
    )
    expect(screen.getAllByRole('button', { name: 'Review attempt' })).toHaveLength(3)
    expect(screen.getByText('Best Core 1 score')).toBeInTheDocument()
    expect(screen.getAllByText('712').length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: 'View all 4 attempts' }))
    expect(onViewAttempts).toHaveBeenCalled()
  })
})
