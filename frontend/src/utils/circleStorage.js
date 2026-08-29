const CIRCLE_DRAFT_KEY = 'converge_circle_draft'

export function getCircleDraft() {
  try { const value = JSON.parse(localStorage.getItem(CIRCLE_DRAFT_KEY)); return value && Array.isArray(value.memberIds) && value.memberIds.every((id) => typeof id === 'string') ? { ...value, memberIds: [...new Set(value.memberIds)] } : null } catch { return null }
}

export function saveCircleDraft(memberIds) {
  localStorage.setItem(CIRCLE_DRAFT_KEY, JSON.stringify({ memberIds, updatedAt: Date.now() }))
}
