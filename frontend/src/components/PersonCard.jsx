import { useState } from 'react'
import WhyPerson from './WhyPerson.jsx'

export default function PersonCard({ person, needed, saved, invited, onSave, onInvite, onPass, onProfile }) {
  const [showWhy, setShowWhy] = useState(false)

  return (
    <article className="person-card">
      <div className="person-card-top">
        <button className="person-avatar" type="button" onClick={onProfile} aria-label={`View ${person.name}'s profile`}>{person.initials}</button>
        <div className="person-identity">
          <button type="button" onClick={onProfile}>{person.name}</button>
          <p>{person.degreeOrRole} · {person.year}</p>
          <span>{person.university}</span>
        </div>
        <div className="relevance"><strong>{person.relevanceScore}%</strong><span>relevance</span></div>
      </div>
      <p className="person-bio">{person.bio}</p>
      <div className="person-skills">{person.skills.map((skill) => <span className={person.coveredSkills.includes(skill) ? 'relevant-skill' : ''} key={skill}>{skill}</span>)}</div>
      <div className="person-signals"><span><i /> {person.availability}</span><span>{person.commitment} commitment</span><span>{person.collaborationStyle} style</span></div>
      <div className="reason-preview">{person.matchingReasons.slice(0, 2).map((reason) => <p key={reason}><span>✓</span> {reason}</p>)}</div>
      <button className="why-button" type="button" aria-expanded={showWhy} onClick={() => setShowWhy((open) => !open)}>Why this person? <span>{showWhy ? '−' : '+'}</span></button>
      {showWhy && <WhyPerson person={person} needed={needed} />}
      <div className="person-actions">
        <button className={saved ? 'active' : ''} type="button" onClick={onSave}>{saved ? '✓ Saved' : 'Save'}</button>
        <button className={invited ? 'active' : ''} type="button" onClick={onInvite}>{invited ? '✓ Invited' : 'Invite'}</button>
        <button type="button" onClick={onPass}>Pass</button>
        <button className="profile-link" type="button" onClick={onProfile}>View profile</button>
      </div>
      {invited && <p className="invite-confirmation" role="status">Invitation staged for demo.</p>}
    </article>
  )
}
