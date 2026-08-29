import { Link } from 'react-router-dom'

export default function ActivityCard({ icon, category, title, meta, count }) {
  return (
    <article className="activity-card">
      <div className="activity-icon" aria-hidden="true">{icon}</div>
      <div className="activity-content"><p className="activity-category">{category}</p><h3>{title}</h3><p className="activity-meta">{meta}</p></div>
      <div className="activity-aside"><span><i aria-hidden="true" /> {count}</span><Link to="/discover">View <span aria-hidden="true">↗</span></Link></div>
    </article>
  )
}
