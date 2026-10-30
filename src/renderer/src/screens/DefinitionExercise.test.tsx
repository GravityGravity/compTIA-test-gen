import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { choiceQuestion, definitionExercise, exams, fakeSpell, typedDefinition } from '../test/fixtures'
import { ExerciseResultsScreen } from './ExerciseResultsScreen'
import { ExerciseScreen } from './ExerciseScreen'

const spell = fakeSpell('firewall fw')

function setup() {
  const onFinish = vi.fn()
  render(
    <ExerciseScreen
      exercise={definitionExercise}
      certificationLabel="CompTIA A+"
      questions={[choiceQuestion, typedDefinition]}
      exams={exams}
      spell={spell}
      onFinish={onFinish}
      onLeave={() => {}}
    />
  )
  return { onFinish, user: userEvent.setup() }
}

describe('Definition Exercise', () => {
  it('asks a multiple-choice question and marks the right and the wrong option', async () => {
    const { user } = setup()
    expect(screen.getByText('Term to definition')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Not sure' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: /Mirrors two drives/ }))
    await user.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByRole('status')).toHaveTextContent('Incorrect')
    expect(screen.getByRole('status')).toHaveTextContent('RAID 5: Stripes data and parity')
    expect(screen.getByRole('radio', { name: /three or more drives/ })).toHaveTextContent('Correct answer')
    expect(screen.getByRole('radio', { name: /Mirrors two drives/ })).toHaveTextContent('Your answer')
  })

  it('selects an option with its letter key', async () => {
    const { user } = setup()
    await user.keyboard('b')
    expect(screen.getByRole('radio', { name: /three or more drives/ })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    await user.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByRole('status')).toHaveTextContent('Correct')
  })

  it('asks the typed question definition → term, then reports both answers', async () => {
    const { user, onFinish } = setup()
    await user.keyboard('a')
    await user.click(screen.getByRole('button', { name: 'Check answer' }))
    await user.click(screen.getByRole('button', { name: 'Next question' }))
    expect(screen.getByText('Type the term for this definition.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Your answer'), 'firewall{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('Correct')
    expect(screen.getByRole('status')).toHaveTextContent('The term is Firewall (FW).')
    await user.click(screen.getByRole('button', { name: 'See results' }))
    expect(onFinish).toHaveBeenCalledWith(
      [
        { status: 'chosen', choice: 0, correct: false },
        expect.objectContaining({ status: 'answered', correct: true })
      ],
      false
    )
  })

  it('accepts the acronym of the term', async () => {
    const { user } = setup()
    await user.keyboard('a')
    await user.click(screen.getByRole('button', { name: 'Check answer' }))
    await user.click(screen.getByRole('button', { name: 'Next question' }))
    await user.type(screen.getByLabelText('Your answer'), 'fw{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('Correct')
  })

  it('shows the chosen option in the results', () => {
    render(
      <ExerciseResultsScreen
        exercise={definitionExercise}
        certificationLabel="CompTIA A+"
        questions={[choiceQuestion, typedDefinition]}
        results={[
          { status: 'chosen', choice: 0, correct: false },
          { status: 'answered', text: 'Firewall', correct: true, misspelled: [] }
        ]}
        timeUp={false}
        onTryAgain={() => {}}
        onHome={() => {}}
      />
    )
    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]!).getByText('Mirrors two drives.')).toBeInTheDocument()
    expect(within(rows[0]!).getByText('Incorrect')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('Correct')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })
})
