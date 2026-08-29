const SAVED_KEY = 'converge_saved_people'
const INVITED_KEY = 'converge_invited_people'

function readIds(key) {
  try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? [...new Set(value.filter((id) => typeof id === 'string'))] : [] } catch { return [] }
}

export const getSavedPeople = () => readIds(SAVED_KEY)
export const getInvitedPeople = () => readIds(INVITED_KEY)
export const savePeople = (ids) => localStorage.setItem(SAVED_KEY, JSON.stringify(ids))
export const saveInvitedPeople = (ids) => localStorage.setItem(INVITED_KEY, JSON.stringify(ids))
