export function detectEmergentSessionsMock(intents) {
  const clusters = new Map()
  intents.filter((intent) => intent.clusterKey).forEach((intent) => {
    const group = clusters.get(intent.clusterKey) || []
    group.push(intent)
    clusters.set(intent.clusterKey, group)
  })

  return [...clusters.entries()].map(([clusterKey, signals]) => {
    const participantCount = signals.reduce((sum, signal) => sum + signal.participantCount, 0)
    const topics = [...new Set(signals.flatMap((signal) => signal.skillsNeeded))]
    const peoplePreview = [...new Set(signals.flatMap((signal) => signal.peoplePreview))].slice(0, 5)
    return {
      id: `session-${clusterKey}`,
      category: signals[0].category,
      title: clusterKey === 'comp2022-tonight' ? 'COMP2022 Exam Sprint' : `${signals[0].title} session`,
      description: `${participantCount} students around campus want to revise COMP2022 tonight.`,
      topics,
      timeLabel: 'Tonight · 7–9 PM',
      timeGroup: 'Today',
      location: 'Campus',
      place: 'Fisher Library',
      threshold: 12,
      currentInterestCount: participantCount,
      peoplePreview,
      sourceCount: signals.length,
      whySurfaced: [`${participantCount} people mentioned COMP2022`, '6 mentioned automata', '7 are free after 6 PM', '5 are on campus'],
      status: participantCount >= 12 ? 'Session forming' : participantCount >= 8 ? 'Shared intent detected' : 'Gaining interest',
    }
  })
}
