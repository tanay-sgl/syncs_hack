const technical = ['Frontend', 'React', 'Backend', 'Machine Learning', 'Technical', 'TypeScript', 'Hardware']
const creative = ['UI/UX', 'Design', 'Figma', 'Product', 'Pitching', 'Marketing']
const matches = (skill, list) => list.some((item) => item.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(item.toLowerCase()))

function pickDistinct(candidates, count, score) {
  return [...candidates].sort((a, b) => score(b) - score(a)).slice(0, count)
}

export function generateSuggestedCombinations(intent, candidates) {
  const count = Math.max(1, Math.min(intent.groupSize - 1, candidates.length))
  const coverageScore = (person) => intent.skillsNeeded.filter((skill) => matches(skill, person.skills)).length * 30 + person.relevanceScore
  const technicalScore = (person) => person.skills.filter((skill) => matches(skill, technical)).length * 22 + person.relevanceScore
  const creativeScore = (person) => person.skills.filter((skill) => matches(skill, creative)).length * 22 + person.relevanceScore

  const balanced = []
  const missing = [...intent.skillsNeeded]
  while (balanced.length < count) {
    const remaining = candidates.filter((person) => !balanced.includes(person))
    const next = pickDistinct(remaining, 1, (person) => missing.filter((skill) => matches(skill, person.skills)).length * 50 + coverageScore(person))[0]
    if (!next) break
    balanced.push(next)
    next.skills.forEach((skill) => {
      const index = missing.findIndex((needed) => matches(needed, [skill]))
      if (index >= 0) missing.splice(index, 1)
    })
  }

  return [
    { id: 'balanced', label: 'BALANCED', focus: 'Broad capability coverage', members: balanced, strength: 'Broad coverage across technical, design and presentation needs.', tradeoff: 'May offer less depth in any one specialist discipline.' },
    { id: 'tech-heavy', label: 'TECH-HEAVY', focus: 'Technical execution', members: pickDistinct(candidates, count, technicalScore), strength: 'Strong implementation capacity and technical overlap.', tradeoff: 'Pitching and product storytelling may be less covered.' },
    { id: 'creative', label: 'CREATIVE / PRODUCT', focus: 'Experience and storytelling', members: pickDistinct(candidates, count, creativeScore), strength: 'Strong user experience, product framing and storytelling.', tradeoff: 'May have less engineering redundancy.' },
  ]
}
