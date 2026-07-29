import { Navigate, useParams } from 'react-router-dom'
import { useProjectsStore } from '../../hooks/useProjectsStore'
import { setTaskStatusInProject } from '../../lib/projectProgress'
import { GanttChart } from '../../components/GanttChart'

export function TimelinePage() {
  const { projectId } = useParams()
  const store = useProjectsStore()
  const project = store.getProject(projectId)

  if (!project) return <Navigate to="/projetos" replace />

  return (
    <GanttChart
      project={project}
      onSetTaskStatus={(phaseId, taskId, status) => {
        store.updateAndSave(project.id, (p) =>
          setTaskStatusInProject(p, phaseId, taskId, status),
        )
      }}
    />
  )
}
