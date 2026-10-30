import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Catalog, ExerciseConfig } from '@shared/types'
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
