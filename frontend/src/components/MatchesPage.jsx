import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import CapabilityMap from './CapabilityMap.jsx'
import MatchFilters from './MatchFilters.jsx'
import PersonCard from './PersonCard.jsx'
import ProfilePreview from './ProfilePreview.jsx'
import SavedPeople from './SavedPeople.jsx'
import { fetchCandidates, matchPeople } from '../api/client.js'
import { adaptCandidateToApi, adaptFrontendIntentToApi, adaptMatchResults } from '../api/adapters.js'
import { mockCandidates } from '../data/mockCandidates.js'
import { getMockMatches } from '../services/matchServiceMock.js'
import { parseIntentMock } from '../utils/parseIntentMock.js'
import { getReviewedIntent } from '../utils/storage.js'
import { getInvitedPeople, getSavedPeople, saveInvitedPeople, savePeople } from '../utils/matchStorage.js'

const fallbackIntent = parseIntentMock("I can handle backend and ML. I need frontend, UI/UX and someone good at pitching for this hackathon. We're competitive and free tonight.")
const initialFilters = { sort: 'Most relevant', skill: '', availability: '', commitment: '', interest: '' }

export default function MatchesPage() {
  const [searchParams] = useSearchParams()
  const [searching, setSearching] = useState(true)
  const [savedIds, setSavedIds] = useState(getSavedPeople)
  const [invitedIds, setInvitedIds] = useState(getInvitedPeople)
  const [dismissedIds, setDismissedIds] = useState([])
  const [filters, setFilters] = useState(() => ({ ...initialFilters, skill: searchParams.get('skill') || '' }))
  const [profile, setProfile] = useState(null)
  const [usedFallback, setUsedFallback] = useState(false)
  const intent = useMemo(() => getReviewedIntent() || fallbackIntent, [])
  const fallbackCandidates = useMemo(() => getMockMatches(intent), [intent])
  const [candidates, setCandidates] = useState(fallbackCandidates)

  useEffect(() => {
    let active = true
    const startedAt = Date.now()
    fetchCandidates()
      .catch(() => mockCandidates)
      .then((pool) => {
        const apiIntent = adaptFrontendIntentToApi(intent)
        const apiCandidates = pool.map((candidate) => adaptCandidateToApi(candidate, intent))
        return matchPeople(apiIntent, apiCandidates).then((response) => {
          const adapted = adaptMatchResults(response, pool, intent)
          if (active) setCandidates(adapted)
        })
      })
      .catch(() => {
        if (active) {
          setCandidates(fallbackCandidates)
          setUsedFallback(true)
        }
      })
      .finally(() => {
        const remaining = Math.max(0, 500 - (Date.now() - startedAt))
        window.setTimeout(() => { if (active) setSearching(false) }, remaining)
      })
    return () => { active = false }
  }, [fallbackCandidates, intent])
  useEffect(() => savePeople(savedIds), [savedIds])
  useEffect(() => saveInvitedPeople(invitedIds), [invitedIds])

  const toggleId = (setter, id) => setter((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id])
  const savedCandidates = candidates.filter((person) => savedIds.includes(person.id))
  const options = useMemo(() => ({
    skills: [...new Set(candidates.flatMap((person) => person.skills))].sort(),
    availability: [...new Set(candidates.map((person) => person.availability))],
    commitment: [...new Set(candidates.map((person) => person.commitment))],
    interests: [...new Set(candidates.flatMap((person) => person.interests))].sort(),
  }), [candidates])

  const visibleCandidates = useMemo(() => {
    const list = candidates.filter((person) => !dismissedIds.includes(person.id))
      .filter((person) => !filters.skill || person.skills.includes(filters.skill))
      .filter((person) => !filters.availability || person.availability === filters.availability)
      .filter((person) => !filters.commitment || person.commitment === filters.commitment)
      .filter((person) => !filters.interest || person.interests.includes(filters.interest))
    if (filters.sort === 'Availability') return [...list].sort((a, b) => Number(b.availability === intent.availability) - Number(a.availability === intent.availability) || b.relevanceScore - a.relevanceScore)
    if (filters.sort === 'Skill coverage') return [...list].sort((a, b) => b.coveredSkills.length - a.coveredSkills.length || b.relevanceScore - a.relevanceScore)
    return list
  }, [candidates, dismissedIds, filters, intent.availability])

  if (searching) {
    return <section className="intent-processing container" aria-live="polite"><div className="processing-nodes search-nodes" aria-hidden="true"><span /><span /><span /><i /><i /></div><h1>Exploring relevant people...</h1><p>Looking across skills, availability, intent and complementary strengths.</p></section>
  }

  return (
    <div className="matches-page container">
      <header className="matches-header">
        <p className="eyebrow"><span /> PEOPLE DISCOVERY</p>
        <div className="matches-title-row"><div><h1>People worth meeting</h1><p>Based on what you’re trying to make happen — not a final decision.</p></div><aside>AI narrows the world.<strong>You make the connection.</strong></aside></div>
        <div className="intent-summary"><span>{intent.activity}</span><span>{intent.availability}</span><p><strong>Needs:</strong> {intent.skillsNeeded.join(' · ')}</p><Link to="/create">Edit intent</Link></div>
      </header>
      {usedFallback && <p className="api-fallback-note" role="status">Demo recommendations are shown while live matching is unavailable.</p>}

      <SavedPeople people={savedCandidates} onRemove={(id) => toggleId(setSavedIds, id)} />
      <MatchFilters filters={filters} options={options} onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))} onReset={() => setFilters(initialFilters)} />

      <div className="matches-layout">
        <main className="results-column">
          <div className="results-heading"><div><p>STRONG COMPLEMENTS</p><h2>{visibleCandidates.length} people to explore</h2></div><span>Relevant doesn’t mean decided.</span></div>
          {visibleCandidates.map((person) => <PersonCard key={person.id} person={person} needed={intent.skillsNeeded} saved={savedIds.includes(person.id)} invited={invitedIds.includes(person.id)} onSave={() => toggleId(setSavedIds, person.id)} onInvite={() => toggleId(setInvitedIds, person.id)} onPass={() => setDismissedIds((ids) => [...ids, person.id])} onProfile={() => setProfile(person)} />)}
          {visibleCandidates.length === 0 && <div className="empty-results"><h2>No people match those filters yet</h2><p>Try broadening the current filters or adjusting your intent.</p><button type="button" onClick={() => setFilters(initialFilters)}>Reset filters</button></div>}
          {dismissedIds.length > 0 && <div className="dismissed-people"><span>{dismissedIds.length} passed</span><button type="button" onClick={() => setDismissedIds((ids) => ids.slice(0, -1))}>Undo last pass</button><button type="button" onClick={() => setDismissedIds([])}>Restore all</button></div>}
        </main>
        <CapabilityMap needed={intent.skillsNeeded} savedCandidates={savedCandidates} />
      </div>
      {profile && <ProfilePreview person={profile} onClose={() => setProfile(null)} />}
    </div>
  )
}
