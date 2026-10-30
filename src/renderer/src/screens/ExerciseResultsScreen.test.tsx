import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AnswerResult } from '@engine/exercise/types'
import { acronymExercise, questions } from '../test/fixtures'
import { ExerciseResultsScreen } from './ExerciseResultsScreen'

const results: AnswerResult[] = [
  {
    status: 'answered',
    text: 'Domain Name Sytem',
    correct: false,
    misspelled: [{ word: 'Sytem', start: 12, end: 17 }]
  },
  { status: 'unanswered' }
]

function setup(timeUp = false) {
  const onTryAgain = vi.fn()
  render(
    <ExerciseResultsScreen
      exercise={acronymExercise}
      certificationLabel="CompTIA A+"
      questions={[questions[0]!, questions[1]!]}
      results={results}
      timeUp={timeUp}
      onTryAgain={onTryAgain}
      onHome={() => {}}
    />
  )
  return { onTryAgain, user: userEvent.setup() }
}

describe('ExerciseResultsScreen', () => {
  it('shows the counts, the spelling errors, and each answer', () => {
    setup()
    expect(screen.getByText('0/2')).toBeInTheDocument()
    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]!).getByText('Sytem')).toHaveClass('miss')
    expect(within(rows[1]!).getByText('Not answered')).toBeInTheDocument()
    expect(screen.getByText('Spelling errors').previousSibling).toHaveTextContent('1')
    expect(screen.queryByText(/Time is up/)).toBeNull()
  })

  it('says when the time ran out', () => {
    setup(true)
    expect(screen.getByText(/Time is up. The exercise ended after 12 minutes/)).toBeInTheDocument()
  })

  it('"Try again" starts a new exercise', async () => {
    const { user, onTryAgain } = setup()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onTryAgain).toHaveBeenCalled()
  })
})
