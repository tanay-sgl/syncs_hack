export default function SavedCandidateTray({ candidates, circleIds, atLimit, onAdd, onRemoveSaved, onView }) {
  return (
    <section className="candidate-tray" aria-labelledby="tray-title">
      <div className="tray-heading"><div><p>YOUR SHORTLIST</p><h2 id="tray-title">People you’ve saved</h2></div><span>{candidates.length} possibilities</span></div>
      <div className="tray-list">{candidates.map((person) => {
        const added = circleIds.includes(person.id)
        return <article key={person.id}><button className="tray-person" type="button" onClick={() => onView(person)}><i>{person.initials}</i><span><strong>{person.name}</strong><small>{person.skills.slice(0, 2).join(' · ')}</small></span></button><button className={added ? 'added' : ''} type="button" disabled={added} onClick={() => onAdd(person)}>{added ? 'In Circle' : atLimit ? 'Replace…' : '+ Add to Circle'}</button><button className="tray-remove" type="button" onClick={() => onRemoveSaved(person.id)} aria-label={`Remove ${person.name} from saved people`}>×</button></article>
      })}</div>
    </section>
  )
}
