const positions = ['circle-top', 'circle-left', 'circle-right', 'circle-far-left', 'circle-far-right']

export default function CircleCanvas({ members, missingSkill, onRemove, onView, onFindMissing }) {
  return (
    <section className="circle-canvas" aria-label="Current Circle">
      <div className="circle-ambient" aria-hidden="true" />
      <svg className="circle-lines" viewBox="0 0 620 470" aria-hidden="true">
        {members.map((person, index) => {
          const ends = [[310, 105], [125, 235], [495, 235], [70, 345], [550, 345]][index]
          return ends ? <line key={person.id} x1="310" y1="370" x2={ends[0]} y2={ends[1]} /> : null
        })}
      </svg>
      {members.map((person, index) => (
        <div className={`circle-node ${positions[index] || ''}`} key={person.id}>
          <button className="circle-node-select" type="button" onClick={() => onView(person)} aria-label={`View ${person.name}`}><span>{person.initials}</span><strong>{person.name.split(' ')[0]}</strong><small>{person.coveredSkills[0] || person.skills[0]}</small></button>
          <button className="circle-node-remove" type="button" aria-label={`Remove ${person.name} from Circle`} onClick={() => onRemove(person.id)}>×</button>
        </div>
      ))}
      <div className="you-node"><span>YOU</span><strong>Backend + ML</strong><small>Fixed starting point</small></div>
      {missingSkill && <button className="missing-node" type="button" onClick={() => onFindMissing(missingSkill)}><span>MISSING BLOCK</span><strong>{missingSkill}</strong><small>Find someone +</small></button>}
      {!members.length && <p className="canvas-empty">Add someone or explore a suggestion to begin shaping your Circle.</p>}
    </section>
  )
}
