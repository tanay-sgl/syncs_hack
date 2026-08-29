import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CircleAnalysis from './CircleAnalysis.jsx'
import CircleCanvas from './CircleCanvas.jsx'
import CircleCoverage from './CircleCoverage.jsx'
import ProfilePreview from './ProfilePreview.jsx'
import SavedCandidateTray from './SavedCandidateTray.jsx'
import SuggestedCombination from './SuggestedCombination.jsx'
import { getMockMatches } from '../services/matchServiceMock.js'
import { evaluateCircle } from '../utils/evaluateCircle.js'
import { generateSuggestedCombinations } from '../utils/generateSuggestedCombinations.js'
import { getCircleDraft, saveCircleDraft } from '../utils/circleStorage.js'
import { getSavedPeople, savePeople } from '../utils/matchStorage.js'
import { parseIntentMock } from '../utils/parseIntentMock.js'
import { getReviewedIntent } from '../utils/storage.js'

const fallbackIntent = parseIntentMock("I can handle backend and ML. I need frontend, UI/UX and someone good at pitching for this hackathon. We're competitive and free tonight.")
const fallbackSaved = ['alex-rivera', 'maya-chen', 'jordan-lee', 'noah-williams', 'sam-okafor']

export default function CircleBuilder() {
  const navigate = useNavigate()
  const trayRef = useRef(null)
  const intent = useMemo(() => getReviewedIntent() || fallbackIntent, [])
  const allCandidates = useMemo(() => getMockMatches(intent), [intent])
  const initialSaved = useMemo(() => getSavedPeople(), [])
  const [savedIds, setSavedIds] = useState(initialSaved.length ? initialSaved : fallbackSaved)
  const [circleIds, setCircleIds] = useState(() => getCircleDraft()?.memberIds || [])
  const [activeSuggestion, setActiveSuggestion] = useState('')
  const [profile, setProfile] = useState(null)
  const [limitCandidate, setLimitCandidate] = useState(null)
  const [focusSkill, setFocusSkill] = useState('')
  const maxMembers = Math.max(1, intent.groupSize - 1)
  const savedCandidates = allCandidates.filter((person) => savedIds.includes(person.id))
  const circleMembers = circleIds.map((id) => allCandidates.find((person) => person.id === id)).filter(Boolean)
  const suggestionPool = [...savedCandidates, ...allCandidates.filter((person) => !savedIds.includes(person.id))]
  const suggestions = generateSuggestedCombinations(intent, suggestionPool)
  const evaluation = evaluateCircle(intent, circleMembers)
  const missingSkill = evaluation.coverage.find((item) => !item.people.length)?.skill || ''
  const trayCandidates = [...savedCandidates].sort((a, b) => Number(b.skills.includes(focusSkill)) - Number(a.skills.includes(focusSkill)))

  useEffect(() => saveCircleDraft(circleIds), [circleIds])
  useEffect(() => savePeople(savedIds), [savedIds])

  const exploreSuggestion = (suggestion) => {
    setCircleIds(suggestion.members.slice(0, maxMembers).map((person) => person.id))
    setActiveSuggestion(suggestion.id)
    setLimitCandidate(null)
  }
  const addPerson = (person) => {
    if (circleIds.includes(person.id)) return
    if (circleIds.length >= maxMembers) { setLimitCandidate(person); return }
    setCircleIds((ids) => [...ids, person.id]); setActiveSuggestion(''); setFocusSkill('')
  }
  const findSkill = (skill) => {
    const matchingSaved = savedCandidates.filter((person) => person.skills.some((item) => item.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(item.toLowerCase())))
    if (!matchingSaved.length) { navigate(`/matches?skill=${encodeURIComponent(skill)}`); return }
    setFocusSkill(skill)
    trayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const invite = () => {
    if (!circleIds.length) return
    saveCircleDraft(circleIds)
    navigate('/invite')
  }

  return (
    <div className="builder-page container">
      <header className="builder-header">
        <p className="eyebrow"><span /> CIRCLE BUILDER</p>
        <div><section><h1>Build your Circle</h1><p>Explore combinations, compare strengths and shape the group yourself.</p></section><aside><strong>Suggestions, not assignments.</strong><span>AI narrows the world. You make the connection.</span></aside></div>
        <div className="builder-intent"><span>{intent.activity === 'Hackathon' ? 'SYNCS Hackathon' : intent.activity}</span><span>{intent.availability}</span><p><strong>Looking for:</strong> {intent.skillsNeeded.join(' · ')}</p><p><strong>You bring:</strong> {intent.skillsCovered.length ? intent.skillsCovered.join(' · ') : 'Backend · Machine Learning'}</p><Link to="/create">Edit intent</Link></div>
      </header>

      <section className="suggestions-section"><div className="builder-section-title"><div><p>THREE PERSPECTIVES</p><h2>Suggested combinations</h2></div><span>Explore strengths. Consider trade-offs. Choose for yourself.</span></div><div className="suggestions-grid">{suggestions.map((suggestion) => <SuggestedCombination key={suggestion.id} suggestion={suggestion} intent={intent} active={activeSuggestion === suggestion.id} onExplore={exploreSuggestion} />)}</div></section>

      {activeSuggestion && <p className="exploring-message" role="status">You’re exploring the {suggestions.find((item) => item.id === activeSuggestion)?.label.toLowerCase()} suggestion. Add, remove or compare anyone.</p>}
      {limitCandidate && <aside className="limit-message" role="alert"><div><strong>Your intent currently targets {intent.groupSize} people total.</strong><span>Replace someone to add {limitCandidate.name}, or update your preferred group size.</span></div><button type="button" onClick={() => { setCircleIds((ids) => [...ids.slice(0, -1), limitCandidate.id]); setLimitCandidate(null); setActiveSuggestion('') }}>Replace last person</button><Link to="/create">Update group size</Link><button type="button" aria-label="Dismiss" onClick={() => setLimitCandidate(null)}>×</button></aside>}

      <div className="builder-workspace">
        <div className="canvas-column"><div className="canvas-heading"><div><p>YOUR WORKSPACE</p><h2>Current Circle</h2></div><span>{circleMembers.length + 1} / {intent.groupSize} people</span></div><CircleCanvas members={circleMembers} missingSkill={missingSkill} onRemove={(id) => { setCircleIds((ids) => ids.filter((item) => item !== id)); setActiveSuggestion('') }} onView={setProfile} onFindMissing={findSkill} /></div>
        <CircleAnalysis evaluation={evaluation} />
      </div>

      <CircleCoverage coverage={evaluation.coverage} onFind={findSkill} />
      <div ref={trayRef}><SavedCandidateTray candidates={trayCandidates} circleIds={circleIds} atLimit={circleIds.length >= maxMembers} onAdd={addPerson} onRemoveSaved={(id) => { setSavedIds((ids) => ids.filter((item) => item !== id)); setCircleIds((ids) => ids.filter((item) => item !== id)) }} onView={setProfile} /></div>

      <div className="builder-actions"><Link to="/matches">← Back to people</Link><button type="button" onClick={() => { setCircleIds([]); setActiveSuggestion('') }}>Clear Circle</button><p>Nothing becomes a Circle until people choose to join.</p><button className="button" type="button" disabled={!circleIds.length} onClick={invite}>Invite these people →</button></div>
      {profile && <ProfilePreview person={profile} onClose={() => setProfile(null)} />}
    </div>
  )
}
