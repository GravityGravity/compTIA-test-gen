import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { acronymExercise, catalog, records } from '../test/fixtures'
import { ExerciseSetupScreen } from './ExerciseSetupScreen'

function setup() {
  const onStart = vi.fn()
  render(
    <ExerciseSetupScreen
      exercise={acronymExercise}
      catalog={catalog}
      records={records}
      onStart={onStart}
      onHome={() => {}}
    />
  )
  return { onStart, user: userEvent.setup() }
}

describe('ExerciseSetupScreen', () => {
  it('defaults to A+ with Both exams, and counts the records for each choice', async () => {
    const { user, onStart } = setup()
    expect(screen.getByRole('radio', { name: /CompTIA A\+/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: /Both \(Core 1 and Core 2\)/ })).toHaveTextContent('3 acronyms')
    expect(screen.getByRole('radio', { name: /Core 1 \(220-1201\)/ })).toHaveTextContent('2 acronyms')
    await user.click(screen.getByRole('button', { name: 'Start exercise' }))
    expect(onStart).toHaveBeenCalledWith({
      exerciseId: 'acronym-exercise',
      certification: 'a-plus',
      exams: ['220-1201', '220-1202']
    })
  })

  it('selects one exam', async () => {
    const { user, onStart } = setup()
    await user.click(screen.getByRole('radio', { name: /Core 2 \(220-1202\)/ }))
    await user.click(screen.getByRole('button', { name: 'Start exercise' }))
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ exams: ['220-1202'] }))
  })

  it('has no exam picker for a certification with one exam', async () => {
    const { user, onStart } = setup()
    await user.click(screen.getByRole('radio', { name: /Network\+/ }))
    expect(screen.queryByText('Select an exam')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Start exercise' }))
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({ certification: 'network-plus', exams: ['N10-009'] })
    )
  })

  it('shows the values from the config', () => {
    setup()
    expect(screen.getByText('Type the expanded form of each acronym')).toBeInTheDocument()
    expect(screen.getByText('12 minutes')).toBeInTheDocument()
  })
})
