import { Link } from 'react-router-dom'

const actions = { Study: 'I’m interested', Meet: 'I’m interested', Hackathons: 'Explore opportunity', Projects: 'Explore opportunity', Cofounders: 'Explore founder', Organisations: 'View opportunity' }

export default function LiveIntentCard({ intent, interested, onInterest, onView }) {
  const interestAction = ['Study','Meet'].includes(intent.category)
  const destination = intent.category === 'Organisations' ? '/organisations' : intent.category === 'Cofounders' ? '/founders' : '/matches'
  return <article className="live-intent-card"><div className="live-card-heading"><span>{intent.category}</span><i>{intent.status}</i></div><h3>{intent.title}</h3><p>{intent.description}</p><div className="live-card-meta"><span>◷ {intent.timeLabel}</span><span>⌖ {intent.place}</span><span>◉ {intent.participantCount + (interested ? 1 : 0)} interested</span></div>{intent.skillsNeeded.length > 0 && <div className="live-skills"><small>{['Projects','Hackathons','Cofounders','Organisations'].includes(intent.category) ? 'LOOKING FOR' : 'TOPICS'}</small>{intent.skillsNeeded.map((skill) => <span key={skill}>{skill}</span>)}</div>}<div className="live-card-people"><div>{intent.peoplePreview.map((person) => <span key={person}>{person}</span>)}</div>{interestAction ? <button className={interested ? 'active' : ''} type="button" onClick={onInterest}>{interested ? '✓ Interested' : actions[intent.category]}</button> : <Link to={destination}>{actions[intent.category]} →</Link>}<button type="button" onClick={onView}>View</button></div></article>
}
