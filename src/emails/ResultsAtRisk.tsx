import { ResultsEmail } from './ResultsEmail'

// Preview entry for the React Email gallery (npm run email).
export default function ResultsAtRisk() {
  return (
    <ResultsEmail firstName="Sarah" score={22} scoreRange="at_risk" wantsSupport={true} ctaUrl="https://wa.me/2340000000000" />
  )
}
