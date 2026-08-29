export default function WhyPerson({ person, needed }) {
  const relevant = person.skills.filter((skill) => needed.some((item) => item.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(item.toLowerCase())))

  return (
    <div className="why-person">
      <h4>Why {person.name.split(' ')[0]} surfaced</h4>
      <div className="why-grid">
        <div><span>YOU’RE LOOKING FOR</span><p>{needed.join(' · ') || 'Complementary strengths'}</p></div>
        <div><span>{person.name.split(' ')[0].toUpperCase()} BRINGS</span><p>{(relevant.length ? relevant : person.skills).join(' · ')}</p></div>
        <div><span>OTHER ALIGNMENT</span><p>{person.matchingReasons.slice(0, 3).join(' · ')}</p></div>
        <div><span>POSSIBLE TRADE-OFF</span><p>{person.tradeoff}</p></div>
      </div>
      <p className="recommendation-note">This is a recommendation signal, not a judgement of how well two people will work together.</p>
    </div>
  )
}
