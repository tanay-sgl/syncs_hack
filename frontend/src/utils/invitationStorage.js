const INVITATIONS_KEY = 'converge_invitations'
const ACTIVE_CIRCLE_KEY = 'converge_active_circle'

export function getInvitations() {
  try {
    const value = JSON.parse(localStorage.getItem(INVITATIONS_KEY))
    const validStatuses = value?.statuses && typeof value.statuses === 'object' && !Array.isArray(value.statuses) && Object.values(value.statuses).every((status) => ['not-sent', 'pending', 'interested', 'declined'].includes(status))
    return value && typeof value.message === 'string' && validStatuses && (value.sentAt === null || typeof value.sentAt === 'number') ? value : null
  } catch { return null }
}

export function saveInvitations(value) {
  localStorage.setItem(INVITATIONS_KEY, JSON.stringify(value))
}

export function getActiveCircle() {
  try {
    const value = JSON.parse(localStorage.getItem(ACTIVE_CIRCLE_KEY))
    const validSkills = (skills) => Array.isArray(skills) && skills.every((skill) => typeof skill === 'string')
    const validPeople = (people) => Array.isArray(people) && people.every((person) => person && typeof person.id === 'string' && typeof person.name === 'string' && typeof person.initials === 'string' && validSkills(person.skills))
    const validIntent = value?.intent && typeof value.intent.activity === 'string' && typeof value.intent.originalText === 'string' && validSkills(value.intent.skillsNeeded) && validSkills(value.intent.skillsCovered)
    return value && typeof value.id === 'string' && validIntent && validPeople(value.members) && value.members.length > 0 && validPeople(value.pendingInvitations) ? value : null
  } catch { return null }
}

export function saveActiveCircle(circle) {
  localStorage.setItem(ACTIVE_CIRCLE_KEY, JSON.stringify(circle))
}
