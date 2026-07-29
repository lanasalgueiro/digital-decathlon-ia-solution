import { useNavigate } from 'react-router-dom'
import { useProjectsStore } from '../hooks/useProjectsStore'
import { ProjectSelector } from '../components/ProjectSelector'

export function PortfolioPage() {
  const store = useProjectsStore()
  const navigate = useNavigate()

  return (
    <ProjectSelector
      projects={store.projects}
      onSelect={(id) => navigate(`/projects/${id}`)}
    />
  )
}
