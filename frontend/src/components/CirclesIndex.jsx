import { Navigate, Link } from 'react-router-dom'
import { getActiveCircle } from '../utils/invitationStorage.js'

export default function CirclesIndex() {
  if (getActiveCircle()) return <Navigate to="/circles/demo" replace />
  return <section className="placeholder-page container"><div className="placeholder-orbit" aria-hidden="true"><span /><span /><span /></div><p className="eyebrow"><span /> MUTUAL COLLABORATION</p><h1>No active Circles yet</h1><p className="placeholder-description">Circles form when people mutually choose to collaborate around a shared intent.</p><div className="empty-circle-actions"><Link className="button" to="/">Create an intent</Link><Link to="/discover">Explore what’s happening</Link></div></section>
}
