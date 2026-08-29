export default function InvitationComposer({ message, onChange, recipientCount }) {
  return (
    <section className="invitation-composer">
      <div><p>SHARED MESSAGE</p><h2>Start the conversation</h2><span>This message will be sent to each person.</span></div>
      <label htmlFor="invitation-message">Invitation message</label>
      <textarea id="invitation-message" value={message} maxLength="500" rows="5" onChange={(event) => onChange(event.target.value)} />
      <div className="composer-footer"><span>{message.length} / 500 characters</span><strong>{recipientCount} {recipientCount === 1 ? 'person' : 'people'} will receive an invitation.</strong></div>
    </section>
  )
}
