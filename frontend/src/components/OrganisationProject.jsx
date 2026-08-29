import { Link } from 'react-router-dom'

export default function OrganisationProject({ project }) {
  return <article className="org-project"><span>ACTIVE PROJECT</span><h3>{project.title}</h3><p>{project.description}</p><div><small>CURRENT CAPABILITIES</small>{project.currentCapabilities.map((skill)=><i key={skill}>{skill}</i>)}</div><div className="project-needs"><small>LOOKING FOR</small>{project.skillsNeeded.map((skill)=><i key={skill}>{skill}</i>)}</div><Link to="/matches">Explore people / project →</Link></article>
}
