import { useState } from 'react'

export default function CircleAgenda({ agenda, onChange }) {
  const [draft, setDraft] = useState('')
  const add = () => { if (!draft.trim()) return; onChange([...agenda, { id: `agenda-${Date.now()}`, text: draft.trim(), done: false }]); setDraft('') }
  return (
    <section className="workspace-card circle-agenda"><div className="workspace-card-heading"><span>AGENDA</span><h2>What to align on</h2></div><div className="agenda-list">{agenda.map((item, index) => <article className={item.done ? 'done' : ''} key={item.id}><button type="button" aria-label={item.done ? `Mark ${item.text} not discussed` : `Mark ${item.text} discussed`} onClick={() => onChange(agenda.map((current) => current.id === item.id ? { ...current, done: !current.done } : current))}>{item.done ? '✓' : index + 1}</button><span>{item.text}</span><button type="button" aria-label={`Delete ${item.text}`} onClick={() => onChange(agenda.filter((current) => current.id !== item.id))}>×</button></article>)}</div><div className="agenda-add"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') add() }} placeholder="Add an agenda item" /><button type="button" onClick={add}>+ Add</button></div></section>
  )
}
