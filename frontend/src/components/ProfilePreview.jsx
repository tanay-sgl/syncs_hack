import { useDialogAccessibility } from '../utils/useDialogAccessibility.js'

export default function ProfilePreview({ person, onClose }) {
  const closeButton = useDialogAccessibility(onClose)

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <button className="modal-close" ref={closeButton} type="button" onClick={onClose} aria-label="Close profile preview">×</button>
        <div className="profile-heading"><span>{person.initials}</span><div><h2 id="profile-title">{person.name}</h2><p>{person.degreeOrRole} · {person.university}</p></div></div>
        <p className="profile-bio">{person.bio}</p>
        <div className="profile-section"><h3>Skills</h3><div>{person.skills.map((item) => <span key={item}>{item}</span>)}</div></div>
        <div className="profile-section"><h3>Interests</h3><div>{person.interests.map((item) => <span key={item}>{item}</span>)}</div></div>
        <dl className="profile-details"><div><dt>Availability</dt><dd>{person.availability}</dd></div><div><dt>Collaboration style</dt><dd>{person.collaborationStyle}</dd></div></dl>
        <div className="activity-signals"><h3>Activity signals</h3><div><strong>{person.sessionsCompleted}</strong><span>sessions completed</span></div><div><strong>{person.reliabilitySignal}%</strong><span>reliability signal</span></div><div><strong>{person.repeatCollaborationRate}%</strong><span>repeat collaboration</span></div><p>These reflect activity on Converge and are not guarantees about a person’s ability or character.</p></div>
      </section>
    </div>
  )
}
