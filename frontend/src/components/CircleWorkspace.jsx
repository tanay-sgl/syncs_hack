import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CircleAgenda from './CircleAgenda.jsx'
import CircleMeeting from './CircleMeeting.jsx'
import CircleTasks from './CircleTasks.jsx'
import ProfilePreview from './ProfilePreview.jsx'
import { fetchCandidates, matchPeople } from '../api/client.js'
import { adaptCandidateToApi, adaptFrontendIntentToApi, adaptMatchResults } from '../api/adapters.js'
import { getMockMatches } from '../services/matchServiceMock.js'
import { evaluateCircle } from '../utils/evaluateCircle.js'
import { getActiveCircle, saveActiveCircle } from '../utils/invitationStorage.js'
import { parseIntentMock } from '../utils/parseIntentMock.js'
import { getCircleAgenda, getCircleMeeting, getCircleTasks, saveCircleAgenda, saveCircleMeeting, saveCircleTasks } from '../utils/workspaceStorage.js'

const fallbackIntent = parseIntentMock("We're entering the SYNCS hackathon. I can handle backend and ML. I need frontend, UI/UX and pitching support. We're competitive and free tonight.")
const defaultAgenda = ['Finalize hackathon problem', 'Agree on architecture', 'Assign first implementation blocks', 'Prepare judging demo'].map((text, index) => ({ id: `agenda-${index}`, text, done: false }))
const defaultTasks = [{ id: 'task-frontend', title: 'Set up frontend', ownerId: 'alex-rivera', status: 'In progress' }, { id: 'task-parser', title: 'Build intent parser', ownerId: 'current-user', status: 'Todo' }, { id: 'task-ui', title: 'Create UI prototype', ownerId: 'maya-chen', status: 'Todo' }, { id: 'task-pitch', title: 'Prepare pitch', ownerId: '', status: 'Todo' }]
const matchesSkill = (skill, skills) => skills.some((item) => item.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(item.toLowerCase()))

function makeFallbackCircle(candidates) {
  const find = (id) => candidates.find((person) => person.id === id)
  return { id: 'demo', intent: fallbackIntent, members: [{ id: 'current-user', name: 'You', initials: 'YOU', skills: ['Backend', 'Machine Learning'], availability: 'Tonight', commitment: 'High', collaborationStyle: 'Competitive', interests: ['AI', 'Health-tech', 'Startups'] }, find('alex-rivera'), find('maya-chen')].filter(Boolean), pendingInvitations: [find('jordan-lee')].filter(Boolean), createdAt: new Date().toISOString() }
}

