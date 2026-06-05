export type ScoreRange = 'at_risk' | 'under_strain' | 'strong'

export type QuizAnswer = {
  id: string
  section: string
  value: number
}

export type QuizSession = {
  answers: Array<number | null>
  currentIndex: number
}

export type QuizResult = {
  firstName: string
  score: number
  scoreRange: ScoreRange
}
