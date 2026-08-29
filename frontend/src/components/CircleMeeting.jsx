export default function CircleMeeting({ meeting, onChange }) {
  return (
    <section className="workspace-card circle-meeting">
      <div className="workspace-card-heading"><span>NEXT MEETING</span><h2>Coordinate the next step</h2></div>
      <div><label>Date and time<input type="datetime-local" value={meeting.dateTime} onChange={(event) => onChange({ ...meeting, dateTime: event.target.value })} /></label><label>Location<input value={meeting.location} onChange={(event) => onChange({ ...meeting, location: event.target.value })} placeholder="Hackathon venue" /></label></div>
    </section>
  )
}
