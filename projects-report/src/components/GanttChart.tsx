import type { Project, TaskStatus } from '../data/projects'
import { getCurrentWeek } from '../data/projects'
import { isOverdueTask } from '../lib/projectProgress'
import { STATUS_LABELS, STATUS_OPTIONS } from './StatusBadge'

type Props = {
  project: Project
  onSetTaskStatus: (phaseId: string, taskId: string, status: TaskStatus) => void
}

export function GanttChart({ project, onSetTaskStatus }: Props) {
  const { timeline, phases } = project
  const weeks: number[] = []
  for (let w = timeline.startWeek; w <= timeline.endWeek; w += 1) weeks.push(w)
  const currentWeek = getCurrentWeek()
  const overdueCount = phases.reduce(
    (acc, phase) =>
      acc + phase.tasks.filter((task) => isOverdueTask(task, currentWeek)).length,
    0,
  )

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Cronograma do projeto</h2>
        <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
          Semana atual: {currentWeek}
          {overdueCount > 0 ? ` · ${overdueCount} alerta(s)` : ''}
        </span>
      </div>

      {overdueCount > 0 && (
        <div className="gantt-alert-strip">
          Tarefas com fundo destacado passaram da semana fim e ainda não foram concluídas.
          Altere o <strong>status</strong> direto na coluna (salva local automaticamente).
        </div>
      )}

      <div className="gantt-wrap">
        <table className="gantt-table">
          <thead>
            <tr>
              <th rowSpan={2} className="col-fase">
                Fase
              </th>
              <th rowSpan={2} className="col-etapa">
                Responsável / Etapa
              </th>
              <th rowSpan={2} className="col-owner">
                Responsável
              </th>
              <th rowSpan={2} className="col-status">
                Status
              </th>
              <th rowSpan={2} className="col-detail">
                Detalhes
              </th>
              {timeline.months.map((month) => (
                <th key={month.name} colSpan={month.weeks.length} className="month-head">
                  {month.name}
                </th>
              ))}
            </tr>
            <tr>
              {weeks.map((week) => (
                <th
                  key={week}
                  className={`week-head${week <= currentWeek ? ' past' : ''}${week === currentWeek ? ' current' : ''}`}
                >
                  {week}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {phases.map((phase) =>
              phase.tasks.map((task, index) => {
                const overdue = isOverdueTask(task, currentWeek)
                const done = task.status === 'concluido'
                return (
                  <tr
                    key={task.id}
                    className={`task-row${overdue ? ' overdue-row' : ''}${done ? ' done-row' : ''}`}
                  >
                    {index === 0 && (
                      <td
                        className="phase-cell"
                        rowSpan={phase.tasks.length}
                        style={{ background: phase.color }}
                      >
                        {phase.number}
                      </td>
                    )}
                    {index === 0 ? (
                      <td className="col-etapa phase-title-cell" rowSpan={phase.tasks.length}>
                        <div>{phase.name}</div>
                        <div style={{ fontWeight: 500, color: 'var(--ink-soft)', marginTop: 4 }}>
                          {phase.lead}
                        </div>
                      </td>
                    ) : null}
                    <td className="col-owner">{task.owner}</td>
                    <td className="col-status">
                      <div className="status-cell">
                        {overdue && (
                          <span className="overdue-flag" title="Fora da semana">
                            !
                          </span>
                        )}
                        <select
                          className={`status-select status-select-${task.status}`}
                          value={task.status}
                          aria-label={`Status de ${task.title}`}
                          onChange={(e) =>
                            onSetTaskStatus(
                              phase.id,
                              task.id,
                              e.target.value as TaskStatus,
                            )
                          }
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="col-detail">{task.title}</td>
                    {weeks.map((week) => {
                      const active = week >= task.startWeek && week <= task.endWeek
                      const isStart = week === task.startWeek
                      const isEnd = week === task.endWeek
                      return (
                        <td
                          key={`${task.id}-${week}`}
                          className={`week-cell${week <= currentWeek ? ' past' : ''}`}
                        >
                          {active && (
                            <span
                              className={`bar${isStart ? ' start' : ''}${isEnd ? ' end' : ''}${done ? ' done' : ''}${overdue ? ' overdue' : ''}`}
                              style={{ background: overdue ? '#b33a2b' : phase.color }}
                              title={`${task.title} · S${task.startWeek}–S${task.endWeek}`}
                            />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              }),
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
