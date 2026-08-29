export default function MatchFilters({ filters, options, onChange, onReset }) {
  return (
    <div className="match-filters" aria-label="Filter people">
      <label>Sort<select value={filters.sort} onChange={(event) => onChange('sort', event.target.value)}><option>Most relevant</option><option>Availability</option><option>Skill coverage</option></select></label>
      <label>Skill<select value={filters.skill} onChange={(event) => onChange('skill', event.target.value)}><option value="">All skills</option>{options.skills.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Availability<select value={filters.availability} onChange={(event) => onChange('availability', event.target.value)}><option value="">Any time</option>{options.availability.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Commitment<select value={filters.commitment} onChange={(event) => onChange('commitment', event.target.value)}><option value="">Any level</option>{options.commitment.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Interest<select value={filters.interest} onChange={(event) => onChange('interest', event.target.value)}><option value="">All interests</option>{options.interests.map((value) => <option key={value}>{value}</option>)}</select></label>
      <button type="button" onClick={onReset}>Reset filters</button>
    </div>
  )
}
