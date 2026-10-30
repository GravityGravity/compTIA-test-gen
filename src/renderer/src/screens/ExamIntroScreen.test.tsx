import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { parseExam } from '@engine/config'
import { summary } from '../test/exam-fixtures'
import { ExamIntroScreen } from './ExamIntroScreen'

const core1 = {
  ...parseExam(JSON.parse(readFileSync('config/exams/220-1201.json', 'utf8')), 'core1'),
  active: true
}
const cert = { id: 'a-plus', name: 'CompTIA A+', shortName: 'CompTIA A+', active: true, exams: ['220-1201'] }

function setup(saved = null as ReturnType<typeof summary> | null) {
  const props = { onStart: vi.fn(), onResume: vi.fn(), onDiscard: vi.fn(), onHome: vi.fn() }
  render(
    <ExamIntroScreen
      exam={core1}
      certification={cert}
      saved={saved}
      error={null}
      starting={false}
      {...props}
    />
  )
  return props
}

describe('ExamIntroScreen', () => {
  it('shows the values from the exam config', () => {
    setup()
    expect(screen.getByRole('heading', { level: 1, name: 'Core 1 Exam' })).toBeInTheDocument()
    expect(screen.getByText('675 of 900')).toBeInTheDocument()
    expect(screen.getByText('90 minutes')).toBeInTheDocument()
  })

  it('lists the domains with the questions each gets', () => {
    setup()
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(rows.map((r) => r.lastElementChild?.textContent)).toEqual(['11', '19', '21', '9', '23'])
    expect(
      screen.getByText(/Counts are for an 83-question exam\. About 52% of the questions are scenario-based\./)
    ).toBeInTheDocument()
  })

  it('starts the exam, and shows a saved attempt with Resume and Discard', async () => {
    const saved = summary({ status: 'in_progress' })
    const props = setup(saved)
    expect(screen.getByText('Saved for later')).toBeInTheDocument()
    expect(screen.getByText('Starting a new exam deletes this saved attempt.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Start exam' }))
    await userEvent.click(screen.getByRole('button', { name: 'Resume exam' }))
    expect(props.onStart).toHaveBeenCalled()
    expect(props.onResume).toHaveBeenCalledWith(saved.id)
  })
})
