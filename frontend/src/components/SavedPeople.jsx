import { Link } from 'react-router-dom'

export default function SavedPeople({ people, onRemove }) {
  return (
    <section className="saved-people" aria-labelledby="saved-title">
      <div><h2 id="saved-title">Saved people <span>{people.length}</span></h2><p>Your shortlist of possibilities.</p></div>
      <div className="saved-blocks">
        {people.length ? people.map((person) => <button type="button" key={person.id} onClick={() => onRemove(person.id)} title={`Remove ${person.name} from saved people`}><span>{person.initials}</span>{person.name.split(' ')[0]} <i>×</i></button>) : <p>Save people to compare complementary strengths.</p>}
      </div>
      <Link className={`button button-small ${people.length ? '' : 'disabled-link'}`} to={people.length ? '/builder' : '/matches'} aria-disabled={!people.length}>Explore combinations →</Link>
    </section>
  )
}
