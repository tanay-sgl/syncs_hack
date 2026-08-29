import { Link } from 'react-router-dom'

export default function OrganisationCard({ organisation, openIntentCount }) {
  const opportunity = organisation.openIntents[0]
  return <article className="organisation-card"><div className="org-card-top"><span>{organisation.logoInitials}</span><div><small>{organisation.category}</small><h2>{organisation.name}</h2></div></div><p>{organisation.description}</p><div className="org-numbers"><span><strong>{organisation.memberCount}</strong> members</span><span><strong>{openIntentCount}</strong> active needs</span></div><div className="org-tags">{organisation.tags.slice(0,3).map((tag)=><span key={tag}>{tag}</span>)}</div>{opportunity&&<div className="org-current"><span>CURRENTLY LOOKING FOR</span><strong>“{opportunity.title}”</strong></div>}<Link to={`/organisations/${organisation.id}`}>View organisation →</Link></article>
}
