import { NavLink } from 'react-router-dom'

type ViewId = 'overview' | 'timeline' | 'features' | 'team' | 'status' | 'edit'

type Props = {
  projectId: string
  projectTitle: string
  dirty?: boolean
  onBack: () => void
  open: boolean
  onClose: () => void
}

const items: { id: ViewId; label: string; icon: string; path: string }[] = [
  { id: 'overview', label: 'Visão geral', icon: '◈', path: '' },
  { id: 'timeline', label: 'Cronograma', icon: '▦', path: 'timeline' },
  { id: 'features', label: 'Features & tempos', icon: '☰', path: 'features' },
  { id: 'team', label: 'Equipe', icon: '◎', path: 'team' },
  { id: 'status', label: 'Status → Slack', icon: '💬', path: 'status' },
  { id: 'edit', label: 'Editar / salvar', icon: '✎', path: 'edit' },
]

export function Sidebar({
  projectId,
  projectTitle,
  dirty,
  onBack,
  open,
  onClose,
}: Props) {
  const base = `/projects/${projectId}`

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="brand">
        <div className="brand-kicker">Projeto exclusivo</div>
        <div className="brand-title">{projectTitle}</div>
      </div>

      <nav className="nav" aria-label="Menu do projeto">
        <div className="nav-label">Navegação</div>
        {items.map((item) => {
          const to = item.path ? `${base}/${item.path}` : base
          return (
            <NavLink
              key={item.id}
              to={to}
              end={item.id === 'overview'}
              className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
              onClick={() => onClose()}
            >
              <span className="nav-icon" aria-hidden>
                {item.icon}
              </span>
              <span className="nav-btn-label">
                {item.label}
                {item.id === 'edit' && dirty ? (
                  <span className="nav-dot" title="Alterações não salvas" />
                ) : null}
              </span>
            </NavLink>
          )
        })}
      </nav>

      <div className="project-picker">
        <button type="button" className="back-projects-btn" onClick={onBack}>
          ← Todos os projetos
        </button>
      </div>
    </aside>
  )
}

export type { ViewId }
