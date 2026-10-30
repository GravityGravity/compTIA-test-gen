import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { acronymExercise, exams, fakeSpell, questions } from '../test/fixtures'
import { ExerciseScreen } from './ExerciseScreen'

const spell = fakeSpell('domain name system keyboard video mouse')

function setup(overrides: Partial<Parameters<typeof ExerciseScreen>[0]> = {}) {
  const onFinish = vi.fn()
  const onLeave = vi.fn()
  render(
    <ExerciseScreen
      exercise={acronymExercise}
      certificationLabel="CompTIA A+"
      questions={questions}
      exams={exams}
      spell={spell}
      onFinish={onFinish}
      onLeave={onLeave}
      {...overrides}
    />
  )
  return { onFinish, onLeave, user: userEvent.setup() }
}

afterEach(() => vi.useRealTimers())

describe('ExerciseScreen', () => {
  it('shows the acronym, the progress, and the timer from the config', () => {
    setup()
    expect(screen.getByText('DNS')).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent('12:00')
    expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Not sure' })).toBeEnabled()
  })

  it('marks a correct answer, with the meaning and the objective tags', async () => {
    const { user } = setup()
    await user.type(screen.getByLabelText('Your answer'), 'domain name SYSTEM')
    await user.click(screen.getByRole('button', { name: 'Check answer' }))
    const feedback = screen.getByRole('status')
    expect(feedback).toHaveTextContent('Correct')
    expect(feedback).toHaveTextContent('DNS stands for Domain Name System.')
    expect(feedback).toHaveTextContent('DNS translates host names')
    expect(screen.getByText('Core 1 · 2.1 Networking')).toBeInTheDocument()
    expect(screen.getByText('+2 more')).toBeInTheDocument()
    expect(screen.getByLabelText('Your answer')).toBeDisabled()
  })

  it('underlines a misspelled word and marks the answer incorrect', async () => {
    const { user } = setup()
    await user.type(screen.getByLabelText('Your answer'), 'Domain Name Sytem')
    expect(screen.getByTestId('spell-mirror').querySelector('.miss')).toHaveTextContent('Sytem')
    await user.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByRole('status')).toHaveTextContent('Incorrect')
    expect(screen.getByRole('status')).toHaveTextContent('Spelling errors count as incorrect.')
  })

  it('"Not sure" shows the answer and needs no text', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Not sure' }))
    expect(screen.getByRole('status')).toHaveTextContent('Not sure')
    expect(screen.getByRole('status')).toHaveTextContent('DNS stands for Domain Name System.')
  })

  it('Enter checks the answer, then goes to the next question; the last one opens the results', async () => {
    const { user, onFinish } = setup()
    await user.type(screen.getByLabelText('Your answer'), 'Domain Name System{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('Correct')
    await user.click(screen.getByRole('button', { name: 'Next question' }))
    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Not sure' }))
    expect(screen.queryByLabelText('Exam objectives')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'See results' }))
    expect(onFinish).toHaveBeenCalledWith(
      [expect.objectContaining({ status: 'answered', correct: true }), { status: 'unsure' }],
      false
    )
  })

  it('ends the exercise when the time runs out', () => {
    vi.useFakeTimers()
    let t = 0
    const { onFinish } = setup({ now: () => t })
    t = 12 * 60_000
    act(() => vi.advanceTimersByTime(300))
    expect(onFinish).toHaveBeenCalledWith([{ status: 'unanswered' }, { status: 'unanswered' }], true)
  })

  it('"End exercise" asks first, then opens the results', async () => {
    const { user, onFinish } = setup()
    await user.click(screen.getByRole('button', { name: 'End exercise' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('End the exercise?')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'End exercise' }))
    await user.click(screen.getByRole('button', { name: 'See results' }))
    expect(onFinish).toHaveBeenCalledWith(expect.any(Array), false)
  })

  it('Home asks before it leaves', async () => {
    const { user, onLeave } = setup()
    await user.click(screen.getByRole('link', { name: 'Home' }))
    await user.click(screen.getByRole('button', { name: 'Leave' }))
    expect(onLeave).toHaveBeenCalled()
  })
})
