import { Navigate, useNavigate, useParams } from 'react-router-dom'
import type { ProjectStatus } from '../data/projects'
import { useProjectsStore } from '../hooks/useProjectsStore'
import { AtuacaoView } from '../components/AtuacaoView'

export function ProjectAtuacaoPage() {
  const { projectId } = useParams()
  const store = useProjectsStore()
  const navigate = useNavigate()
  const project = store.getProject(projectId)

  if (!project) {
    return <Navigate to="/projetos" replace />
  }

  if ((project.kind ?? 'core') !== 'atuacao') {
    return <Navigate to={`/projects/${project.id}`} replace />
  }

  return (
    <AtuacaoView
      project={project}
      onBack={() => navigate('/projetos')}
      onStatusChange={(status: ProjectStatus) => {
        store.updateAndSave(project.id, (p) => ({ ...p, status }))
      }}
    />
  )
}
