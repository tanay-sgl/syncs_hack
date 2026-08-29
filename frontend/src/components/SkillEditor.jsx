import { useState } from 'react'

export default function SkillEditor({ skills, onChange, accent = false, label }) {
  const [draft, setDraft] = useState('')

  const addSkill = () => {
    const skill = draft.trim()
    if (!skill || skills.some((current) => current.toLowerCase() === skill.toLowerCase())) return
    onChange([...skills, skill])
    setDraft('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addSkill()
    }
  }

  return (
    <div className="skill-editor">
      <div className="skill-list" aria-label={label}>
        {skills.map((skill) => (
          <span className={`skill-chip ${accent ? 'skill-chip-accent' : ''}`} key={skill}>
            {skill}
            <button type="button" aria-label={`Remove ${skill}`} onClick={() => onChange(skills.filter((item) => item !== skill))}>×</button>
          </span>
        ))}
        {skills.length === 0 && <span className="empty-value">None added yet</span>}
      </div>
      <div className="skill-add">
        <label className="sr-only" htmlFor={`${label.replaceAll(' ', '-').toLowerCase()}-input`}>Add to {label}</label>
        <input id={`${label.replaceAll(' ', '-').toLowerCase()}-input`} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder="Add a skill" />
        <button type="button" onClick={addSkill} disabled={!draft.trim()}>+ Add</button>
      </div>
    </div>
  )
}
