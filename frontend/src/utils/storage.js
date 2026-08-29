const ORIGINAL_INTENT_KEY = 'converge-intent'
const REVIEWED_INTENT_KEY = 'converge_current_intent'

export function getOriginalIntent() {
  return localStorage.getItem(ORIGINAL_INTENT_KEY)
}

export function saveOriginalIntent(intent) {
  localStorage.setItem(ORIGINAL_INTENT_KEY, intent)
}

export function getReviewedIntent() {
  const stored = localStorage.getItem(REVIEWED_INTENT_KEY)
  if (!stored) return null

  try {
    const value = JSON.parse(stored)
    const validSkills = (skills) => Array.isArray(skills) && skills.every((skill) => typeof skill === 'string')
    return value && typeof value === 'object' && typeof value.activity === 'string' && typeof value.originalText === 'string' && validSkills(value.skillsNeeded) && validSkills(value.skillsCovered) && validSkills(value.interests) ? value : null
  } catch {
    return null
  }
}

export function saveReviewedIntent(intent) {
  localStorage.setItem(REVIEWED_INTENT_KEY, JSON.stringify(intent))
}
