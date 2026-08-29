import { mockCandidates } from '../data/mockCandidates.js'

const normalise = (value) => value.toLowerCase().replaceAll('/', '').replaceAll('-', ' ')
const overlaps = (left, right) => left.some((a) => right.some((b) => normalise(a).includes(normalise(b)) || normalise(b).includes(normalise(a))))

export function getMockMatches(intent) {
  return mockCandidates.map((candidate) => {
    const coveredSkills = intent.skillsNeeded.filter((needed) => overlaps([needed], candidate.skills))
    const sharedInterests = intent.interests.filter((interest) => overlaps([interest], candidate.interests))
    let score = candidate.relevanceScore * 0.78

    score += coveredSkills.length * 6
    score += sharedInterests.length * 3
    if (candidate.availability === intent.availability) score += 4
    if (candidate.commitment === intent.commitment) score += 2
    if (intent.activity === 'Study') score += overlaps([intent.course, 'Study partners', 'Teaching', 'Algorithms'], [...candidate.skills, ...candidate.interests]) ? 20 : -9
    if (intent.activity === 'Cofounder') score += ['Technical', 'Health-tech', 'Entrepreneurship'].filter((signal) => overlaps([signal], [...candidate.skills, ...candidate.interests])).length * 6
    if (intent.activity === 'Hackathon' && candidate.interests.includes('Hackathons')) score += 7

    const reasons = [
      ...coveredSkills.map((skill) => `Covers ${skill}`),
      ...(candidate.availability === intent.availability ? [`Available ${intent.availability.toLowerCase()}`] : []),
      ...(sharedInterests.length ? [`Shares interest in ${sharedInterests[0]}`] : []),
      ...candidate.matchingReasons,
    ]

    return { ...candidate, relevanceScore: Math.min(97, Math.round(score)), coveredSkills, matchingReasons: [...new Set(reasons)].slice(0, 4) }
  }).sort((a, b) => b.relevanceScore - a.relevanceScore)
}
