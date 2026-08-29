export default function InterestProgress({ count, threshold }) {
  const percent = Math.min(100, Math.round((count / threshold) * 100))
  return <div className="interest-progress"><div><span>Current interest</span><strong>{count} / {threshold}</strong></div><i><b style={{ width: `${percent}%` }} /></i></div>
}
