import { useMemo } from 'react'
import type { Project } from '../data/projects'
import { getCurrentWeek } from '../data/projects'
import {
  getCompletedPastDue,
  getCompletedTasks,
  getCurrentWork,
  getOverdueTasks,
  isPhaseComplete,
  phaseProgress,
} from '../lib/projectProgress'
import { StatusBadge } from './StatusBadge'

type Props = {
  project: Project
  onGoTimeline?: () => void
}

export function Overview({ project, onGoTimeline }: Props) {
  const week = getCurrentWeek()
  const currentWork = useMemo(() => getCurrentWork(project, week), [project, week])
  const overdue = useMemo(() => getOverdueTasks(project, week), [project, week])
  const completed = useMemo(() => getCompletedTasks(project), [project])
  const completedPast = useMemo(() => getCompletedPastDue(project, week), [project, week])

  const taskCount = project.phases.reduce((acc, p) => acc + p.tasks.length, 0)
  const featureCount = project.featurePhases.reduce((acc, p) => acc + p.features.length, 0)

  return (
    <>
      {overdue.length > 0 && (
        <div className="alert-banner" role="alert">
          <div>
            <strong>Atenção — {overdue.length} tarefa(s) fora da semana sem conclusão</strong>
            <p>
              Itens com prazo (semana fim) anterior à semana {week} e ainda não concluídos.
              Esses alertas entram automaticamente no status do Slack.
            </p>
            <ul className="alert-list">
              {overdue.map(({ phase, task }) => (
                <li key={task.id}>
                  <span className="alert-phase" style={{ background: phase.color }}>
                    F{phase.number}
                  </span>
                  <span>
                    <strong>{task.title}</strong> · {task.owner} · S{task.startWeek}–S
                    {task.endWeek}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {onGoTimeline && (
            <button type="button" className="btn btn-primary" onClick={onGoTimeline}>
              Concluir no cronograma
            </button>
          )}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Fases</div>
          <div className="value">{project.phases.length}</div>
          <div className="hint">no cronograma</div>
        </div>
        <div className="stat-card">
          <div className="label">Tarefas</div>
          <div className="value">{taskCount}</div>
          <div className="hint">{completed.length} concluídas</div>
        </div>
        <div className="stat-card">
          <div className="label">Em curso</div>
          <div className="value">{currentWork.length}</div>
          <div className="hint">semana {week}</div>
        </div>
        <div className="stat-card">
          <div className="label">Alertas</div>
          <div className="value" style={{ color: overdue.length ? 'var(--danger)' : undefined }}>
            {overdue.length}
          </div>
          <div className="hint">fora da semana</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Andamento das tarefas</h2>
        </div>
        <div className="split-panels">
          <div>
            <h3 className="subhead ok">Já concluído</h3>
            {completedPast.length === 0 && completed.length === 0 ? (
              <p className="empty-hint">Nenhuma tarefa concluída ainda.</p>
            ) : (
              <ul className="work-list compact">
                {(completedPast.length ? completedPast : completed).map(({ phase, task }) => (
                  <li key={task.id}>
                    <span className="work-dot" style={{ background: phase.color }} />
                    <div>
                      <strong>{task.title}</strong>
                      <p>
                        Fase {phase.number} · {task.owner} · S{task.endWeek}
                      </p>
                    </div>
                    <StatusBadge status="concluido" />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="subhead now">O que estamos fazendo</h3>
            {currentWork.length === 0 ? (
              <p className="empty-hint">Nada em curso nesta semana.</p>
            ) : (
              <ul className="work-list compact">
                {currentWork.map(({ phase, task }) => (
                  <li key={task.id}>
                    <span className="work-dot" style={{ background: phase.color }} />
                    <div>
                      <strong>{task.title}</strong>
                      <p>
                        Fase {phase.number} · {task.owner} · S{task.startWeek}–S
                        {task.endWeek}
                      </p>
                    </div>
                    <StatusBadge status={task.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="subhead warn">Deveria estar concluído</h3>
            {overdue.length === 0 ? (
              <p className="empty-hint">Nada atrasado — ótimo.</p>
            ) : (
              <ul className="work-list compact">
                {overdue.map(({ phase, task }) => (
                  <li key={task.id} className="overdue-item">
                    <span className="work-dot" style={{ background: phase.color }} />
                    <div>
                      <strong>{task.title}</strong>
                      <p>
                        Fase {phase.number} · {task.owner} · passou S{task.endWeek}
                      </p>
                    </div>
                    <StatusBadge status={task.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Sobre o projeto</h2>
        </div>
        <div style={{ padding: '1rem 1.1rem' }}>
          <p style={{ margin: 0, lineHeight: 1.55, color: 'var(--ink-soft)' }}>
            {project.description}
          </p>
          {project.demoUrl && (
            <p style={{ margin: '0.85rem 0 0' }}>
              <a
                className="demo-link"
                href={project.demoUrl}
                target="_blank"
                rel="noreferrer"
              >
                Abrir experiência / totem →
              </a>
              <span className="demo-url">{project.demoUrl}</span>
            </p>
          )}
          <p style={{ margin: '0.75rem 0 0', color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
            {featureCount} features mapeadas · {project.team.length} pessoas na equipe
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Fases</h2>
        </div>
        <div className="phase-list">
          {project.phases.map((phase) => {
            const { done, total } = phaseProgress(phase)
            const complete = isPhaseComplete(phase)
            return (
              <div key={phase.id} className="phase-card">
                <div className="phase-num" style={{ background: phase.color }}>
                  {phase.number}
                </div>
                <div>
                  <h3>{phase.name}</h3>
                  <p>
                    Lead: {phase.lead} · {done}/{total} tarefas · S
                    {Math.min(...phase.tasks.map((t) => t.startWeek))}–S
                    {Math.max(...phase.tasks.map((t) => t.endWeek))}
                  </p>
                </div>
                <StatusBadge status={complete ? 'concluido' : phase.tasks[0]?.status ?? 'aguardando'} />
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
