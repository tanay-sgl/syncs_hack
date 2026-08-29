const INTERESTS_KEY = 'converge_discover_interests'

export function getDiscoverInterests() {
  try { const value = JSON.parse(localStorage.getItem(INTERESTS_KEY)); return Array.isArray(value) ? [...new Set(value.filter((id) => typeof id === 'string'))] : [] } catch { return [] }
}

export function saveDiscoverInterests(ids) {
  localStorage.setItem(INTERESTS_KEY, JSON.stringify(ids))
}
