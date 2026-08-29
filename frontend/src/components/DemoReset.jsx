export default function DemoReset({ onReset }) {
  const resetDemo = () => {
    if (!window.confirm('Reset all Converge demo data and return home?')) return
    Object.keys(localStorage).filter((key) => key.startsWith('converge_') || key === 'converge-intent').forEach((key) => localStorage.removeItem(key))
    onReset?.()
    window.location.assign('/')
  }

  return <button className="demo-reset" type="button" onClick={resetDemo}>Reset demo</button>
}
