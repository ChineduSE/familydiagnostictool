import { QUESTIONS } from '@/lib/questions'
import type { QuizResult, QuizSession } from '@/types'

const SESSION_KEY = 'fcd_quiz_session'
const RESULT_KEY = 'fcd_results'

export function createSession(): QuizSession {
  return {
    answers: Array.from({ length: QUESTIONS.length }, () => null),
    currentIndex: 0,
  }
}

export function loadSession(): QuizSession | null {
  const raw = window.localStorage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    const session = JSON.parse(raw) as QuizSession
    if (session.answers.length !== QUESTIONS.length) return null
    return session
  } catch {
    return null
  }
}

export function saveSession(session: QuizSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY)
}

export function saveResult(result: QuizResult) {
  window.sessionStorage.setItem(RESULT_KEY, JSON.stringify(result))
}

export function loadResult(): QuizResult | null {
  const raw = window.sessionStorage.getItem(RESULT_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as QuizResult
  } catch {
    return null
  }
}

export function isComplete(session: QuizSession) {
  return session.answers.every((answer) => answer !== null)
}
