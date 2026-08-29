export default function CircleCoverage({ coverage, onFind }) {
  return (
    <section className="circle-coverage">
      <div><span>LIVE COVERAGE</span><h2>Circle coverage</h2><p>Potential coverage from people currently in the canvas.</p></div>
      <div className="circle-coverage-list">{coverage.map(({ skill, people }) => <article key={skill}><span>{skill}</span><strong className={people.length ? 'covered' : ''}>{people.length > 1 ? `${people.length} possibilities` : people.length === 1 ? `Potentially covered by ${people[0].name.split(' ')[0]}` : 'Still missing'}</strong>{!people.length && <button type="button" onClick={() => onFind(skill)}>Find someone</button>}</article>)}</div>
    </section>
  )
}
