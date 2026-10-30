import { forwardRef, useLayoutEffect, useRef, useState } from 'react'
import type { SpellChecker } from '@engine/spell'
import { MarkedText } from './MarkedText'

interface TypedAnswerProps {
  value: string
  onChange: (value: string) => void
  spell: SpellChecker
  disabled: boolean
  placeholder: string
}

/**
 * A text field that draws its own red squiggle under misspelled words: a mirror with the same text
 * sits under the transparent input. The browser spell checker is off (spellcheck=false).
 */
export const TypedAnswer = forwardRef<HTMLInputElement, TypedAnswerProps>(function TypedAnswer(
  { value, onChange, spell, disabled, placeholder },
  ref
) {
  const mirrorRef = useRef<HTMLDivElement>(null)
  const [scroll, setScroll] = useState(0)
  // Keep the squiggles under the words when a long answer scrolls the field.
  useLayoutEffect(() => {
    if (mirrorRef.current) mirrorRef.current.scrollLeft = scroll
  }, [scroll, value])

  return (
    <div className="typed">
      <div className="mirror" ref={mirrorRef} aria-hidden="true" data-testid="spell-mirror">
        <MarkedText text={value} misspelled={spell.misspelled(value)} />
      </div>
      <input
        ref={ref}
        type="text"
        autoComplete="off"
        spellCheck={false}
        aria-label="Your answer"
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => setScroll(e.currentTarget.scrollLeft)}
        onKeyUp={(e) => setScroll(e.currentTarget.scrollLeft)}
      />
    </div>
  )
})
