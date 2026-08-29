import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { saveOriginalIntent } from '../utils/storage.js'

const examples = [
  'Find 3 people to cram COMP2022 tonight',
  'I need frontend and design teammates for this hackathon',
  'I’m looking for a technical cofounder in health-tech',
  'Find people for my university project',
]

export default function IntentInputBar() {
  const [intent, setIntent] = useState('')
  const navigate = useNavigate()

  const submitIntent = (event) => {
    event.preventDefault()
    const trimmedIntent = intent.trim()
    if (!trimmedIntent) return
    saveOriginalIntent(trimmedIntent)
    navigate('/create', { state: { intent: trimmedIntent } })
  }

  return (
    <div className="intent-composer">
      <form className="intent-form" onSubmit={submitIntent}>
        <label className="sr-only" htmlFor="intent-input">What do you want to make happen?</label>
        <div className="intent-field">
          <span className="intent-spark" aria-hidden="true">✦</span>
          <textarea id="intent-input" rows="2" value={intent} onChange={(event) => setIntent(event.target.value)} placeholder="e.g. I need a frontend developer and designer for this hackathon..." />
        </div>
        <button className="button intent-submit" type="submit" disabled={!intent.trim()}>Show me possibilities <span aria-hidden="true">→</span></button>
      </form>
      <div className="examples" aria-label="Example intents">
        <span>Try an example:</span>
        <div className="example-list">
          {examples.map((example) => <button key={example} type="button" onClick={() => setIntent(example)}>{example}</button>)}
        </div>
      </div>
      <Link className="founder-entry-link" to="/founders">Exploring a cofounder? Open the Founder Network →</Link>
    </div>
  )
}
