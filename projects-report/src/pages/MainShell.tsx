import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { mainNavItems } from '../data/mainNav'

export function MainShell() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="main-shell">
      <header className="top-nav">
        <NavLink to="/" className="top-nav-brand" end>
          <span className="top-nav-kicker">Digital Decathlon</span>
          <span className="top-nav-title">Ops Hub</span>
        </NavLink>

        <nav className="top-nav-links" aria-label="Menu principal">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                `top-nav-link${isActive ? ' active' : ''}`
              }
            >
              <span aria-hidden>{item.icon}</span>
              {item.title}
            </NavLink>
          ))}
        </nav>
      </header>

      <div className={`main-shell-body${isHome ? ' is-home' : ''}`}>
        <Outlet />
      </div>
    </div>
  )
}
