const steps = [
  { title: 'Tell us your intent', description: 'Describe what you’re trying to make happen naturally.' },
  { title: 'Explore relevant people', description: 'Converge surfaces people and possibilities based on context, skills and availability.' },
  { title: 'You make the connection', description: 'You choose who to invite, meet or collaborate with.' },
]

export default function HowItWorks() {
  return (
    <section className="how-section" aria-labelledby="how-title"><div className="container">
      <div className="how-heading"><p className="eyebrow"><span /> HUMAN CHOICE, AMPLIFIED</p><h2 id="how-title">From intent to connection</h2><p>AI narrows the world. You make the connection.</p></div>
      <div className="steps-grid">{steps.map((step, index) => <article className="step-card" key={step.title}><span className="step-number">0{index + 1}</span><div className="step-icon" aria-hidden="true">{index === 0 ? '✦' : index === 1 ? '⌁' : '↗'}</div><h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
    </div></section>
  )
}
