import { useMemo } from 'react'
import type { Project, ProjectStatus } from '../data/projects'
import { getCurrentWeek } from '../data/projects'
import {
  getCurrentPhase,
  getProjectProgressSummary,
} from '../lib/projectProgress'

type Props = {
  projects: Project[]
  onSelect: (id: string) => void
}

const statusLabel: Record<ProjectStatus, string> = {
  ativo: 'Ativo',
  planejamento: 'Planejamento',
  concluido: 'Concluído',
}

export function ProjectSelector({ projects, onSelect }: Props) {
  const week = getCurrentWeek()

  const coreCount = useMemo(
    () => projects.filter((p) => (p.kind ?? 'core') === 'core').length,
    [projects],
  )
  const atuacaoCount = useMemo(
    () => projects.filter((p) => p.kind === 'atuacao').length,
    [projects],
  )

  const portfolio = useMemo(() => {
    return projects.map((project) => {
      const progress = getProjectProgressSummary(project, week)
      const phase = getCurrentPhase(project, week)
      return { project, progress, phase }
    })
  }, [projects, week])

  const totals = useMemo(() => {
    return portfolio.reduce(
      (acc, row) => {
        acc.completed += row.progress.completed
        acc.currentWork += row.progress.currentWork
        acc.overdue += row.progress.overdue
        if (row.progress.fullyComplete || row.project.status === 'concluido') {
          acc.doneProjects += 1
        }
        return acc
      },
      { completed: 0, currentWork: 0, overdue: 0, doneProjects: 0 },
    )
  }, [portfolio])

  return (
    <div className="selector-page">
      <header className="selector-hero">
        <p className="selector-kicker">Projetos</p>
        <h1>Overview de projetos</h1>
        <p className="selector-lead">
          Status principais de todos os projetos. Clique em uma linha para abrir.
        </p>
      </header>

      <section className="portfolio-overview panel">
        <div className="panel-head">
          <h2>Overview geral</h2>
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
            Semana {week}
          </span>
        </div>

        <div className="stats-grid portfolio-stats">
          <div className="stat-card">
            <div className="label">Projetos</div>
            <div className="value">{projects.length}</div>
            <div className="hint">
              {coreCount} principais · {atuacaoCount} atuação
            </div>
          </div>
          <div className="stat-card">
            <div className="label">Em curso</div>
            <div className="value">{totals.currentWork}</div>
            <div className="hint">tarefas na semana</div>
          </div>
          <div className="stat-card">
            <div className="label">Concluídas</div>
            <div className="value">{totals.completed}</div>
            <div className="hint">tarefas no total</div>
          </div>
          <div className="stat-card">
            <div className="label">Alertas</div>
            <div
              className="value"
              style={{ color: totals.overdue ? 'var(--danger)' : undefined }}
            >
              {totals.overdue}
            </div>
            <div className="hint">fora da semana</div>
          </div>
        </div>

        <div className="portfolio-table-wrap">
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Projeto</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Fase atual</th>
                <th>Progresso</th>
                <th>Em curso</th>
                <th>Atrasos</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map(({ project, progress, phase }) => (
                <tr
                  key={project.id}
                  className="portfolio-row"
                  onClick={() => onSelect(project.id)}
                >
                  <td>
                    <strong>{project.title}</strong>
                    <span className="portfolio-sub">{project.subtitle}</span>
                  </td>
                  <td>
                    <span className={`kind-pill kind-${project.kind ?? 'core'}`}>
                      {(project.kind ?? 'core') === 'core' ? 'Principal' : 'Atuação'}
                    </span>
                  </td>
                  <td>
                    <span className={`project-status status-${project.status}`}>
                      {progress.fullyComplete
                        ? 'Concluído'
                        : statusLabel[project.status]}
                    </span>
                  </td>
                  <td>
                    {progress.fullyComplete
                      ? '—'
                      : phase
                        ? `${phase.number}. ${phase.name}`
                        : '—'}
                  </td>
                  <td>
                    {(project.kind ?? 'core') === 'atuacao' ? (
                      '—'
                    ) : (
                      <div className="progress-cell">
                        <div className="progress-bar">
                          <span
                            style={{
                              width: `${progress.percent}%`,
                              background: project.accent,
                            }}
                          />
                        </div>
                        <span>
                          {progress.completed}/{progress.total} · {progress.percent}%
                        </span>
                      </div>
                    )}
                  </td>
                  <td>{progress.fullyComplete ? '—' : progress.currentWork}</td>
                  <td className={progress.overdue > 0 ? 'overdue-count' : ''}>
                    {progress.fullyComplete ? '—' : progress.overdue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
