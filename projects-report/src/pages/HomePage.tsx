import { Link } from 'react-router-dom'
import { mainNavItems } from '../data/mainNav'

export function HomePage() {
  return (
    <div className="home-page">
      <header className="home-hero">
        <p className="selector-kicker">Menu principal</p>
        <h1>Ops Hub</h1>
        <p className="selector-lead">
          Escolha um tópico para acompanhar projetos, desempenho do time,
          incidentes e saúde dos serviços.
        </p>
      </header>

      <div className="home-menu-grid">
        {mainNavItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className="home-menu-card"
            style={{ ['--card-accent' as string]: accentFor(item.id) }}
          >
            <span className="home-menu-icon" aria-hidden>
              {item.icon}
            </span>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <span className="home-menu-cta">Abrir →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function accentFor(id: string): string {
  switch (id) {
    case 'projetos':
      return '#0a5c8a'
    case 'desempenho':
      return '#1f7a4d'
    case 'incidentes':
      return '#b33a2b'
    case 'uptime':
      return '#6b4c9a'
    default:
      return '#0a3d62'
  }
}
