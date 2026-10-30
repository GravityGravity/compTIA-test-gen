import { useEffect, useState } from 'react'
import type { Catalog } from '@shared/types'
import { TopBar } from './components/TopBar'
import { HomeScreen } from './screens/HomeScreen'

export function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)

  useEffect(() => {
    void window.certPractice.getCatalog().then(setCatalog)
  }, [])

  return (
    <>
      <TopBar />
      {catalog && <HomeScreen catalog={catalog} />}
    </>
  )
}
