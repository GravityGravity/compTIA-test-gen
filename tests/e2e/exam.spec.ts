import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'

// Runs the app on the test data in tests/fixtures/app-data (an active Core 1 Exam with 12–14 questions)
// and a new user-data folder, so the real database is not touched.

const DATA = resolve('tests/fixtures/app-data')

function launch(userData: string): Promise<ElectronApplication> {
  return electron.launch({
    args: ['.'],
    env: { ...process.env, CERT_PRACTICE_DATA: DATA, CERT_PRACTICE_USER_DATA: userData }
  })
}

async function startCore1(page: Page) {
  const card = page.locator('article', { has: page.getByRole('heading', { name: 'Core 1 Exam' }) })
  await card.getByRole('button', { name: 'Start exam' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Core 1 Exam' })).toBeVisible()
  await page.getByRole('button', { name: 'Start exam' }).click()
  await expect(page.getByText(/^Question 1 of 1[234]$/)).toBeVisible()
}

test('an exam attempt: answer, save for later, resume after a relaunch, submit, and review', async () => {
  test.setTimeout(90_000)
  const userData = mkdtempSync(join(tmpdir(), 'cert-practice-e2e-'))
  try {
    let app = await launch(userData)
    let page = await app.firstWindow()
    await startCore1(page)

    // Answer the first question with the keyboard, mark the second, and leave with Save for later.
    await page.keyboard.press('a')
    await page.keyboard.press('Enter')
    await expect(page.getByText(/^Question 2 of/)).toBeVisible()
    await page.getByLabel('Revisit Later').check()
    await page.getByRole('button', { name: 'Return' }).click()
    await page.getByRole('button', { name: /Save for later/ }).click()
    await expect(page.getByText('Saved for later')).toBeVisible()
    await app.close()

    // After a relaunch the home screen offers to resume it.
    app = await launch(userData)
    page = await app.firstWindow()
    const resume = page.locator('section', { has: page.getByText('In progress') })
    await expect(resume.getByText('Answered')).toBeVisible()
    await expect(resume.locator('dd').nth(2)).toHaveText('1')
    await expect(resume.locator('dd').nth(3)).toHaveText('1')
    await resume.getByRole('button', { name: 'Resume exam' }).click()
    await expect(page.getByText(/^Question 2 of/)).toBeVisible()

    // Review, finalize, and submit (the draft's 3–15 s delay), then the results.
    await page.getByRole('button', { name: 'Review & Finalize Section' }).click()
    await page.getByRole('button', { name: 'Finalize Submission' }).click()
    await page.getByRole('button', { name: 'Submit Exam' }).click()
    await expect(page.getByRole('heading', { name: 'Submitting your exam' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Assessment Results' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('table', { name: 'Results by domain' })).toBeVisible()
    await expect(page.getByText(/Did not pass|Pass/).first()).toBeVisible()

    // The attempt is on the home screen and opens on the same results screen.
    await page.getByRole('button', { name: 'Start a new attempt' }).click()
    await page.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
    await expect(page.locator('section', { has: page.getByText('In progress') })).toHaveCount(0)
    await page.getByRole('button', { name: 'Review attempt' }).click()
    await expect(page.getByRole('heading', { name: 'Assessment Results' })).toBeVisible()
    await page.locator('[data-rv]').first().click()
    await expect(page.getByRole('button', { name: 'Back to results' })).toBeVisible()
    await app.close()
  } finally {
    rmSync(userData, { recursive: true, force: true })
  }
})

test('closing the window during an attempt asks first', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'cert-practice-e2e-'))
  try {
    const app = await launch(userData)
    const page = await app.firstWindow()
    await startCore1(page)
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.close())
    await expect(page.getByRole('alertdialog', { name: 'Leave this exam?' })).toBeVisible()
    await page.getByRole('button', { name: 'Keep working' }).click()
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    // Cancel attempt deletes it and closes the app.
    const closed = app.waitForEvent('close')
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.close())
    await page.getByRole('button', { name: /Cancel attempt/ }).click()
    await closed
  } finally {
    rmSync(userData, { recursive: true, force: true })
  }
})
