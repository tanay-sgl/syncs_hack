export default function CapabilityMap({ needed, savedCandidates }) {
  return (
    <aside className="coverage-panel">
      <p className="eyebrow"><span /> LIVE COVERAGE</p>
      <h2>Your capability map</h2>
      <p className="coverage-context">Based on people you’ve saved</p>
      <div className="coverage-list">
        {needed.map((skill) => {
          const count = savedCandidates.filter((person) => person.skills.some((candidateSkill) => candidateSkill.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(candidateSkill.toLowerCase()))).length
          return <div key={skill}><span>{skill}</span><strong className={count ? 'covered' : ''}>{count > 1 ? `${count} possibilities` : count === 1 ? 'Potentially covered' : 'Still missing'}</strong></div>
        })}
      </div>
      <p className="coverage-note">Saving someone marks a possibility—not a confirmed connection.</p>
    </aside>
  )
}
