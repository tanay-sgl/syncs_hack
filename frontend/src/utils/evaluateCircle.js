const matches = (skill, list) => list.some((item) => item.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(item.toLowerCase()))

export function evaluateCircle(intent, members) {
  const coverage = intent.skillsNeeded.map((skill) => {
    const people = members.filter((person) => matches(skill, person.skills))
    return { skill, people }
  })
  const coveredCount = coverage.filter((item) => item.people.length).length
  const capabilityScore = intent.skillsNeeded.length ? Math.round((coveredCount / intent.skillsNeeded.length) * 100) : 100
  const availabilityScore = members.length ? Math.round((members.filter((person) => person.availability === intent.availability).length / members.length) * 100) : 0
  const commitmentScore = members.length ? Math.round((members.filter((person) => person.commitment === intent.commitment).length / members.length) * 100) : 0
  const interestMatches = members.filter((person) => person.interests.some((interest) => intent.interests.includes(interest) || ['Hackathons', 'Startups'].includes(interest))).length
  const interestScore = members.length ? Math.max(35, Math.round((interestMatches / members.length) * 100)) : 0
  const skills = members.flatMap((person) => person.skills)
  const repeatedSkills = [...new Set(skills.filter((skill, index) => skills.indexOf(skill) !== index))]
  const redundancy = repeatedSkills.length >= 3 ? 'High' : repeatedSkills.length ? 'Moderate' : 'Low'
  const strengths = []
  const tradeoffs = []

  if (capabilityScore === 100) strengths.push('All requested capabilities are represented')
  else if (coveredCount) strengths.push(`${coveredCount} of ${intent.skillsNeeded.length} requested capabilities are represented`)
  if (availabilityScore === 100 && members.length) strengths.push(`Everyone is available ${intent.availability.toLowerCase()}`)
  if (members.some((person) => matches('UI/UX', person.skills)) && members.some((person) => matches('Frontend', person.skills))) strengths.push('Design and frontend capabilities can work in tandem')
  coverage.filter((item) => !item.people.length).forEach((item) => tradeoffs.push(`No current member strongly covers ${item.skill}`))
  if (repeatedSkills.length) tradeoffs.push(`Some capability overlap in ${repeatedSkills.slice(0, 2).join(' and ')}`)
  if (members.length && availabilityScore < 70) tradeoffs.push('Availability may need extra coordination')
  if (!strengths.length) strengths.push('The Circle is open for you to shape around your intent')
  if (!tradeoffs.length) tradeoffs.push('Individual working dynamics still need to be explored together')

  return { coverage, capabilityScore, availabilityScore, commitmentScore, interestScore, redundancy, strengths, tradeoffs }
}
