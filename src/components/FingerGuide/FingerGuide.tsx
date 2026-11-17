import { memo } from 'react'
import type { Finger } from '../../domain/types'
import { Hand } from './Hand'
import './fingerGuide.css'

export interface FingerGuideProps {
  finger?: Finger
}

export const FingerGuide = memo(function FingerGuide({
  finger,
}: FingerGuideProps) {
  return (
    <div className="finger-guide" aria-hidden="true">
      <Hand side="left" activeFinger={finger} />
      <Hand side="right" activeFinger={finger} />
    </div>
  )
})
