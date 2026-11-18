export interface ScoreInput {
  keystrokes: number
  correct: number
  elapsedMs: number
}

export interface Score {
  grossWpm: number
  netWpm: number
  accuracy: number
}

export type Stars = 0 | 1 | 2 | 3

export function computeScore(input: ScoreInput): Score {
  const { keystrokes, correct, elapsedMs } = input

  if (elapsedMs <= 0 || keystrokes <= 0) {
    return { grossWpm: 0, netWpm: 0, accuracy: 0 }
  }

  const minutes = elapsedMs / 60000

  return {
    grossWpm: keystrokes / 5 / minutes,
    netWpm: correct / 5 / minutes,
    accuracy: correct / keystrokes,
  }
}

export function computeStars(
  score: Score,
  completed: boolean,
  targetWpm = 30,
): Stars {
  if (!completed) {
    return 0
  }
  if (score.accuracy >= 0.97 && score.netWpm >= targetWpm) {
    return 3
  }
  if (score.accuracy >= 0.9 && score.netWpm >= targetWpm * 0.7) {
    return 2
  }
  return 1
}
