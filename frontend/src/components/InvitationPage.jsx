import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DemoResponseControls from './DemoResponseControls.jsx'
import InvitationComposer from './InvitationComposer.jsx'
import InvitationPersonCard from './InvitationPersonCard.jsx'
import MutualChoicePanel from './MutualChoicePanel.jsx'
import ProfilePreview from './ProfilePreview.jsx'
import ResponseSummary from './ResponseSummary.jsx'
import { getMockMatches } from '../services/matchServiceMock.js'
import { getCircleDraft } from '../utils/circleStorage.js'
import { getInvitations, saveActiveCircle, saveInvitations } from '../utils/invitationStorage.js'
import { parseIntentMock } from '../utils/parseIntentMock.js'
import { getReviewedIntent } from '../utils/storage.js'

const fallbackIntent = parseIntentMock("I can handle backend and ML. I need frontend, UI/UX and someone good at pitching for this hackathon. We're competitive and free tonight.")
const fallbackDraft = ['alex-rivera', 'maya-chen', 'jordan-lee']

export default function InvitationPage() {
  const navigate = useNavigate()
  const intent = useMemo(() => getReviewedIntent() || fallbackIntent, [])
  const candidates = useMemo(() => getMockMatches(intent), [intent])
  const people = useMemo(() => {
    const ids = getCircleDraft()?.memberIds || fallbackDraft
    const selected = ids.map((id) => candidates.find((person) => person.id === id)).filter(Boolean)
    return selected.length ? selected : fallbackDraft.map((id) => candidates.find((person) => person.id === id)).filter(Boolean)
  }, [candidates])
  const stored = useMemo(() => getInvitations(), [])
  const defaultMessage = `Hey! I’m forming a group for the SYNCS hackathon. Your skills complement what we’re currently looking for. Interested in chatting and seeing if it’s a fit?`
  const [message, setMessage] = useState(stored?.message || defaultMessage)
  const [statuses, setStatuses] = useState(() => Object.fromEntries(people.map((person) => [person.id, stored?.statuses?.[person.id] || 'not-sent'])))
  const [sentAt, setSentAt] = useState(stored?.sentAt || null)
  const [notice, setNotice] = useState('')
  const [profile, setProfile] = useState(null)
  const interested = people.filter((person) => statuses[person.id] === 'interested')
  const pending = people.filter((person) => statuses[person.id] === 'pending')

  useEffect(() => saveInvitations({ message, statuses, sentAt }), [message, statuses, sentAt])

  const sendInvitations = () => {
    setStatuses(Object.fromEntries(people.map((person) => [person.id, 'pending'])))
    setSentAt(Date.now())
    setNotice('Invitations sent. They decide what happens next.')
    window.setTimeout(() => setNotice(''), 4000)
  }
  const openCircle = () => {
    if (!interested.length) return
    saveActiveCircle({
      id: 'demo', intent,
      members: [{ id: 'current-user', name: 'You', initials: 'YOU', skills: intent.skillsCovered.length ? intent.skillsCovered : ['Backend', 'Machine Learning'], availability: intent.availability, commitment: intent.commitment, collaborationStyle: intent.style, interests: ['AI', 'Health-tech', 'Startups'] }, ...interested],
      pendingInvitations: pending,
      createdAt: new Date().toISOString(),
    })
    navigate('/circles/demo')
  }

  return (
    <div className="invite-page container">
      <header className="invite-header"><p className="eyebrow"><span /> INVITATIONS</p><div><section><h1>Ready to reach out?</h1><p>Invite the people you’d like to explore this with. Nothing becomes a Circle until they choose to join.</p></section><aside><strong>Mutual choice, by design.</strong><span>Recommendations surface possibilities. People create relationships.</span></aside></div><div className="invite-intent"><span>{intent.activity === 'Hackathon' ? 'SYNCS Hackathon' : intent.activity}</span><span>{intent.availability}</span><p><strong>Looking for:</strong> {intent.skillsNeeded.join(' · ')}</p></div></header>

      <section className="invitation-list" aria-labelledby="invitation-list-title"><div className="invitation-list-heading"><div><p>PROVISIONAL OUTREACH</p><h2 id="invitation-list-title">People you’re considering</h2></div><span>{people.length} invitations</span></div><div className="you-invitation"><span>YOU</span><div><strong>Backend + Machine Learning</strong><small>Invitation organiser</small></div></div>{people.map((person) => <InvitationPersonCard key={person.id} person={person} status={statuses[person.id]} needed={intent.skillsNeeded} onView={() => setProfile(person)} />)}</section>

      <InvitationComposer message={message} onChange={setMessage} recipientCount={people.length} />
      {!sentAt && <div className="send-invites"><div><strong>{people.length} people will receive an invitation.</strong><span>You can simulate their responses after sending.</span></div><button className="button" type="button" disabled={!message.trim() || !people.length} onClick={sendInvitations}>Send invitations →</button></div>}
      {notice && <div className="invitation-toast" role="status">✓ {notice}</div>}

      <ResponseSummary people={people} statuses={statuses} />
      <DemoResponseControls people={people} statuses={statuses} sent={Boolean(sentAt)} onChange={(id, status) => setStatuses((current) => ({ ...current, [id]: status }))} onEveryone={() => setStatuses(Object.fromEntries(people.map((person) => [person.id, 'interested'])))} onReset={() => { setStatuses(Object.fromEntries(people.map((person) => [person.id, 'not-sent']))); setSentAt(null); setNotice('') }} />

      {people.some((person) => statuses[person.id] === 'declined') && <aside className="declined-note"><div><strong>Some people passed for now.</strong><span>Not every connection has to become a collaboration.</span></div><Link to="/matches">Explore alternatives →</Link></aside>}
      <MutualChoicePanel />

      <div className="provisional-action"><div><span>PROVISIONAL CIRCLE</span><strong>{interested.length ? `${interested.length} ${interested.length === 1 ? 'person has' : 'people have'} chosen to join.` : 'Waiting for someone to choose to join.'}</strong><p>{pending.length ? `${pending.length} ${pending.length === 1 ? 'invitation remains' : 'invitations remain'} pending.` : 'No pending invitations.'}</p></div><button className="button" type="button" disabled={!interested.length} onClick={openCircle}>Open provisional Circle →</button></div>
      <Link className="invite-back" to="/builder">← Back to Circle Builder</Link>
      {profile && <ProfilePreview person={profile} onClose={() => setProfile(null)} />}
    </div>
  )
}
