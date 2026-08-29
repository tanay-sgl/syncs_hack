import { useState } from 'react'

export default function CircleTasks({ tasks, members, onChange }) {
  const [draft, setDraft] = useState('')
  const add = () => { if (!draft.trim()) return; onChange([...tasks, { id: `task-${Date.now()}`, title: draft.trim(), ownerId: '', status: 'Todo' }]); setDraft('') }
  const update = (id, patch) => onChange(tasks.map((task) => task.id === id ? { ...task, ...patch } : task))
  return (
    <section className="workspace-card circle-tasks"><div className="workspace-card-heading"><span>LIGHTWEIGHT TASKS</span><h2>First implementation blocks</h2></div><div className="task-list">{tasks.map((task) => <article key={task.id}><span className={`task-state ${task.status.toLowerCase().replaceAll(' ', '-')}`}>{task.status === 'Done' ? '✓' : task.status === 'In progress' ? '◐' : '○'}</span><strong>{task.title}</strong><label>Owner<select value={task.ownerId} onChange={(event) => update(task.id, { ownerId: event.target.value })}><option value="">Unassigned</option>{members.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label><label>Status<select value={task.status} onChange={(event) => update(task.id, { status: event.target.value })}><option>Todo</option><option>In progress</option><option>Done</option></select></label><button type="button" aria-label={`Delete ${task.title}`} onClick={() => onChange(tasks.filter((current) => current.id !== task.id))}>×</button></article>)}</div><div className="task-add"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') add() }} placeholder="Add a task" /><button type="button" onClick={add}>+ Add task</button></div></section>
  )
}
