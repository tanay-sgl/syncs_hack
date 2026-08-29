const TASKS_KEY = 'converge_circle_tasks'
const AGENDA_KEY = 'converge_circle_agenda'
const MEETING_KEY = 'converge_circle_meeting'

function parse(key) { try { return JSON.parse(localStorage.getItem(key)) } catch { return null } }

export const getCircleTasks = (fallback) => {
  const value = parse(TASKS_KEY)
  return Array.isArray(value) && value.every((task) => task && typeof task.id === 'string' && typeof task.title === 'string' && typeof task.ownerId === 'string' && ['Todo', 'In progress', 'Done'].includes(task.status)) ? value : fallback
}
export const saveCircleTasks = (value) => localStorage.setItem(TASKS_KEY, JSON.stringify(value))
export const getCircleAgenda = (fallback) => {
  const value = parse(AGENDA_KEY)
  return Array.isArray(value) && value.every((item) => item && typeof item.id === 'string' && typeof item.text === 'string' && typeof item.done === 'boolean') ? value : fallback
}
export const saveCircleAgenda = (value) => localStorage.setItem(AGENDA_KEY, JSON.stringify(value))
export const getCircleMeeting = (fallback) => {
  const value = parse(MEETING_KEY)
  return value && typeof value === 'object' && !Array.isArray(value) && typeof value.dateTime === 'string' && typeof value.location === 'string' ? value : fallback
}
export const saveCircleMeeting = (value) => localStorage.setItem(MEETING_KEY, JSON.stringify(value))
