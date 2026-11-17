import { FINGER_COLORS } from '../../domain/fingerMap'
import type { Finger } from '../../domain/types'

export type HandSide = 'left' | 'right'

interface FingerIds {
  pinky: Finger
  ring: Finger
  middle: Finger
  index: Finger
}

const FINGER_IDS: Record<HandSide, FingerIds> = {
  left: { pinky: 'lp', ring: 'lr', middle: 'lm', index: 'li' },
  right: { pinky: 'rp', ring: 'rr', middle: 'rm', index: 'ri' },
}

export const HAND_FINGER_IDS: readonly Finger[] = [
  FINGER_IDS.left.pinky,
  FINGER_IDS.left.ring,
  FINGER_IDS.left.middle,
  FINGER_IDS.left.index,
  FINGER_IDS.right.pinky,
  FINGER_IDS.right.ring,
  FINGER_IDS.right.middle,
  FINGER_IDS.right.index,
  'thumb',
]

interface CapsuleProps {
  finger: Finger
  active: boolean
  x: number
  y: number
  width: number
  height: number
  rotate?: number
}

function Capsule({
  finger,
  active,
  x,
  y,
  width,
  height,
  rotate,
}: CapsuleProps) {
  const cx = x + width / 2
  const cy = y + height
  return (
    <rect
      className="hand-finger"
      data-finger={finger}
      data-active={active ? 'true' : 'false'}
      x={x}
      y={y}
      width={width}
      height={height}
      rx={width / 2}
      transform={
        rotate === undefined ? undefined : `rotate(${rotate} ${cx} ${cy})`
      }
      style={{ color: FINGER_COLORS[finger] }}
    />
  )
}

export interface HandProps {
  side: HandSide
  activeFinger?: Finger
}

export function Hand({ side, activeFinger }: HandProps) {
  const ids = FINGER_IDS[side]
  return (
    <svg
      className={`hand hand-${side}`}
      viewBox="0 0 120 160"
      role="presentation"
      aria-hidden="true"
    >
      <g
        transform={
          side === 'right' ? 'translate(120 0) scale(-1 1)' : undefined
        }
      >
        <rect
          className="hand-palm"
          x="32"
          y="74"
          width="62"
          height="60"
          rx="20"
        />
        <Capsule
          finger={ids.pinky}
          active={activeFinger === ids.pinky}
          x={36}
          y={40}
          width={11}
          height={40}
        />
        <Capsule
          finger={ids.ring}
          active={activeFinger === ids.ring}
          x={50}
          y={22}
          width={11}
          height={58}
        />
        <Capsule
          finger={ids.middle}
          active={activeFinger === ids.middle}
          x={64}
          y={12}
          width={11}
          height={68}
        />
        <Capsule
          finger={ids.index}
          active={activeFinger === ids.index}
          x={78}
          y={24}
          width={11}
          height={56}
        />
        <Capsule
          finger="thumb"
          active={activeFinger === 'thumb'}
          x={84}
          y={88}
          width={12}
          height={36}
          rotate={55}
        />
      </g>
    </svg>
  )
}
