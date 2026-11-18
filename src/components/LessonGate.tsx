import { Component, useMemo } from 'react'
import type { ReactNode } from 'react'
import { makeProvider } from '../domain/lessons/curriculum'
import { useLessonContent } from '../domain/lessons/contentStore'
import { getLessonMeta } from '../domain/lessons/registry'
import { PlayScreen } from './PlayScreen'
import type { PlayScreenProps } from './PlayScreen'

export interface LessonGateProps extends Omit<PlayScreenProps, 'lesson'> {
  lessonId: string
}

export function LessonGate({ lessonId, ...props }: LessonGateProps) {
  const meta = getLessonMeta(lessonId)
  const content = useLessonContent(lessonId)
  const lesson = useMemo(
    () => (meta ? makeProvider(meta, content) : undefined),
    [meta, content],
  )
  if (!lesson) {
    return null
  }
  return <PlayScreen {...props} lesson={lesson} />
}

interface ContentErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
}

interface ContentErrorBoundaryState {
  failed: boolean
}

export class ContentErrorBoundary extends Component<
  ContentErrorBoundaryProps,
  ContentErrorBoundaryState
> {
  override state: ContentErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ContentErrorBoundaryState {
    return { failed: true }
  }

  override componentDidCatch(error: unknown): void {
    console.error(error)
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
