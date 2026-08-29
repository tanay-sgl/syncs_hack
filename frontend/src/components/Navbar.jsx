import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import DemoReset from './DemoReset.jsx'

const links = [
  { label: 'Discover', to: '/discover' },
  { label: 'Circles', to: '/circles' },
  { label: 'Organisations', to: '/organisations' },
  { label: 'Founders', to: '/founders' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="site-header">
      <nav className="navbar container" aria-label="Primary navigation">
        <Link className="wordmark" to="/" onClick={closeMenu}>
          <span className="wordmark-mark" aria-hidden="true"><i /><i /><i /></span>
          CONVERGE
        </Link>
        <div className="desktop-nav">
          {links.map((link) => <NavLink key={link.to} to={link.to}>{link.label}</NavLink>)}
        </div>
        <div className="nav-actions">
          <DemoReset onReset={closeMenu} />
          <Link className="button button-small desktop-create" to="/create">Create intent</Link>
          <span className="avatar" aria-label="User profile placeholder">SS</span>
          <button className="menu-button" type="button" aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} onClick={() => setMenuOpen((open) => !open)}>
            <span /><span />
          </button>
        </div>
        {menuOpen && (
          <div className="mobile-nav" id="mobile-navigation">
            {links.map((link) => <NavLink key={link.to} to={link.to} onClick={closeMenu}>{link.label}</NavLink>)}
            <Link className="button" to="/create" onClick={closeMenu}>Create intent</Link>
          </div>
        )}
      </nav>
    </header>
  )
}
