import InterestProgress from './InterestProgress.jsx'

export default function EmergingSessionCard({ session, interested, onInterest, onDetail }) {
  const count = session.currentInterestCount + (interested ? 1 : 0)
  const forming = count >= session.threshold
  return <article className={`emerging-card ${forming ? 'forming' : ''}`}><div className="emerging-top"><span><i /> {forming ? 'SESSION FORMING' : session.status.toUpperCase()}</span><button type="button" onClick={onDetail}>View pattern ↗</button></div><h3>{session.title}</h3><p>{session.description}</p><div className="emerging-facts"><div><span>TOPIC OVERLAP</span><strong>{session.topics.slice(0, 3).join(' · ')}</strong></div><div><span>LIKELY WINDOW</span><strong>{session.timeLabel}</strong></div><div><span>LIKELY PLACE</span><strong>{session.place}</strong></div></div><InterestProgress count={count} threshold={session.threshold} /><div className="emerging-action"><p>{forming ? 'Enough people are interested to coordinate a session.' : 'No organiser yet. The session forms if enough people opt in.'}</p>{forming && interested ? <button className="button" type="button" onClick={onDetail}>Open session details →</button> : <button className={interested ? 'interest-active' : 'button'} type="button" onClick={onInterest}>{interested ? '✓ Interested · Withdraw' : 'I’m interested'}</button>}</div></article>
}
