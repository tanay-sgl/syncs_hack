import { parseIntentMock } from '../utils/parseIntentMock.js'

const categoryToActivity = {
  study: 'Study', hackathon: 'Hackathon', cofounder: 'Cofounder', project: 'University project',
  coffee: 'Meet', mentor: 'Meet', volunteer: 'Collaboration', investor: 'Collaboration', other: 'Collaboration',
}
const activityToCategory = {
  Study: 'study', Hackathon: 'hackathon', Cofounder: 'cofounder', 'University project': 'project', Meet: 'coffee', Collaboration: 'other',
}
const commitmentToUi = { casual: 'Casual', moderate: 'Focused', dedicated: 'High' }
const commitmentToApi = { Casual: 'casual', Focused: 'moderate', High: 'dedicated' }

const titleCase = (value = '') => value.replace(/\b\w/g, (letter) => letter.toUpperCase())
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

export function adaptParsedIntent(response, originalText) {
  const apiIntent = response?.intent
  if (!apiIntent || !Array.isArray(apiIntent.roles) || !apiIntent.availability) throw new Error('Invalid parse-intent response')
  const local = parseIntentMock(originalText)
  return {
    ...local,
    activity: categoryToActivity[apiIntent.category] || local.activity,
    groupSize: Number(apiIntent.teamSize) || local.groupSize,
    skillsNeeded: apiIntent.roles.map((role) => titleCase(role.skill)).filter(Boolean),
    availability: apiIntent.availability.timeWindow ? titleCase(apiIntent.availability.timeWindow) : local.availability,
    commitment: commitmentToUi[apiIntent.commitment] || local.commitment,
    location: /remote/i.test(apiIntent.location) ? 'Remote' : /sydney/i.test(apiIntent.location) ? 'Sydney' : 'Campus / nearby',
    interests: [...new Set([...local.interests, ...(apiIntent.preferences || [])])],
    course: apiIntent.course || local.course,
    apiIntent,
  }
}

export function adaptFrontendIntentToApi(intent) {
  const base = intent.apiIntent || {}
  const availability = intent.availability || 'Flexible'
  return {
    ...base,
    category: activityToCategory[intent.activity] || base.category || 'other',
    roles: (intent.skillsNeeded || []).map((skill) => ({ skill, level: 'any', count: 1 })),
    availability: {
      days: /tonight|today/i.test(availability) ? ['today'] : base.availability?.days || [],
      timezone: base.availability?.timezone || 'Australia/Sydney',
      timeWindow: availability === 'Flexible' ? null : availability.toLowerCase(),
    },
    location: intent.location || base.location || 'nearby',
    projectType: base.projectType || intent.activity || 'collaboration',
    teamSize: Math.max(1, Number(intent.groupSize) || 4),
    preferences: Array.isArray(intent.interests) ? intent.interests : [],
    course: intent.course || null,
    topic: base.topic || null,
    commitment: commitmentToApi[intent.commitment] || base.commitment || 'moderate',
    urgency: base.urgency || (/tonight|today|now/i.test(availability) ? 'high' : 'medium'),
  }
}

export function adaptCandidateToApi(candidate, intent) {
  const day = /tonight/i.test(candidate.availability) ? 'today' : candidate.availability.toLowerCase()
  return {
    id: candidate.id,
    name: candidate.name,
    skills: candidate.skills.map((name) => ({ name, level: 'intermediate' })),
    availability: { days: [day], timezone: 'Australia/Sydney' },
    location: /remote/i.test(candidate.availability) ? 'remote' : 'campus',
    courses: intent.course ? [intent.course] : [],
    year: Number.parseInt(candidate.year, 10) || null,
    major: candidate.degreeOrRole || null,
    commitment: commitmentToApi[candidate.commitment] || 'moderate',
    workingStyle: candidate.collaborationStyle === 'Competitive' ? 'sync' : candidate.collaborationStyle === 'Relaxed' ? 'async' : 'flexible',
    bio: candidate.bio || null,
  }
}

