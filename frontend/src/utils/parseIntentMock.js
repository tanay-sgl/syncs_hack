const skillPatterns = [
  ['Frontend', /front[ -]?end|react|web developer/i],
  ['UI/UX', /ui\s*\/\s*ux|ux|ui designer|user experience/i],
  ['Design', /\bdesign(?:er|ers)?\b/i],
  ['Pitching', /pitch(?:ing)?|present(?:ing|ation)/i],
  ['Backend', /back[ -]?end|server|api/i],
  ['Machine Learning', /machine learning|\bml\b/i],
  ['Technical', /technical|engineer|developer/i],
]

const coveredLanguage = /(?:i(?:'m| am)?\s+(?:handling|covering)|i can handle|we (?:have|cover)|already covered|i bring)([^.!]*)/gi
const needLanguage = /(?:need|looking for|find|seeking|want)([^.!]*)/gi

function skillsInSegments(text, pattern) {
  const segments = [...text.matchAll(pattern)].map((match) => match[1] || '')
  return skillPatterns.filter(([, regex]) => segments.some((segment) => regex.test(segment))).map(([skill]) => skill)
}

function detectActivity(text) {
  if (/hackathon|hack team/i.test(text)) return 'Hackathon'
  if (/study|cram|exam|course|COMP\d+/i.test(text)) return 'Study'
  if (/co-?founder|startup partner/i.test(text)) return 'Cofounder'
  if (/university project|group assignment|course project/i.test(text)) return 'University project'
  if (/coffee|meet|chat|talk/i.test(text)) return 'Meet'
  return 'Collaboration'
}

function detectAvailability(text) {
  if (/tonight/i.test(text)) return 'Tonight'
  if (/this afternoon/i.test(text)) return 'This afternoon'
  if (/tomorrow/i.test(text)) return 'Tomorrow'
  if (/this week/i.test(text)) return 'This week'
  if (/weekend/i.test(text)) return 'This weekend'
  return 'Flexible'
}

export function parseIntentMock(rawIntent) {
  const text = rawIntent.trim()
  const activity = detectActivity(text)
  const numberMatch = text.match(/(?:find|need|with)\s+(\d+)\s+(?:people|person|teammates?|students?)/i)
  const explicitNumber = numberMatch ? Number(numberMatch[1]) : null
  const covered = skillsInSegments(text, coveredLanguage)
  let needed = skillsInSegments(text, needLanguage).filter((skill) => !covered.includes(skill))

  if (activity === 'Hackathon' && needed.length === 0) needed = ['Frontend', 'UI/UX', 'Pitching']
  if (activity === 'Cofounder' && needed.length === 0) needed = ['Technical']
  if (activity === 'University project' && needed.length === 0) needed = ['Research', 'Presentation']
  if (activity === 'Study' && needed.length === 0) needed = ['Study partners']
  if (activity === 'Meet' && needed.length === 0) needed = ['Conversation']

  const course = text.match(/\b[A-Z]{4}\d{4}\b/i)?.[0]?.toUpperCase() || ''
  const interests = []
  if (/health[ -]?tech/i.test(text)) interests.push('Health-tech')
  if (/startup/i.test(text)) interests.push('Startups')

  return {
    originalText: text,
    activity,
    groupSize: activity === 'Study' && explicitNumber ? explicitNumber + 1 : explicitNumber || (activity === 'Cofounder' || activity === 'Meet' ? 2 : 4),
    skillsNeeded: needed,
    skillsCovered: covered,
    availability: detectAvailability(text),
    commitment: /competitive|serious|all in|high commitment/i.test(text) ? 'High' : activity === 'Meet' ? 'Casual' : 'Focused',
    style: /competitive/i.test(text) ? 'Competitive' : /relaxed|casual/i.test(text) ? 'Relaxed' : 'Balanced',
    location: /remote|online/i.test(text) ? 'Remote' : 'Campus / nearby',
    interests,
    course,
  }
}
