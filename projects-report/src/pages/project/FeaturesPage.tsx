import { Navigate, useParams } from 'react-router-dom'
import { useProjectsStore } from '../../hooks/useProjectsStore'
import { FeaturesView } from '../../components/FeaturesView'

export function FeaturesPage() {
  const { projectId } = useParams()
  const store = useProjectsStore()
  const project = store.getProject(projectId)

  if (!project) return <Navigate to="/projetos" replace />

  return (
    <FeaturesView
      project={project}
      onTogglePrototyped={(featureId, prototyped) => {
        store.updateProject(project.id, (p) => ({
          ...p,
          featurePhases: p.featurePhases.map((fp) => ({
            ...fp,
            features: fp.features.map((f) =>
              f.id === featureId ? { ...f, prototyped } : f,
            ),
          })),
        }))
      }}
    />
  )
}
