import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from 'react-router-dom'
import { AppProviders } from './providers'
import { useProjectsStore } from '../hooks/useProjectsStore'
import { MainShell } from '../pages/MainShell'
import { HomePage } from '../pages/HomePage'
import { PortfolioPage } from '../pages/PortfolioPage'
import { DesempenhoPage } from '../pages/DesempenhoPage'
import { IncidentesPage } from '../pages/IncidentesPage'
import { IncidentesDashboardPage } from '../pages/IncidentesDashboardPage'
import { UptimePage } from '../pages/UptimePage'
import { ProjectAtuacaoPage } from '../pages/ProjectAtuacaoPage'
import { ProjectLayout } from '../pages/project/ProjectLayout'
import { OverviewPage } from '../pages/project/OverviewPage'
import { TimelinePage } from '../pages/project/TimelinePage'
import { FeaturesPage } from '../pages/project/FeaturesPage'
import { TeamPage } from '../pages/project/TeamPage'
import { StatusPage } from '../pages/project/StatusPage'
import { EditPage } from '../pages/project/EditPage'

function RootLayout() {
  return (
    <AppProviders>
      <Outlet />
    </AppProviders>
  )
}

/** Atuação: página simples. Core: layout com sidebar + subrotas. */
function ProjectGate() {
  const { projectId } = useParams()
  const location = useLocation()
  const store = useProjectsStore()
  const project = store.getProject(projectId)

  if (!project) {
    return <Navigate to="/projetos" replace />
  }

  if ((project.kind ?? 'core') === 'atuacao') {
    const base = `/projects/${project.id}`
    if (location.pathname !== base) {
      return <Navigate to={base} replace />
    }
    return <ProjectAtuacaoPage />
  }

  return <ProjectLayout />
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <MainShell />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/projetos', element: <PortfolioPage /> },
          { path: '/desempenho', element: <DesempenhoPage /> },
          { path: '/incidentes', element: <IncidentesPage /> },
          { path: '/incidentes/dashboard', element: <IncidentesDashboardPage /> },
          { path: '/uptime', element: <UptimePage /> },
        ],
      },
      {
        path: '/projects/:projectId',
        element: <ProjectGate />,
        children: [
          { index: true, element: <OverviewPage /> },
          { path: 'timeline', element: <TimelinePage /> },
          { path: 'features', element: <FeaturesPage /> },
          { path: 'team', element: <TeamPage /> },
          { path: 'status', element: <StatusPage /> },
          { path: 'edit', element: <EditPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
