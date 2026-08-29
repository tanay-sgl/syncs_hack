import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CreateOrganisationNeed from './CreateOrganisationNeed.jsx'
import OrganisationCard from './OrganisationCard.jsx'
import OrganisationFilters from './OrganisationFilters.jsx'
import { mockOrganisations } from '../data/mockOrganisations.js'
import { getCustomOrganisationNeeds,saveCustomOrganisationNeeds } from '../utils/organisationStorage.js'

const initialFilters={search:'',category:'All',type:'All types'}
export default function OrganisationsPage(){
  const [filters,setFilters]=useState(initialFilters)
  const [customNeeds,setCustomNeeds]=useState(getCustomOrganisationNeeds)
  const [creating,setCreating]=useState(false)
  useEffect(()=>saveCustomOrganisationNeeds(customNeeds),[customNeeds])
  const allNeeds=mockOrganisations.flatMap((organisation)=>[...organisation.openIntents,...customNeeds.filter((need)=>need.organisationId===organisation.id)].map((need)=>({...need,organisation})))
  const filtered=useMemo(()=>{const search=filters.search.toLowerCase();return mockOrganisations.filter((org)=>filters.category==='All'||org.category===filters.category).filter((org)=>filters.type==='All types'||[...org.openIntents,...customNeeds.filter((need)=>need.organisationId===org.id)].some((need)=>need.type===filters.type)).filter((org)=>!search||[org.name,org.description,...org.tags,...org.openIntents.flatMap((need)=>[need.title,...need.skillsNeeded])].join(' ').toLowerCase().includes(search))},[filters,customNeeds])
  return <div className="organisations-page container"><header className="org-header"><div><p className="eyebrow"><span /> ORGANISATION NETWORK</p><h1>Communities looking <span>for people</span></h1><p>Discover organisations, projects and opportunities built around live needs.</p><small>People aren’t the only blocks that need connecting.</small></div><button className="button" type="button" onClick={()=>setCreating(true)}>+ Post a need</button></header>
    <section className="org-live-needs"><div className="org-section-heading"><div><p>LIVE ORGANISATION INTENT</p><h2>Looking for people now</h2></div><span>Connect skills with communities that need them.</span></div><div>{allNeeds.slice(0,5).map((item)=><section key={item.id}><header><span>{item.organisation.logoInitials}</span><div><small>{item.organisation.shortName}</small><strong>{item.title}</strong></div></header><p>{item.description}</p><div><span>{item.peopleNeeded} needed</span><span>{item.time}</span></div><footer><div>{item.skillsNeeded.slice(0,3).map((skill)=><i key={skill}>{skill}</i>)}</div><Link to={`/organisations/${item.organisation.id}`}>Explore opportunity →</Link></footer></section>)}</div></section>
    <section className="org-intent-explainer"><article><span>AI</span><strong>SYDNEY AI SOCIETY</strong></article><i>↓</i><article><span>01</span><strong>Need 4 mentors</strong></article><i>↓</i><article><span>+</span><strong>Students with ML + mentoring</strong></article><i>↓</i><article className="mutual-block"><span>↔</span><strong>Mutual interest</strong></article><header><p>ORGANISATIONS HAVE INTENT TOO.</p><h2>Needs become visible blocks.</h2></header></section>
    <OrganisationFilters filters={filters} onChange={(key,value)=>setFilters((current)=>({...current,[key]:value}))} onReset={()=>setFilters(initialFilters)} />
    <div className="org-grid-heading"><h2>Organisation network</h2><span>{filtered.length} communities</span></div>{filtered.length?<div className="organisation-grid">{filtered.map((organisation)=><OrganisationCard key={organisation.id} organisation={organisation} openIntentCount={organisation.openIntents.length+customNeeds.filter((need)=>need.organisationId===organisation.id).length} />)}</div>:<div className="discover-empty"><h2>Nothing matching that yet</h2><p>Try another category or opportunity type.</p><button className="button" type="button" onClick={()=>setFilters(initialFilters)}>Reset filters</button></div>}
    {creating&&<CreateOrganisationNeed organisation={mockOrganisations[0]} onClose={()=>setCreating(false)} onSubmit={(need)=>{setCustomNeeds((current)=>[need,...current]);setCreating(false)}} />}
  </div>
}
