import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import IntentReview from './IntentReview.jsx'
import { parseIntent } from '../api/client.js'
import { adaptParsedIntent } from '../api/adapters.js'
import { parseIntentMock } from '../utils/parseIntentMock.js'
import { getOriginalIntent } from '../utils/storage.js'

const demoIntent = "I can handle backend and ML. I need frontend, UI/UX and someone good at pitching for this hackathon. We're competitive and free tonight."

export default function CreateIntentPage() {
  const location = useLocation()
  const [processing, setProcessing] = useState(true)
  const [usedFallback, setUsedFallback] = useState(false)
  const originalIntent = location.state?.intent || getOriginalIntent() || demoIntent
  const [parsedIntent, setParsedIntent] = useState(() => parseIntentMock(originalIntent))

  useEffect(() => {
    let active = true
    const startedAt = Date.now()
    parseIntent(originalIntent)
      .then((response) => {
        if (active) setParsedIntent(adaptParsedIntent(response, originalIntent))
      })
      .catch(() => {
        if (active) {
          setParsedIntent(parseIntentMock(originalIntent))
          setUsedFallback(true)
        }
      })
      .finally(() => {
        const remaining = Math.max(0, 350 - (Date.now() - startedAt))
        window.setTimeout(() => { if (active) setProcessing(false) }, remaining)
      })
    return () => { active = false }
  }, [originalIntent])

  if (processing) {
    return (
      <section className="intent-processing container" aria-live="polite">
        <div className="processing-nodes" aria-hidden="true"><span /><span /><span /><i /><i /></div>
        <h1>Understanding your intent...</h1>
        <p>Turning your request into details you can review.</p>
      </section>
    )
  }

  return <div className="review-page container">{usedFallback && <p className="api-fallback-note" role="status">Demo data kept intent review available while the live parser was unavailable.</p>}<IntentReview initialIntent={parsedIntent} /></div>
}
