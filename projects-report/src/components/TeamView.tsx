import type { Project } from '../data/projects'

type Props = {
  project: Project
}

function initials(name: string) {
  return name
    .split(/[\s/]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function TeamView({ project }: Props) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Equipe do projeto</h2>
      </div>
      <div className="team-grid">
        {project.team.map((member) => (
          <div key={member.name} className="team-card">
            <div className="team-avatar">{initials(member.name)}</div>
            <h3>{member.name}</h3>
            <p>{member.role}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
