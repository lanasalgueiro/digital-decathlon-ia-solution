import type { Project, ProjectStatus } from '../data/projects'

type Props = {
  project: Project
  onStatusChange: (status: ProjectStatus) => void
  onBack: () => void
}

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'planejamento', label: 'Planejamento' },
  { value: 'concluido', label: 'Concluído' },
]

export function AtuacaoView({ project, onStatusChange, onBack }: Props) {
  return (
    <div className="atuacao-page">
      <button type="button" className="btn btn-ghost atuacao-back" onClick={onBack}>
        ← Todos os projetos
      </button>

      <article className="panel atuacao-card">
        <div className="atuacao-kicker">Participação & atuação</div>
        <h1>{project.title}</h1>
        <p className="atuacao-sub">{project.subtitle}</p>

        <label className="atuacao-status">
          Status
          <select
            className={`status-select status-select-project status-${project.status}`}
            value={project.status}
            onChange={(e) => onStatusChange(e.target.value as ProjectStatus)}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <div className="atuacao-desc">
          <h2>Descrição</h2>
          <p>{project.description}</p>
        </div>

        {project.team.length > 0 && (
          <div className="atuacao-team">
            <h2>Envolvidos</h2>
            <ul>
              {project.team.map((member) => (
                <li key={`${member.name}-${member.role}`}>
                  <strong>{member.name}</strong>
                  <span>{member.role}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </div>
  )
}
