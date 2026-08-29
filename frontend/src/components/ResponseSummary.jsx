const states = [['interested', 'Interested'], ['pending', 'Pending'], ['declined', 'Passed for now']]

export default function ResponseSummary({ people, statuses }) {
  return (
    <section className="response-summary">
      <div className="response-heading"><div><p>LIVE RESPONSES</p><h2>Response status</h2></div>{states.map(([state, label]) => <article key={state}><strong>{people.filter((person) => statuses[person.id] === state).length}</strong><span>{label}</span></article>)}</div>
      <div className="response-people">{people.map((person) => <div key={person.id}><span>{person.initials}</span><strong>{person.name}</strong><i className={statuses[person.id]}>{statuses[person.id] === 'not-sent' ? 'Not sent' : statuses[person.id] === 'declined' ? 'Passed for now' : statuses[person.id]}</i></div>)}</div>
    </section>
  )
}
