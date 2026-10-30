import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { completedAttempt, fakeApi, inProgressAttempt } from '../test/exam-fixtures'
import { ExamAttempt } from './ExamAttempt'

function setup(attempt = inProgressAttempt()) {
  const { api, requestClose } = fakeApi()
  const onExit = vi.fn()
  const onNewAttempt = vi.fn()
  const onHome = vi.fn()
  render(
    <ExamAttempt
      attempt={attempt}
      title="CompTIA A+ Core 1 Exam (220-1201)"
      api={api}
      onExit={onExit}
      onNewAttempt={onNewAttempt}
      onHome={onHome}
      submitDelayMs={() => 0}
    />
  )
  return { api, requestClose, onExit, onNewAttempt, onHome, user: userEvent.setup() }
}

const key = (letter: string) => screen.getByRole('button', { name: new RegExp(`^${letter}$`) })

afterEach(() => vi.useRealTimers())

describe('ExamAttempt: question screen', () => {
  it('shows the question, the timers, and the progress', () => {
    setup()
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument()
    expect(screen.getByText('Which port does RDP use?')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent('01:30:00')
    expect(screen.getByText('0.0% Complete')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Report Content Errors/ })).toBeDisabled()
  })

  it('confirms an answer, goes on, and autosaves it', async () => {
    const { user, api } = setup()
    await user.click(key('A'))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText('Question 2 of 3')).toBeInTheDocument()
    expect(screen.getByText('33.3% Complete')).toBeInTheDocument()
    await vi.waitFor(() =>
      expect(api.saveAttempt).toHaveBeenLastCalledWith(
        '00000000-0000-4000-8000-000000000001',
        expect.objectContaining({
          states: expect.arrayContaining([expect.objectContaining({ selected: [0] })])
        })
      )
    )
  })

  it('lets a multiple-response question take two answers, and A–D keys select', async () => {
    const { user } = setup(inProgressAttempt({ currentIndex: 1 }))
    expect(screen.getByText('Select all that apply.')).toBeInTheDocument()
    await user.keyboard('a')
    await user.keyboard('c')
    expect(key('A')).toHaveAttribute('aria-pressed', 'true')
    expect(key('C')).toHaveAttribute('aria-pressed', 'true')
  })

  it('eliminates an option, so its key cannot be selected', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Eliminate option B' }))
    expect(key('B')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Restore option B' })).toBeInTheDocument()
  })

  it('hides the questions while paused and stops the timer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('heading', { name: 'Assessment paused' })).toBeInTheDocument()
    expect(screen.queryByText('Which port does RDP use?')).not.toBeInTheDocument()
    const before = screen.getByRole('timer').textContent
    act(() => vi.advanceTimersByTime(3000))
    expect(screen.getByRole('timer').textContent).toBe(before)
  })

  it('opens the time-up dialog when the time runs out', () => {
    vi.useFakeTimers()
    setup(inProgressAttempt({ timeLeftS: 2 }))
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByRole('alertdialog', { name: 'Time is up' })).toBeInTheDocument()
  })
})

describe('ExamAttempt: review, submit, and results', () => {
  it('reviews, finalizes, and shows the score with the domain breakdown', async () => {
    const { user, api } = setup()
    await user.click(screen.getByRole('button', { name: 'Review & Finalize Section' }))
    expect(screen.getByText('Unanswered:')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Finalize Submission' }))
    expect(screen.getByText(/You have 3 unanswered questions/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Submit Exam' }))
    expect(await screen.findByRole('heading', { name: 'Assessment Results' })).toBeInTheDocument()
    expect(api.finishAttempt).toHaveBeenCalled()
    const domains = screen.getByRole('table', { name: 'Results by domain' })
    expect(within(domains).getByText('1.0 Mobile Devices')).toBeInTheDocument()
    expect(within(domains).getByText('1 of 2')).toBeInTheDocument()
  })

  it('filters the results and opens a question with its result banner', async () => {
    const { user, onNewAttempt } = setup(completedAttempt())
    expect(screen.getByText('Did not pass (675 required)')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Correct only (1)' }))
    expect(screen.getAllByRole('listitem').filter((li) => li.dataset.rv !== undefined)).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Incorrect only (2)' }))
    await user.click(screen.getByText('2. Which TWO are input devices? (Choose two.)'))
    expect(screen.getByRole('status')).toHaveTextContent('Partially correct')
    expect(screen.getByRole('list', { name: 'Why the other options are wrong' })).toHaveTextContent(
      'Speaker is wrong.'
    )
    await user.click(screen.getByRole('button', { name: 'Back to results' }))
    await user.click(screen.getByRole('button', { name: 'Start a new attempt' }))
    expect(onNewAttempt).toHaveBeenCalled()
  })

  it('opens a previous attempt on its results, with a Home link and no Return', () => {
    setup(completedAttempt())
    expect(screen.getByRole('heading', { name: 'Assessment Results' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Return' })).not.toBeInTheDocument()
  })
})

describe('ExamAttempt: leaving', () => {
  it('Return → Save for later saves and goes back to the exam page', async () => {
    const { user, api, onExit } = setup()
    await user.click(screen.getByRole('button', { name: 'Return' }))
    expect(screen.getByRole('alertdialog', { name: 'Leave this exam?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Save for later/ }))
    await vi.waitFor(() => expect(onExit).toHaveBeenCalled())
    expect(api.saveAttempt).toHaveBeenCalled()
    expect(api.discardAttempt).not.toHaveBeenCalled()
  })

  it('Cancel attempt deletes it; Keep working and Escape close the dialog', async () => {
    const { user, api, onExit } = setup()
    await user.click(screen.getByRole('button', { name: 'Return' }))
    await user.click(screen.getByRole('button', { name: 'Keep working' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Return' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Return' }))
    await user.click(screen.getByRole('button', { name: /Cancel attempt/ }))
    await vi.waitFor(() => expect(onExit).toHaveBeenCalled())
    expect(api.discardAttempt).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001')
  })

  it('closing the window opens the dialog, and saving then closes the app', async () => {
    const { user, api, requestClose, onExit } = setup()
    expect(api.setAttemptOpen).toHaveBeenCalledWith(true)
    act(() => requestClose())
    await user.click(screen.getByRole('button', { name: /Save for later/ }))
    await vi.waitFor(() => expect(api.confirmClose).toHaveBeenCalled())
    expect(onExit).not.toHaveBeenCalled()
  })
})
