import ActivityCard from './ActivityCard.jsx'
import ConnectedBlocks from './ConnectedBlocks.jsx'
import HowItWorks from './HowItWorks.jsx'
import IntentInputBar from './IntentInputBar.jsx'

const activities = [
  { icon: '🔥', category: 'Hackathons', title: '14 people forming hackathon teams', meta: 'Live now · Sydney', count: '14 active' },
  { icon: '📚', category: 'Study', title: '8 students studying COMP2022 tonight', meta: 'Tonight · Camperdown', count: '8 students' },
  { icon: '🚀', category: 'Founders', title: '5 founders exploring cofounder connections', meta: 'This week · Sydney', count: '5 exploring' },
  { icon: '🎨', category: 'Projects', title: '3 projects looking for designers', meta: 'Open now · Remote friendly', count: '3 projects' },
  { icon: '🤝', category: 'Organisations', title: '2 university organisations looking for volunteers', meta: 'This month · On campus', count: '2 groups' },
]

export default function Home() {
  return (
    <>
      <section className="hero-section container">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow"><span /> REAL-TIME HUMAN COORDINATION</p>
          <h1>What do you want to <span>make happen?</span></h1>
          <p className="hero-description">Tell Converge what you’re trying to accomplish. We’ll surface people, groups and opportunities that could help — you decide who to connect with.</p>
        </div>
        <IntentInputBar />
        <ConnectedBlocks />
      </section>
      <section className="section container" aria-labelledby="happening-title">
        <div className="section-heading">
          <div><p className="eyebrow"><span /> LIVE PULSE</p><h2 id="happening-title">Happening now</h2></div>
          <p>Shared intent is already bringing people into motion.</p>
        </div>
        <div className="activity-list">
          {activities.map((activity) => <ActivityCard key={activity.title} {...activity} />)}
        </div>
      </section>
      <HowItWorks />
    </>
  )
}
