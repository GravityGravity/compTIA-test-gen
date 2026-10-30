import { readFileSync } from 'node:fs'
import { _electron as electron, expect, test } from '@playwright/test'

const acronyms: Array<{ acronym: string; expanded: string }> = JSON.parse(
  readFileSync('content/acronyms/a-plus.json', 'utf8')
)

test('an Acronym Exercise from setup to results, then Try again', async () => {
  const app = await electron.launch({ args: ['.'] })
  try {
    const page = await app.firstWindow()
    const exerciseCard = page.locator('article', {
      has: page.getByRole('heading', { name: 'Acronym Exercise' })
    })
    await exerciseCard.getByRole('button', { name: 'Start exercise' }).click()

    // Setup: A+ and Both are the defaults.
    await expect(page.getByRole('radio', { name: /Both \(Core 1 and Core 2\)/ })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    await page.getByRole('button', { name: 'Start exercise' }).click()

    // Question 1: type the right answer from content/.
    await expect(page.getByText('Question 1 of 20')).toBeVisible()
    await expect(page.getByRole('timer')).toHaveText(/^1[12]:\d\d$/)
    const shown = (await page.locator('.prompt').textContent())!.trim()
    const expanded = acronyms.find((r) => r.acronym === shown)!.expanded
    await page.getByLabel('Your answer').fill(expanded.toLowerCase())
    await page.getByLabel('Your answer').press('Enter')
    await expect(page.getByRole('status')).toContainText('Correct')
    await page.getByRole('button', { name: 'Next question' }).click()

    // Question 2: a misspelled word gets the squiggle and the answer is incorrect.
    await page.getByLabel('Your answer').fill('Qwertyuiop')
    await expect(page.locator('.mirror .miss')).toHaveText('Qwertyuiop')
    await page.getByRole('button', { name: 'Check answer' }).click()
    await expect(page.getByRole('status')).toContainText('Incorrect')
    await page.getByRole('button', { name: 'Next question' }).click()

    // Question 3: Not sure.
    await page.getByRole('button', { name: 'Not sure' }).click()
    await expect(page.getByRole('status')).toContainText('Not sure')

    // End early: the rest count as not answered.
    await page.getByRole('button', { name: 'End exercise' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'See results' }).click()
    await expect(page.getByRole('heading', { name: 'Exercise results' })).toBeVisible()
    await expect(page.getByText('1/20')).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Not sure' })).toHaveCount(1)
    await expect(page.getByRole('cell', { name: 'Not answered' })).toHaveCount(17)
    await page.getByRole('button', { name: /Incorrect only \(19\)/ }).click()
    await expect(page.locator('tbody tr')).toHaveCount(19)

    // Try again skips the setup screen.
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByText('Question 1 of 20')).toBeVisible()

    // Home asks first.
    await page.getByRole('link', { name: 'Home' }).click()
    await page.getByRole('button', { name: 'Leave' }).click()
    await expect(page.getByRole('heading', { name: 'Practice for your certification exams' })).toBeVisible()
  } finally {
    await app.close()
  }
})
