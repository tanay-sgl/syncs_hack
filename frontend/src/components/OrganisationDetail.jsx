import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CreateOrganisationNeed from './CreateOrganisationNeed.jsx'
import OrganisationOpportunity from './OrganisationOpportunity.jsx'
import OrganisationProject from './OrganisationProject.jsx'
import { fetchOrganisations } from '../api/client.js'
import { mockOrganisations } from '../data/mockOrganisations.js'
import { getCustomOrganisationNeeds,getOrganisationInterests,saveCustomOrganisationNeeds,saveOrganisationInterests } from '../utils/organisationStorage.js'

export default function OrganisationDetail(){
  const {id}=useParams();const [organisations,setOrganisations]=useState(mockOrganisations)
  useEffect(()=>{fetchOrganisations().then(setOrganisations).catch(()=>{})},[])
  const organisation=organisations.find((item)=>item.id===id)
  const [tab,setTab]=useState('Overview');const [interests,setInterests]=useState(getOrganisationInterests);const [customNeeds,setCustomNeeds]=useState(getCustomOrganisationNeeds);const [creating,setCreating]=useState(false)
  useEffect(()=>saveOrganisationInterests(interests),[interests]);useEffect(()=>saveCustomOrganisationNeeds(customNeeds),[customNeeds])
  if(!organisation)return <section className="placeholder-page container"><p className="eyebrow"><span /> ORGANISATION NETWORK</p><h1>Organisation not found</h1><p className="placeholder-description">This organisation isn’t part of the current demo network.</p><Link className="button" to="/organisations">Back to organisations</Link></section>
  const needs=[...customNeeds.filter((need)=>need.organisationId===organisation.id),...organisation.openIntents]
  const toggle=(needId)=>setInterests((current)=>current.includes(needId)?current.filter((item)=>item!==needId):[...current,needId])
  return <div className="org-detail-page container"><Link className="org-back" to="/organisations">← Organisation network</Link><header className="org-detail-header"><span>{organisation.logoInitials}</span><div><p>{organisation.category} · {organisation.university}</p><h1>{organisation.name}</h1><strong>{organisation.description}</strong><section><i>{organisation.memberCount} members</i><i>{needs.length} open needs</i>{organisation.tags.map((tag)=><i key={tag}>{tag}</i>)}</section></div><button className="button" type="button" onClick={()=>setCreating(true)}>+ Post a need</button></header><nav className="workspace-tabs">{['Overview','Opportunities','Projects'].map((item)=><button className={tab===item?'active':''} type="button" key={item} onClick={()=>setTab(item)}>{item}</button>)}</nav>
    {tab==='Overview'&&<div className="org-overview"><main><section><span>ABOUT</span><h2>Built around shared interests</h2><p>{organisation.description}</p></section><section><span>KEY INTERESTS</span><div>{organisation.interests.map((interest)=><i key={interest}>{interest}</i>)}</div></section><section><span>UPCOMING</span>{organisation.upcomingActivities.map((activity)=><article key={activity}><i />{activity}</article>)}</section></main><aside><span>CURRENT ACTIVITY</span><strong>{needs.length}</strong><p>live needs across {new Set(needs.map((need)=>need.type)).size} opportunity types</p><Link to="#" onClick={(event)=>{event.preventDefault();setTab('Opportunities')}}>View open needs →</Link></aside></div>}
    {tab==='Opportunities'&&<div className="org-opportunity-list"><div className="org-section-heading"><div><p>ORGANISATION INTENT</p><h2>Open needs</h2></div><span>Interest is exploratory, not automatic membership.</span></div>{needs.map((need)=><OrganisationOpportunity key={need.id} opportunity={need} interested={interests.includes(need.id)} onInterest={()=>toggle(need.id)} />)}</div>}
    {tab==='Projects'&&<div className="org-project-list"><div className="org-section-heading"><div><p>BUILDING NOW</p><h2>Organisation projects</h2></div></div>{organisation.projects.length?organisation.projects.map((project)=><OrganisationProject key={project.id} project={project}/>):<div className="discover-empty"><h2>No open projects right now</h2><p>Live needs and activities are still available in the other sections.</p></div>}</div>}
    {creating&&<CreateOrganisationNeed organisation={organisation} onClose={()=>setCreating(false)} onSubmit={(need)=>{setCustomNeeds((current)=>[need,...current]);setCreating(false);setTab('Opportunities')}} />}
  </div>
}
