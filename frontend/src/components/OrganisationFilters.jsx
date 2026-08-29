const categories=['All','Technology','Entrepreneurship','Research','Social Impact','Engineering','Health']
const types=['All types','Volunteering','Projects','Mentoring','Speaking','Events','Founders']

export default function OrganisationFilters({filters,onChange,onReset}) {
  return <section className="org-filters"><label><span aria-hidden="true">⌕</span><input value={filters.search} onChange={(event)=>onChange('search',event.target.value)} placeholder="Search organisations or opportunities..." /></label><div>{categories.map((category)=><button className={filters.category===category?'active':''} type="button" key={category} onClick={()=>onChange('category',category)}>{category}</button>)}</div><select value={filters.type} onChange={(event)=>onChange('type',event.target.value)} aria-label="Opportunity type">{types.map((type)=><option key={type}>{type}</option>)}</select><button type="button" onClick={onReset}>Reset</button></section>
}
