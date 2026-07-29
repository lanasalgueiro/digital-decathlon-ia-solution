import { Navigate, useParams } from 'react-router-dom'
import { useProjectsStore } from '../../hooks/useProjectsStore'
import { StatusReportView } from '../../components/StatusReportView'

export function StatusPage() {
  const { projectId } = useParams()
  const store = useProjectsStore()
  const project = store.getProject(projectId)

  if (!project) return <Navigate to="/projetos" replace />

  return (
    <StatusReportView projects={store.projects} focusProjectId={project.id} />
  )
}
