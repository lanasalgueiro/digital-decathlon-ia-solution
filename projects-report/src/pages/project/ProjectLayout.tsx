import { useState } from 'react'
import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { useProjectsStore } from '../../hooks/useProjectsStore'
import { Sidebar, type ViewId } from '../../components/Sidebar'

const titles: Record<ViewId, string> = {
  overview: 'Visão geral',
  timeline: 'Cronograma',
  features: 'Features & tempos',
  team: 'Equipe',
  status: 'Status semanal',
  edit: 'Editar projeto',
}

function viewFromPath(pathname: string): ViewId {
  if (pathname.endsWith('/timeline')) return 'timeline'
  if (pathname.endsWith('/features')) return 'features'
  if (pathname.endsWith('/team')) return 'team'
  if (pathname.endsWith('/status')) return 'status'
  if (pathname.endsWith('/edit')) return 'edit'
  return 'overview'
}

export function ProjectLayout() {
  const { projectId } = useParams()
  const store = useProjectsStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const project = store.getProject(projectId)

  if (!project) {
    return <Navigate to="/projetos" replace />
  }

  if ((project.kind ?? 'core') === 'atuacao') {
    return <Navigate to={`/projects/${project.id}`} replace />
  }

  const view = viewFromPath(location.pathname)

  return (
    <div className="app-shell">
      {menuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}

      <Sidebar
        projectId={project.id}
        projectTitle={project.title}
        dirty={store.dirty}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onBack={() => navigate('/projetos')}
      />

      <main className="main">
        <div className="page-header">
          <div>
            <button
              type="button"
              className="mobile-toggle"
              onClick={() => setMenuOpen(true)}
              style={{ marginBottom: '0.75rem' }}
            >
              Menu
            </button>
            <h1>{titles[view]}</h1>
            <p>{project.description}</p>
          </div>
          <div className="meta-row">
            <div className="meta-chip">
              <strong>Projeto</strong>
              {project.title}
            </div>
            <div className="meta-chip">
              <strong>Início</strong>
              {project.startDate}
            </div>
            <div className="meta-chip">
              <strong>Fim</strong>
              {project.endDate ?? '—'}
            </div>
            {store.dirty && (
              <div className="meta-chip meta-chip-warn">
                <strong>Local</strong>
                não salvo
              </div>
            )}
          </div>
        </div>

        <Outlet context={{ projectId: project.id }} />
      </main>
    </div>
  )
}
