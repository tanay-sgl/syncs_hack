import { evaluateCircle } from '../utils/evaluateCircle.js'

export default function SuggestedCombination({ suggestion, intent, active, onExplore }) {
  const evaluation = evaluateCircle(intent, suggestion.members)
  return (
    <article className={`suggestion-card ${active ? 'active' : ''}`}>
      <span>{suggestion.label}</span><h3>{suggestion.focus}</h3>
      <div className="suggestion-faces">{suggestion.members.map((person) => <i key={person.id} title={person.name}>{person.initials}</i>)}</div>
      <dl><div><dt>Skill coverage</dt><dd>{evaluation.capabilityScore}%</dd></div><div><dt>Availability</dt><dd>{evaluation.availabilityScore}%</dd></div><div><dt>Commitment</dt><dd>{evaluation.commitmentScore >= 75 ? 'High' : evaluation.commitmentScore >= 40 ? 'Mixed' : 'Varied'}</dd></div></dl>
      <p><strong>Potential strength</strong>{suggestion.strength}</p><p><strong>Possible trade-off</strong>{suggestion.tradeoff}</p>
      <button type="button" onClick={() => onExplore(suggestion)}>{active ? 'Exploring this suggestion' : 'Explore this combination'} <span>→</span></button>
    </article>
  )
}
