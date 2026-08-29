export default function CapabilityGap({ covered, needed }) {
  return (
    <section className="capability-gap" aria-labelledby="capability-title">
      <div className="capability-heading">
        <p className="eyebrow"><span /> COMPLEMENTARY CAPABILITIES</p>
        <h2 id="capability-title">What would complement you?</h2>
        <p>We surface capabilities that add to what’s already present—not just people who look similar.</p>
      </div>
      <div className="capability-map">
        <div className="capability-side capability-bring">
          <span className="capability-label">YOU BRING</span>
          <div>{covered.length ? covered.map((skill) => <span key={skill}>{skill}</span>) : <em>Add your capabilities above</em>}</div>
        </div>
        <div className="capability-bridge" aria-hidden="true">
          <i /><i /><i />
          <span>+</span>
        </div>
        <div className="capability-side capability-need">
          <span className="capability-label">YOU’RE LOOKING FOR</span>
          <div>{needed.length ? needed.map((skill) => <span key={skill}>{skill}</span>) : <em>Add complementary skills above</em>}</div>
        </div>
      </div>
    </section>
  )
}
