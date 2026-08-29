import { useState } from 'react'
import { useDialogAccessibility } from '../utils/useDialogAccessibility.js'

const empty = { title: '', description: '', peopleNeeded: 1, skills: '', time: '', location: 'Campus', commitment: 'Flexible' }

export default function CreateOrganisationNeed({ organisation, onSubmit, onClose }) {
  const [form, setForm] = useState(empty)
  const closeRef = useDialogAccessibility(onClose)
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const submit = (event) => {
    event.preventDefault()
    if (!form.title.trim()) return
    onSubmit({ id: `custom-${Date.now()}`, organisationId: organisation.id, type: 'Projects', title: form.title.trim(), description: form.description.trim(), peopleNeeded: Number(form.peopleNeeded) || 1, skillsNeeded: form.skills.split(',').map((item) => item.trim()).filter(Boolean), time: form.time || 'Flexible', location: form.location, commitment: form.commitment, currentInterest: 0, status: 'Open need', custom: true })
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="create-need-modal" role="dialog" aria-modal="true" aria-labelledby="create-need-title" onSubmit={submit}><button ref={closeRef} className="modal-close" type="button" onClick={onClose} aria-label="Close need form">×</button><p>FRONTEND DEMO</p><h2 id="create-need-title">Post a need</h2><span>Express a live need for {organisation.shortName}.</span><label>Need title<input value={form.title} onChange={(event) => update('title', event.target.value)} required /></label><label>Description<textarea rows="3" value={form.description} onChange={(event) => update('description', event.target.value)} /></label><div><label>People needed<input type="number" min="1" max="30" value={form.peopleNeeded} onChange={(event) => update('peopleNeeded', event.target.value)} /></label><label>When<input value={form.time} onChange={(event) => update('time', event.target.value)} placeholder="e.g. Saturday" /></label></div><label>Useful skills<input value={form.skills} onChange={(event) => update('skills', event.target.value)} placeholder="Mentoring, Programming" /></label><div><label>Location<input value={form.location} onChange={(event) => update('location', event.target.value)} /></label><label>Commitment<input value={form.commitment} onChange={(event) => update('commitment', event.target.value)} /></label></div><button className="button" type="submit">Post need →</button></form></div>
}
