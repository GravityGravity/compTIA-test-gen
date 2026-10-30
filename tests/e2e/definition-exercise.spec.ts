import { _electron as electron, expect, test } from '@playwright/test'

test('a Definition Exercise for Network+ with both question formats', async () => {
  const app = await electron.launch({ args: ['.'] })
  try {
    const page = await app.firstWindow()
    await page
      .locator('article', { has: page.getByRole('heading', { name: 'Definition Exercise' }) })
      .getByRole('button', { name: 'Start exercise' })
      .click()

    // Network+ has one exam, so there is no exam picker.
    await page.getByRole('radio', { name: /Network\+/ }).click()
    await expect(page.getByText('Select an exam')).toHaveCount(0)
    await expect(page.getByText('15 minutes')).toBeVisible()
    await page.getByRole('button', { name: 'Start exercise' }).click()

    // Answer all 20: the first option of each multiple-choice question, "x" for each typed one.
    let choice = 0
    let typed = 0
    for (let n = 1; n <= 20; n++) {
      await expect(page.getByText(`Question ${n} of 20`)).toBeVisible()
      if ((await page.getByLabel('Your answer').count()) > 0) {
        typed++
        await expect(page.getByText('Type the term for this definition.')).toBeVisible()
        await page.getByLabel('Your answer').fill('x')
      } else {
        choice++
        await expect(page.getByRole('radio')).toHaveCount(4)
        await page.getByRole('radio').first().click()
      }
      await page.getByRole('button', { name: 'Check answer' }).click()
      await expect(page.getByRole('status')).toContainText(/Correct|Incorrect/)
      await page.getByRole('button', { name: n === 20 ? 'See results' : 'Next question' }).click()
    }
    expect({ choice, typed }).toEqual({ choice: 14, typed: 6 })

    await expect(page.getByRole('heading', { name: 'Exercise results' })).toBeVisible()
    await expect(page.getByText('Definition Exercise for CompTIA Network+')).toBeVisible()
    await expect(page.locator('tbody tr')).toHaveCount(20)
  } finally {
    await app.close()
  }
})
