import { ResultsEmail } from './ResultsEmail'

// Preview entry for the React Email gallery (npm run email).
export default function ResultsStrong() {
  return (
    <ResultsEmail firstName="Sarah" score={52} scoreRange="strong" ctaUrl="https://wa.me/2340000000000" />
  )
}
