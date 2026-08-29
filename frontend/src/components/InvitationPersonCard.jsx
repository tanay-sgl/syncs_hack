const statusLabels = { 'not-sent': ['○', 'Not sent'], pending: ['◷', 'Pending'], interested: ['✓', 'Interested'], declined: ['×', 'Passed for now'] }

export default function InvitationPersonCard({ person, status, needed, onView }) {
  const relevant = person.skills.filter((skill) => needed.some((item) => item.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(item.toLowerCase())))
  const [icon, label] = statusLabels[status]
  return (
    <article className={`invitation-person status-${status}`}>
      <div className="invitation-link-visual" aria-hidden="true"><i /><span>{status === 'interested' ? 'joined' : 'invite'}</span><i /></div>
      <button className="invite-avatar" type="button" onClick={onView}>{person.initials}</button>
      <div className="invite-person-main"><button type="button" onClick={onView}>{person.name}</button><p>{person.degreeOrRole} · {person.university}</p><div>{person.skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}</div></div>
      <div className={`invitation-status ${status}`}><span aria-hidden="true">{icon}</span>{label}</div>
      <div className="invite-why"><span>WHY THEY SURFACED</span><p><strong>{person.name.split(' ')[0]} brings:</strong> {(relevant.length ? relevant : person.skills.slice(0, 2)).join(' · ')}</p><p><strong>Matches:</strong> {person.availability} · {person.commitment} commitment</p>{status === 'declined' && <em>Not every connection has to become a collaboration.</em>}</div>
    </article>
  )
}
