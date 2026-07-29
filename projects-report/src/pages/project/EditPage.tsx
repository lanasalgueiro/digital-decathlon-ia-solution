import { Navigate, useParams } from 'react-router-dom'
import { useProjectsStore } from '../../hooks/useProjectsStore'
import { EditProject } from '../../components/EditProject'

export function EditPage() {
  const { projectId } = useParams()
  const store = useProjectsStore()
  const project = store.getProject(projectId)

  if (!project) return <Navigate to="/projetos" replace />

  return (
    <EditProject
      project={project}
      dirty={store.dirty}
      savedAt={store.savedAt}
      onChange={(updater) => store.updateProject(project.id, updater)}
      onSave={store.saveAll}
      onReset={() => {
        if (
          window.confirm(
            'Restaurar este projeto para os dados padrão? A cópia local dele será substituída.',
          )
        ) {
          store.resetProject(project.id)
        }
      }}
    />
  )
}
