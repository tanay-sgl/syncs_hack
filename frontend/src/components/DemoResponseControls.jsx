export default function DemoResponseControls({ people, statuses, onChange, onEveryone, onReset, sent }) {
  return (
    <details className="demo-controls">
      <summary><span>DEMO ONLY</span> Demo controls <i>Simulate responses</i></summary>
      <div>{people.map((person) => <label key={person.id}><span>{person.name}</span><select value={statuses[person.id]} disabled={!sent} onChange={(event) => onChange(person.id, event.target.value)}><option value="pending">Pending</option><option value="interested">Interested</option><option value="declined">Passed for now</option></select></label>)}</div>
      <footer><button type="button" disabled={!sent} onClick={onEveryone}>Everyone interested</button><button type="button" onClick={onReset}>Reset responses</button></footer>
    </details>
  )
}