export default function CircleWorkspace() {
  const mockMatches = useMemo(() => getMockMatches(fallbackIntent), [])
  const [circle, setCircle] = useState(() => getActiveCircle() || makeFallbackCircle(mockMatches))
  const [tab, setTab] = useState('Overview')

  useEffect(() => {
    if (getActiveCircle()) return
    let active = true
    fetchCandidates()
      .then((pool) => {
        const apiIntent = adaptFrontendIntentToApi(fallbackIntent)
        const apiCandidates = pool.map((c) => adaptCandidateToApi(c, fallbackIntent))
        return matchPeople(apiIntent, apiCandidates).then((response) => {
          const adapted = adaptMatchResults(response, pool, fallbackIntent)
          if (active) setCircle(makeFallbackCircle(adapted))
        })
      })
      .catch(() => {})
    return () => { active = false }
  }, [])
  const [profile, setProfile] = useState(null)
  const [meeting, setMeeting] = useState(() => getCircleMeeting({ dateTime: '2026-08-29T20:00', location: 'Hackathon venue' }))
  const [agenda, setAgenda] = useState(() => getCircleAgenda(defaultAgenda))
  const [tasks, setTasks] = useState(() => getCircleTasks(defaultTasks))
  const activeCandidates = useMemo(() => circle.members.filter((person) => person.id !== 'current-user'), [circle.members])
  const evaluation = useMemo(() => evaluateCircle(circle.intent, activeCandidates), [circle.intent, activeCandidates])
  const status = circle.pendingInvitations.length ? 'FORMING' : 'ACTIVE'
  const title = circle.intent.activity === 'Hackathon' ? 'SYNCS Hackathon Circle' : circle.intent.activity === 'Study' ? `${circle.intent.course || 'Study'} Exam Sprint` : circle.intent.activity === 'Cofounder' ? 'Health-tech Cofounder Exploration' : `${circle.intent.activity} Circle`
  const requestedCoverage = circle.intent.skillsNeeded.map((skill) => ({ skill, confirmed: circle.members.filter((person) => matchesSkill(skill, person.skills)), pending: circle.pendingInvitations.filter((person) => matchesSkill(skill, person.skills)) }))
  const baseCoverage = (circle.intent.skillsCovered.length ? circle.intent.skillsCovered : ['Backend', 'Machine Learning']).map((skill) => ({ skill, confirmed: [circle.members[0]], pending: [] }))
  const missing = requestedCoverage.filter((item) => !item.confirmed.length)

  useEffect(() => saveActiveCircle(circle), [circle])
  useEffect(() => saveCircleMeeting(meeting), [meeting])
  useEffect(() => saveCircleAgenda(agenda), [agenda])
  useEffect(() => saveCircleTasks(tasks), [tasks])

  const updateRole = (id, role) => setCircle((current) => ({ ...current, members: current.members.map((person) => person.id === id ? { ...person, suggestedRole: role } : person) }))

  return <div className="workspace-page container">
    <header className="workspace-header"><div><p className="eyebrow"><span /> YOUR CIRCLE</p><span className={`workspace-status ${status.toLowerCase()}`}>{status}</span></div><h1>{title}</h1><p>Built around a shared intent — flexible as the goal evolves.</p></header>
    <section className="workspace-summary"><article><span>GOAL</span><strong>{circle.intent.activity === 'Hackathon' ? 'Build and submit a competitive hackathon prototype' : circle.intent.originalText}</strong></article><article><span>CURRENT MEMBERS</span><strong>{circle.members.length}</strong></article><article><span>PENDING INVITATIONS</span><strong>{circle.pendingInvitations.length}</strong></article><article><span>MEETING</span><strong>{meeting.dateTime ? new Date(meeting.dateTime).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : 'Not set'}</strong></article><article><span>LOCATION</span><strong>{meeting.location || 'Not set'}</strong></article><article><span>COMMITMENT</span><strong>{circle.intent.commitment}</strong></article></section>
    <section className="workspace-network" aria-label="Circle members and pending invitations">{circle.members.map((person, index) => <button className={`network-person member-${index}`} type="button" key={person.id} disabled={person.id === 'current-user'} onClick={() => setProfile(person)}><span>{person.initials}</span><strong>{person.name}</strong><small>{person.skills.slice(0, 2).join(' + ')}</small></button>)}{circle.pendingInvitations.map((person) => <button className="network-person pending-person" type="button" key={person.id} onClick={() => setProfile(person)}><span>{person.initials}</span><strong>{person.name}</strong><small>{person.skills[0]} · Pending</small></button>)}</section>
    <nav className="workspace-tabs" aria-label="Circle workspace sections">{['Overview', 'People', 'Plan'].map((item) => <button className={tab === item ? 'active' : ''} type="button" key={item} aria-pressed={tab === item} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {tab === 'Overview' && <div className="overview-layout"><main><section className="workspace-card shared-intent"><div className="workspace-card-heading"><span>SHARED INTENT</span><h2>What brought this Circle together</h2></div><blockquote>“{circle.intent.originalText}”</blockquote></section><section className="workspace-card coverage-workspace"><div className="workspace-card-heading"><span>CAPABILITY COVERAGE</span><h2>Confirmed and still forming</h2></div><div>{[...baseCoverage, ...requestedCoverage].map((item) => <article key={item.skill}><span>{item.skill}</span>{item.confirmed.length ? <strong>Confirmed · {item.confirmed.map((person) => person.name).join(', ')}</strong> : item.pending.length ? <strong className="pending">Potentially covered if {item.pending.map((person) => person.name.split(' ')[0]).join(', ')} joins</strong> : <strong className="missing">Still missing</strong>}</article>)}</div></section><section className="workspace-card workspace-evaluation"><div><h3>Current strengths</h3>{evaluation.strengths.map((item) => <p key={item}><span>✓</span>{item}</p>)}</div><div><h3>Possible gaps</h3>{evaluation.tradeoffs.map((item) => <p key={item}><span>•</span>{item}</p>)}</div></section></main><aside>{missing.length > 0 && <section className="workspace-missing"><span>MISSING BLOCK</span><h2>{missing[0].skill}</h2><p>Your current Circle doesn’t yet have confirmed coverage for {missing[0].skill.toLowerCase()}.{missing[0].pending.length ? ` ${missing[0].pending[0].name.split(' ')[0]}'s invitation is still pending.` : ''}</p><Link to="/matches">Explore people →</Link></section>}<section className="circle-evolves"><h2>Circles evolve.</h2><p>People can join, leave or change roles as the goal changes.</p></section><section className="workspace-activity"><span>ACTIVITY</span><h2>Circle timeline</h2>{['Circle created', ...activeCandidates.map((person) => `${person.name} joined`), ...circle.pendingInvitations.map((person) => `Invitation sent to ${person.name}`), 'Task created: Set up frontend'].map((item, index) => <p key={item}><i />{item}<small>8:{32 + index * 2} PM</small></p>)}</section></aside></div>}
    {tab === 'People' && <div className="people-workspace"><section><div className="workspace-section-heading"><p>ACTIVE MEMBERS</p><h2>People who chose to join</h2></div><div className="member-grid">{circle.members.map((person) => <article key={person.id}><button type="button" disabled={person.id === 'current-user'} onClick={() => setProfile(person)}>{person.initials}</button><h3>{person.name}</h3><p>{person.id === 'current-user' ? 'Circle organiser' : person.degreeOrRole}</p><div>{person.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><label>Suggested role<input value={person.suggestedRole || (person.id === 'current-user' ? 'Technical lead' : matchesSkill('UI/UX', person.skills) ? 'Design lead' : 'Frontend lead')} onChange={(event) => updateRole(person.id, event.target.value)} /></label><small>{person.availability} · {person.commitment} commitment</small></article>)}</div></section><section className="pending-workspace"><div className="workspace-section-heading"><p>PENDING INVITATIONS</p><h2>Still their choice</h2></div>{circle.pendingInvitations.length ? circle.pendingInvitations.map((person) => <article key={person.id}><span>{person.initials}</span><div><h3>{person.name}</h3><p>If {person.name.split(' ')[0]} joins, {person.skills.slice(0, 2).join(' and ')} would gain potential coverage.</p></div><button type="button" onClick={() => setProfile(person)}>View profile</button><button type="button" onClick={() => setCircle((current) => ({ ...current, pendingInvitations: current.pendingInvitations.filter((item) => item.id !== person.id) }))}>Cancel invitation</button></article>) : <p className="no-pending">No invitations are pending.</p>}<Link className="button" to="/matches">Explore another person →</Link></section></div>}
    {tab === 'Plan' && <div className="plan-workspace"><CircleMeeting meeting={meeting} onChange={setMeeting} /><CircleAgenda agenda={agenda} onChange={setAgenda} /><CircleTasks tasks={tasks} members={circle.members} onChange={setTasks} /></div>}
    {profile && <ProfilePreview person={profile} onClose={() => setProfile(null)} />}
  </div>
}
