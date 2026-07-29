import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useProjectsStore } from '../../hooks/useProjectsStore'
import { Overview } from '../../components/Overview'

export function OverviewPage() {
  const { projectId } = useParams()
  const store = useProjectsStore()
  const navigate = useNavigate()
  const project = store.getProject(projectId)

  if (!project) return <Navigate to="/projetos" replace />

  return (
    <Overview
      project={project}
      onGoTimeline={() => navigate(`/projects/${project.id}/timeline`)}
    />
  )
}
