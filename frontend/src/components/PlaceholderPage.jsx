import { Link, useLocation } from 'react-router-dom'

export default function PlaceholderPage({ eyebrow, title, description, showIntent = false }) {
  const location = useLocation()
  const savedIntent = showIntent ? location.state?.intent || localStorage.getItem('converge-intent') : null

  return (
    <section className="placeholder-page container">
      <div className="placeholder-orbit" aria-hidden="true"><span /><span /><span /></div>
      <p className="eyebrow"><span /> {eyebrow}</p><h1>{title}</h1><p className="placeholder-description">{description}</p>
      {savedIntent && <div className="saved-intent"><span>Your intent</span><p>“{savedIntent}”</p></div>}
      <Link className="button" to="/">Back to home</Link>
    </section>
  )
}
