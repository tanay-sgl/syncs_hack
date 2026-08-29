export default function IntentField({ label, hint, children, className = '' }) {
  return (
    <section className={`review-field ${className}`}>
      <div className="review-field-heading">
        <h3>{label}</h3>
        {hint && <span>{hint}</span>}
      </div>
      {children}
    </section>
  )
}
