export default function CircleAnalysis({ evaluation }) {
  const metrics = [
    ['Capability coverage', evaluation.capabilityScore],
    ['Availability overlap', evaluation.availabilityScore],
    ['Commitment alignment', evaluation.commitmentScore],
    ['Interest alignment', evaluation.interestScore],
  ]
  const overall = Math.round(metrics.reduce((sum, [, value]) => sum + value, 0) / metrics.length)

  return (
    <aside className="circle-analysis">
      <div className="fit-heading"><span>GROUP FIT ESTIMATE</span><strong>{overall}%</strong></div>
      <p className="fit-helper">An indicative comparison based on your current intent—not a prediction of group success.</p>
      <div className="fit-metrics">{metrics.map(([label, value]) => <div key={label}><p><span>{label}</span><strong>{value}%</strong></p><i><b style={{ width: `${value}%` }} /></i></div>)}<div className="redundancy"><span>Skill redundancy</span><strong>{evaluation.redundancy}</strong></div></div>
      <div className="analysis-list strengths"><h3>Potential strengths</h3>{evaluation.strengths.map((item) => <p key={item}><span>✓</span>{item}</p>)}</div>
      <div className="analysis-list tradeoffs"><h3>Possible trade-offs</h3>{evaluation.tradeoffs.map((item) => <p key={item}><span>•</span>{item}</p>)}</div>
    </aside>
  )
}
