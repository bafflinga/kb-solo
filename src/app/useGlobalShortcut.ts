import { useEffect, useRef } from 'react'
import { matchesShortcut } from './shortcuts'
import type { Shortcut } from './shortcuts'

export interface UseGlobalShortcutOptions {
  shortcut: Shortcut
  enabled?: boolean
  onTrigger(): void
}

export function useGlobalShortcut({
  shortcut,
  enabled = true,
  onTrigger,
}: UseGlobalShortcutOptions): void {
  const onTriggerRef = useRef(onTrigger)
  const shortcutRef = useRef(shortcut)

  useEffect(() => {
    onTriggerRef.current = onTrigger
    shortcutRef.current = shortcut
  })

  useEffect(() => {
    if (!enabled) {
      return
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.defaultPrevented || event.repeat || event.isComposing) {
        return
      }
      if (!matchesShortcut(event, shortcutRef.current)) {
        return
      }
      event.preventDefault()
      event.stopImmediatePropagation()
      onTriggerRef.current()
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [enabled])
}
