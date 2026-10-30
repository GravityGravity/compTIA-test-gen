import { _electron as electron, expect, test } from '@playwright/test'

test('the app opens on the home screen with the modules from config/', async () => {
  const app = await electron.launch({ args: ['.'] })
  try {
    const page = await app.firstWindow()
    await expect(page).toHaveTitle('Cert Practice')
    await expect(page.getByRole('heading', { name: 'Practice for your certification exams' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Acronym Exercise' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Definition Exercise' })).toBeVisible()

    // Security settings stay on: no Node in the page, and the preload API is isolated (frozen by contextBridge).
    const isolation = await page.evaluate(() => ({
      node:
        typeof (globalThis as { require?: unknown }).require !== 'undefined' ||
        typeof process !== 'undefined',
      isolatedApi: Object.isFrozen((globalThis as { certPractice?: object }).certPractice)
    }))
    expect(isolation).toEqual({ node: false, isolatedApi: true })

    const [minWidth, minHeight] = await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]!.getMinimumSize()
    )
    expect([minWidth, minHeight]).toEqual([1024, 720])
  } finally {
    await app.close()
  }
})
