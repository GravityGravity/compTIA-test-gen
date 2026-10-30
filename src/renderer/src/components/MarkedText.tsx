import type { WordSpan } from '@engine/spell'
import type { ReactNode } from 'react'

/** Text with a red squiggle under each misspelled word. */
export function MarkedText({ text, misspelled }: { text: string; misspelled: readonly WordSpan[] }) {
  const parts: ReactNode[] = []
  let at = 0
  for (const span of misspelled) {
    if (span.start > at) parts.push(text.slice(at, span.start))
    parts.push(
      <span key={span.start} className="miss">
        {text.slice(span.start, span.end)}
      </span>
    )
    at = span.end
  }
  if (at < text.length) parts.push(text.slice(at))
  return <>{parts}</>
}
