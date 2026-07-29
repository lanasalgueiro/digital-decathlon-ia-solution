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
              className={() =>
                `top-nav-link${isNavActive(item.path, location.pathname) ? ' active' : ''}`
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

function isNavActive(path: string, pathname: string) {
  return pathname === path || pathname.startsWith(`${path}/`)
}
