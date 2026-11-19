import { useEffect, useRef } from 'react'
import type { Code } from '../domain/types'

export interface KeyboardInput {
  code: Code
  char: string
  shift: boolean
  alt: boolean
  repeat: boolean
  isComposing: boolean
}

export interface UseKeyboardOptions {
  active: boolean
  onKey(input: KeyboardInput): void
  onBackspace(): void
  inputCode?(code: Code): Code
}

const PREVENT_DEFAULT = new Set(['Tab', 'Backspace', 'Space', 'Enter'])

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'])

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return EDITABLE_TAGS.has(target.tagName) || target.isContentEditable
}

function charFor(event: KeyboardEvent): string {
  if (event.code === 'Space') {
    return ' '
  }
  if (event.code === 'Enter') {
    return 'Enter'
  }
  return event.key
}

export function useKeyboard({
  active,
  onKey,
  onBackspace,
  inputCode,
}: UseKeyboardOptions): void {
  const onKeyRef = useRef(onKey)
  const onBackspaceRef = useRef(onBackspace)
  const inputCodeRef = useRef(inputCode)

  useEffect(() => {
    onKeyRef.current = onKey
    onBackspaceRef.current = onBackspace
    inputCodeRef.current = inputCode
  })

  useEffect(() => {
    if (!active) {
      return
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.defaultPrevented) {
        return
      }
      if (event.ctrlKey || event.metaKey) {
        return
      }
      if (isEditableTarget(event.target)) {
        return
      }
      if (event.code === 'Backspace') {
        event.preventDefault()
        onBackspaceRef.current()
        return
      }
      if (event.code === '') {
        return
      }
      if (PREVENT_DEFAULT.has(event.code)) {
        event.preventDefault()
      }
      const normalize = inputCodeRef.current
      onKeyRef.current({
        code: normalize ? normalize(event.code) : event.code,
        char: charFor(event),
        shift: event.shiftKey,
        alt: event.altKey,
        repeat: event.repeat,
        isComposing: event.isComposing,
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [active])
}