export function adaptMatchResults(response, candidates, intent) {
  if (!Array.isArray(response?.results)) throw new Error('Invalid match response')
  const originals = new Map(candidates.map((candidate) => [candidate.id, candidate]))
  const seen = new Set()
  return response.results.map((result) => {
    const user = result?.user || {}
    const original = originals.get(user.id) || {}
    const skills = Array.isArray(user.skills) ? user.skills.map((skill) => skill.name).filter(Boolean) : original.skills || []
    const matchedRole = result.matchedRole ? titleCase(result.matchedRole) : ''
    const coveredSkills = (intent.skillsNeeded || []).filter((needed) => skills.some((skill) => skill.toLowerCase().includes(needed.toLowerCase()) || needed.toLowerCase().includes(skill.toLowerCase())))
    if (matchedRole && !coveredSkills.includes(matchedRole)) coveredSkills.push(matchedRole)
    return {
      ...original,
      id: user.id || original.id,
      name: user.name || original.name || 'Converge member',
      initials: original.initials || initials(user.name),
      bio: user.bio || original.bio || 'Open to exploring relevant collaboration possibilities.',
      skills,
      relevanceScore: Math.max(0, Math.min(100, Math.round((Number(result.score) || 0) * 100))),
      coveredSkills,
      matchingReasons: [...new Set([matchedRole && `Could contribute ${matchedRole}`, ...(original.matchingReasons || [])].filter(Boolean))].slice(0, 4),
    }
  }).filter((candidate) => {
    if (!candidate.id || seen.has(candidate.id)) return false
    seen.add(candidate.id)
    return true
  })
}

const liveCategoryToApi = { Study: 'study', Hackathons: 'hackathon', Projects: 'project', Cofounders: 'cofounder', Organisations: 'volunteer', Meet: 'coffee' }

export function adaptLiveIntentsToApi(intents) {
  return intents.filter((item) => item.clusterKey).flatMap((item) => Array.from({ length: item.participantCount }, (_, index) => ({
    id: `${item.id}-${index + 1}`,
    userId: `${item.id}-user-${index + 1}`,
    intent: {
      category: liveCategoryToApi[item.category] || 'other',
      roles: item.skillsNeeded.map((skill) => ({ skill, level: 'any', count: 1 })),
      availability: { days: /tonight|today|now/i.test(item.timeLabel) ? ['today'] : [], timezone: 'Australia/Sydney', timeWindow: item.timeLabel },
      location: item.location.toLowerCase(),
      projectType: item.title,
      teamSize: item.neededCount || item.participantCount,
      preferences: item.interests,
      course: item.interests.find((interest) => /^[A-Z]{4}\d{4}$/.test(interest)) || null,
      topic: null,
      commitment: item.urgency === 'High' ? 'dedicated' : 'moderate',
      urgency: item.urgency.toLowerCase(),
    },
  })))
}

export function adaptClustersToSessions(response, fallbackSessions) {
  if (!Array.isArray(response?.clusters)) throw new Error('Invalid detect-clusters response')
  return response.clusters.map((cluster, index) => {
    const fallback = fallbackSessions.find((session) => cluster.course && session.title.includes(cluster.course)) || fallbackSessions[index]
    const count = Number(cluster.size) || fallback?.currentInterestCount || 0
    return {
      ...(fallback || {}),
      id: fallback?.id || `session-api-${index}`,
      title: fallback?.title || cluster.suggestedEvent || 'Emergent session',
      description: fallback?.description || `${count} people have overlapping intent and availability.`,
      topics: fallback?.topics || [cluster.course, cluster.topic].filter(Boolean),
      timeLabel: fallback?.timeLabel || cluster.timeWindow || 'Time being coordinated',
      timeGroup: fallback?.timeGroup || 'Today',
      location: fallback?.location || titleCase(cluster.location),
      place: fallback?.place || titleCase(cluster.location),
      threshold: fallback?.threshold || Math.max(count + 1, 3),
      currentInterestCount: count,
      peoplePreview: fallback?.peoplePreview || [],
      sourceCount: cluster.intentIds?.length || count,
      whySurfaced: fallback?.whySurfaced || [`${count} people share a similar intent`, 'Availability and location overlap'],
      status: count >= (fallback?.threshold || count + 1) ? 'Session forming' : 'Shared intent detected',
    }
  })
}
