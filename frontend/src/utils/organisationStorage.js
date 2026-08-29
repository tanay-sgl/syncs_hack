const INTERESTS_KEY = 'converge_organisation_interests'
const CUSTOM_NEEDS_KEY = 'converge_custom_org_needs'

function readIds(key) {
  try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? [...new Set(value.filter((id) => typeof id === 'string'))] : [] } catch { return [] }
}

export const getOrganisationInterests = () => readIds(INTERESTS_KEY)
export const saveOrganisationInterests = (ids) => localStorage.setItem(INTERESTS_KEY, JSON.stringify(ids))
export const getCustomOrganisationNeeds = () => {
  try {
    const value = JSON.parse(localStorage.getItem(CUSTOM_NEEDS_KEY))
    return Array.isArray(value) ? value.filter((need) => need && typeof need.id === 'string' && typeof need.organisationId === 'string' && typeof need.title === 'string' && Array.isArray(need.skillsNeeded)) : []
  } catch { return [] }
}
export const saveCustomOrganisationNeeds = (needs) => localStorage.setItem(CUSTOM_NEEDS_KEY, JSON.stringify(needs))
