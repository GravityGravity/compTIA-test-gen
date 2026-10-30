import type { CertPracticeApi } from '@shared/api'

declare global {
  interface Window {
    certPractice: CertPracticeApi
  }
}
