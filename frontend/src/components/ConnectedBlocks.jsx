const nodes = ['Developer', 'Designer', 'Founder', 'Student', 'Mentor']

export default function ConnectedBlocks() {
  return (
    <div className="connected-visual" aria-hidden="true">
      <svg viewBox="0 0 800 190" preserveAspectRatio="none"><path d="M91 96 C 190 31, 283 153, 398 95" /><path d="M235 38 C 305 37, 333 73, 398 95" /><path d="M398 95 C 501 38, 575 36, 676 68" /><path d="M398 95 C 494 154, 594 158, 718 122" /></svg>
      <div className="shared-intent-node"><span>✦</span> Shared intent</div>
      {nodes.map((node, index) => <div className={`person-node node-${index + 1}`} key={node}><span />{node}</div>)}
    </div>
  )
}
