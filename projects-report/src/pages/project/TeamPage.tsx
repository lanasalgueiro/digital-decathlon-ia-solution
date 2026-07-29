import { Navigate, useParams } from 'react-router-dom'
import { useProjectsStore } from '../../hooks/useProjectsStore'
import { TeamView } from '../../components/TeamView'

export function TeamPage() {
  const { projectId } = useParams()
  const store = useProjectsStore()
  const project = store.getProject(projectId)

  if (!project) return <Navigate to="/projetos" replace />

  return <TeamView project={project} />
}
