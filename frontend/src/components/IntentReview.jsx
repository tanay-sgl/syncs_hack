import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CapabilityGap from './CapabilityGap.jsx'
import IntentField from './IntentField.jsx'
import SkillEditor from './SkillEditor.jsx'
import { saveReviewedIntent } from '../utils/storage.js'

const activityOptions = ['Hackathon', 'Study', 'Cofounder', 'University project', 'Meet', 'Collaboration']
const commitmentOptions = ['Casual', 'Focused', 'High']
const styleOptions = ['Relaxed', 'Balanced', 'Competitive']

function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div className="segmented-control" role="group" aria-label={label}>
      {options.map((option) => <button className={value === option ? 'selected' : ''} type="button" key={option} aria-pressed={value === option} onClick={() => onChange(option)}>{option}</button>)}
    </div>
  )
}

export default function IntentReview({ initialIntent }) {
  const [intent, setIntent] = useState(initialIntent)
  const navigate = useNavigate()
  const update = (key, value) => setIntent((current) => ({ ...current, [key]: value }))

  const submitReview = () => {
    saveReviewedIntent(intent)
    navigate('/matches')
  }

  return (
    <div className="review-layout">
      <header className="review-header">
        <p className="eyebrow"><span /> YOUR INTENT</p>
        <h1>Here’s what we understood</h1>
        <p>Check the details before we start exploring relevant people.</p>
      </header>

      <section className="original-intent">
        <span>YOUR ORIGINAL REQUEST</span>
        <p>“{intent.originalText}”</p>
        <i aria-hidden="true">→</i>
      </section>

      <div className="review-grid">
        <IntentField label="Activity" hint="What you’re coordinating">
          <div className="activity-picker">
            {activityOptions.map((activity) => <button className={intent.activity === activity ? 'selected' : ''} type="button" key={activity} aria-pressed={intent.activity === activity} onClick={() => update('activity', activity)}>{activity}</button>)}
          </div>
        </IntentField>

        <IntentField label="Group size" hint={intent.activity === 'Study' ? 'Total people, including you' : 'Total people'}>
          <div className="number-control">
            <button type="button" aria-label="Decrease group size" onClick={() => update('groupSize', Math.max(2, intent.groupSize - 1))}>−</button>
            <strong>{intent.groupSize}</strong>
            <button type="button" aria-label="Increase group size" onClick={() => update('groupSize', Math.min(20, intent.groupSize + 1))}>+</button>
            <span>{intent.groupSize - 1} to find · {intent.groupSize} total</span>
          </div>
        </IntentField>

        {intent.activity === 'Study' && (
          <IntentField label="Course" hint="Course or subject code">
            <input className="text-control" value={intent.course} onChange={(event) => update('course', event.target.value.toUpperCase())} placeholder="e.g. COMP2022" />
          </IntentField>
        )}

        <IntentField className="wide-field" label="Skills needed" hint="Capabilities that would complement you">
          <SkillEditor label="Skills needed" skills={intent.skillsNeeded} onChange={(skills) => update('skillsNeeded', skills)} accent />
        </IntentField>

        <IntentField className="wide-field" label="Skills already covered" hint="What you or others already bring">
          <SkillEditor label="Skills already covered" skills={intent.skillsCovered} onChange={(skills) => update('skillsCovered', skills)} />
        </IntentField>

        <IntentField label="Availability" hint="When this can happen">
          <input className="text-control" value={intent.availability} onChange={(event) => update('availability', event.target.value)} />
        </IntentField>

        <IntentField label="Location" hint="Where you can connect">
          <select className="text-control" value={intent.location} onChange={(event) => update('location', event.target.value)}>
            <option>Campus / nearby</option><option>Remote</option><option>Anywhere</option><option>Sydney</option>
          </select>
        </IntentField>

        <IntentField className="wide-field" label="Commitment" hint="How much energy you want to bring">
          <SegmentedControl label="Commitment" options={commitmentOptions} value={intent.commitment} onChange={(value) => update('commitment', value)} />
        </IntentField>

        <IntentField className="wide-field" label="Collaboration style" hint="The pace and atmosphere you prefer">
          <SegmentedControl label="Collaboration style" options={styleOptions} value={intent.style} onChange={(value) => update('style', value)} />
        </IntentField>

        <IntentField className="wide-field" label="Interests" hint="Optional shared context">
          <SkillEditor label="Interests" skills={intent.interests} onChange={(interests) => update('interests', interests)} />
        </IntentField>
      </div>

      <CapabilityGap covered={intent.skillsCovered} needed={intent.skillsNeeded} />

      <aside className="control-message">
        <div className="control-icon" aria-hidden="true"><span /><span /><span /></div>
        <div><h2>Nothing here locks you into a group.</h2><p>These details only help us surface relevant possibilities. You decide who to explore and invite.</p></div>
      </aside>

      <div className="review-actions">
        <button className="button-secondary" type="button" onClick={() => navigate(-1)}>← Back</button>
        <button className="button" type="button" onClick={submitReview}>Show me possibilities <span aria-hidden="true">→</span></button>
      </div>
    </div>
  )
}
