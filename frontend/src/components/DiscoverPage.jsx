import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DiscoverFilters from './DiscoverFilters.jsx'
import EmergentSessionDetail from './EmergentSessionDetail.jsx'
import EmergingSessionCard from './EmergingSessionCard.jsx'
import LiveIntentCard from './LiveIntentCard.jsx'
import LivePulse from './LivePulse.jsx'
import { detectClusters } from '../api/client.js'
import { adaptClustersToSessions, adaptLiveIntentsToApi } from '../api/adapters.js'
import { mockLiveIntents } from '../data/mockLiveIntents.js'
import { detectEmergentSessionsMock } from '../utils/detectEmergentSessionsMock.js'
import { getDiscoverInterests, saveDiscoverInterests } from '../utils/discoverStorage.js'

const initialFilters = { search:'', category:'All', time:'Today', location:'Any location', sort:'Most active' }

export default function DiscoverPage() {
  const fallbackSessions = useMemo(() => detectEmergentSessionsMock(mockLiveIntents), [])
  const [sessions, setSessions] = useState(fallbackSessions)
  const [usedFallback, setUsedFallback] = useState(false)
  const [interests, setInterests] = useState(getDiscoverInterests)
  const [filters, setFilters] = useState(initialFilters)
  const [detail, setDetail] = useState(null)
  useEffect(() => saveDiscoverInterests(interests), [interests])
  useEffect(() => {
    let active = true
    detectClusters(adaptLiveIntentsToApi(mockLiveIntents))
      .then((response) => {
        const adapted = adaptClustersToSessions(response, fallbackSessions)
        if (active) setSessions(adapted)
      })
      .catch(() => {
        if (active) {
          setSessions(fallbackSessions)
          setUsedFallback(true)
        }
      })
    return () => { active = false }
  }, [fallbackSessions])
  const toggleInterest = (id) => setInterests((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const filtered = useMemo(() => {
    const search = filters.search.toLowerCase().trim()
    const matchesTime = (intent) => filters.time === 'Any time' || filters.time === 'This week' || intent.timeGroup === filters.time || (filters.time === 'Today' && intent.timeGroup === 'Now')
    const result = mockLiveIntents.filter((intent) => !intent.clusterKey)
      .filter((intent) => filters.category === 'All' || intent.category === filters.category)
      .filter(matchesTime)
      .filter((intent) => filters.location === 'Any location' || intent.location === filters.location)
      .filter((intent) => !search || [intent.title,intent.description,...intent.skillsNeeded,...intent.interests].join(' ').toLowerCase().includes(search))
    if (filters.sort === 'Newest') return [...result].sort((a,b) => b.createdOrder-a.createdOrder)
    if (filters.sort === 'Closest to forming') return [...result].sort((a,b) => (b.participantCount/(b.neededCount || b.participantCount+1))-(a.participantCount/(a.neededCount || a.participantCount+1)))
    return [...result].sort((a,b) => b.participantCount-a.participantCount)
  }, [filters])
  const update = (key,value) => setFilters((current) => ({...current,[key]:value}))
  const totalPeople = mockLiveIntents.reduce((sum,intent)=>sum+intent.participantCount,0)

  return <div className="discover-page container"><header className="discover-header"><p className="eyebrow"><span /> LIVE INTENT NETWORK</p><h1>What’s trying to happen <span>around you?</span></h1><p>Explore people, sessions and opportunities forming around shared intent.</p><div className="discover-stats"><article><strong>{totalPeople}</strong><span>live signals</span></article><article><strong>{sessions.length + 11}</strong><span>sessions forming</span></article><article><strong>{mockLiveIntents.filter((item)=>['Projects','Hackathons'].includes(item.category)).length}</strong><span>projects looking for people</span></article><article><strong>{mockLiveIntents.filter((item)=>item.category==='Organisations').length}</strong><span>organisations recruiting</span></article></div></header>
    <section className="emerging-section"><div className="discover-section-heading"><div><p>COORDINATION WITHOUT AN ORGANISER</p><h2>Emerging now</h2></div><span>Independent intents becoming visible together.</span></div>{usedFallback && <p className="api-fallback-note" role="status">Demo session detection is active while the live service is unavailable.</p>}{sessions.length ? sessions.map((session) => <EmergingSessionCard key={session.id} session={session} interested={interests.includes(session.id)} onInterest={()=>toggleInterest(session.id)} onDetail={()=>setDetail(session)} />) : <div className="discover-empty"><h2>No shared intent patterns yet</h2><p>Live intents are visible below while potential sessions continue to form.</p></div>}</section>
    <DiscoverFilters filters={filters} onChange={update} onReset={()=>setFilters(initialFilters)} />
    <div className="discover-results"><main><div className="discover-section-heading"><div><p>ACTIONABLE SIGNALS</p><h2>Live intents</h2></div><span>{filtered.length} showing</span></div>{filtered.length ? <div className="live-intent-grid">{filtered.map((intent)=><LiveIntentCard key={intent.id} intent={intent} interested={interests.includes(intent.id)} onInterest={()=>toggleInterest(intent.id)} onView={()=>interestOrDetail(intent,setDetail)} />)}</div> : <div className="discover-empty"><h2>Nothing matching that yet</h2><p>Intent changes quickly. Try another filter or create your own.</p><Link className="button" to="/">Create intent</Link></div>}</main><LivePulse intents={mockLiveIntents} /></div>
    {detail && <EmergentSessionDetail session={detail} interested={interests.includes(detail.id)} onInterest={()=>toggleInterest(detail.id)} onClose={()=>setDetail(null)} />}
  </div>
}

function interestOrDetail(intent, setDetail) {
  setDetail({ id:intent.id, title:intent.title, description:intent.description, topics:intent.skillsNeeded.length ? intent.skillsNeeded : intent.interests, timeLabel:intent.timeLabel, place:intent.place, threshold:intent.participantCount+2, currentInterestCount:intent.participantCount, whySurfaced:[`${intent.participantCount} people share this intent`, `Time overlap around ${intent.timeLabel}`, `Location overlap near ${intent.place}`] })
}
