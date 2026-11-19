import { useEffect } from 'react'

export interface ToastMessage {
  id: number
  text: string
}

export interface ContentToastProps {
  message: ToastMessage | null
  onDismiss(): void
}

export function ContentToast({ message, onDismiss }: ContentToastProps) {
  useEffect(() => {
    if (!message) {
      return
    }
    const timer = window.setTimeout(onDismiss, 3000)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) {
    return null
  }
  return (
    <div className="content-toast" role="status" aria-live="polite">
      {message.text}
    </div>
  )
}
