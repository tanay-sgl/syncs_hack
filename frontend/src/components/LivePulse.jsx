export default function LivePulse({ intents }) {
  const groups = ['Study','Hackathons','Projects','Cofounders','Organisations'].map((category) => ({ category, count: intents.filter((intent) => intent.category === category).reduce((sum, intent) => sum + intent.participantCount, 0) }))
  const max = Math.max(...groups.map((group) => group.count), 1)
  return <section className="live-pulse"><div><p>AGGREGATE INTENT</p><h2>Live pulse</h2><span>Demand can create the event.</span></div><div>{groups.map((group) => <article key={group.category}><span>{group.category}</span><i><b style={{ width: `${(group.count / max) * 100}%` }} /></i><strong>{group.count}</strong></article>)}</div></section>
}
