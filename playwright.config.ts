import { defineConfig } from '@playwright/test'

// Drives the built Electron app (run `npm run build` first; `npm run test:e2e` does both).
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  workers: 1,
  reporter: 'list'
})
