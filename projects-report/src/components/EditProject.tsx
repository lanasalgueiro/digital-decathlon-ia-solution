import type {
  FeatureEstimate,
  Phase,
  Project,
  ProjectStatus,
  Task,
  TaskStatus,
} from '../data/projects'

type Props = {
  project: Project
  dirty: boolean
  savedAt: string | null
  onChange: (updater: (project: Project) => Project) => void
  onSave: () => void
  onReset: () => void
}

const statuses: TaskStatus[] = ['aguardando', 'em_andamento', 'concluido', 'bloqueado']
const projectStatuses: ProjectStatus[] = ['ativo', 'planejamento', 'concluido']

const statusLabels: Record<TaskStatus, string> = {
  aguardando: 'Aguardando',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  bloqueado: 'Bloqueado',
}

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

export function EditProject({
  project,
  dirty,
  savedAt,
  onChange,
  onSave,
  onReset,
}: Props) {
  const patch = (partial: Partial<Project>) => {
    onChange((p) => ({ ...p, ...partial }))
  }

  const updatePhase = (phaseId: string, updater: (phase: Phase) => Phase) => {
    onChange((p) => ({
      ...p,
      phases: p.phases.map((phase) => (phase.id === phaseId ? updater(phase) : phase)),
    }))
  }

  const updateTask = (
    phaseId: string,
    taskId: string,
    updater: (task: Task) => Task,
  ) => {
    updatePhase(phaseId, (phase) => ({
      ...phase,
      tasks: phase.tasks.map((task) => (task.id === taskId ? updater(task) : task)),
    }))
  }

  const updateFeature = (
    phaseId: string,
    featureId: string,
    updater: (feature: FeatureEstimate) => FeatureEstimate,
  ) => {
    onChange((p) => ({
      ...p,
      featurePhases: p.featurePhases.map((fp) =>
        fp.id !== phaseId
          ? fp
          : {
              ...fp,
              features: fp.features.map((f) =>
                f.id === featureId ? updater(f) : f,
              ),
            },
      ),
    }))
  }

  const addTask = (phaseId: string) => {
    updatePhase(phaseId, (phase) => ({
      ...phase,
      tasks: [
        ...phase.tasks,
        {
          id: uid('task'),
          title: 'Nova tarefa',
          owner: phase.lead || 'A definir',
          status: 'aguardando',
          startWeek: project.timeline.startWeek,
          endWeek: Math.min(project.timeline.startWeek + 1, project.timeline.endWeek),
        },
      ],
    }))
  }

  const removeTask = (phaseId: string, taskId: string) => {
    updatePhase(phaseId, (phase) => ({
      ...phase,
      tasks: phase.tasks.filter((t) => t.id !== taskId),
    }))
  }

  const addTeamMember = () => {
    onChange((p) => ({
      ...p,
      team: [...p.team, { name: 'Novo membro', role: 'Função' }],
    }))
  }

  const updateTeam = (index: number, field: 'name' | 'role', value: string) => {
    onChange((p) => ({
      ...p,
      team: p.team.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }))
  }

  const removeTeam = (index: number) => {
    onChange((p) => ({
      ...p,
      team: p.team.filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="edit-module">
      <div className="edit-toolbar panel">
        <div>
          <h2>Módulo de edição</h2>
          <p>
            Altere datas, responsáveis, status e demais campos. As mudanças ficam no
            navegador ao salvar.
          </p>
        </div>
        <div className="edit-actions">
          {dirty ? (
            <span className="save-hint dirty">Alterações não salvas</span>
          ) : savedAt ? (
            <span className="save-hint">Salvo em {savedAt}</span>
          ) : (
            <span className="save-hint">Sem cópia local ainda</span>
          )}
          <button type="button" className="btn btn-ghost" onClick={onReset}>
            Restaurar padrão
          </button>
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={!dirty}>
            Salvar local
          </button>
        </div>
      </div>

      <section className="panel edit-section">
        <div className="panel-head">
          <h2>Dados do projeto</h2>
        </div>
        <div className="edit-grid">
          <label>
            Título
            <input
              value={project.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </label>
          <label>
            Subtítulo
            <input
              value={project.subtitle}
              onChange={(e) => patch({ subtitle: e.target.value })}
            />
          </label>
          <label>
            Status
            <select
              value={project.status}
              onChange={(e) => patch({ status: e.target.value as ProjectStatus })}
            >
              {projectStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data início
            <input
              value={project.startDate}
              onChange={(e) => patch({ startDate: e.target.value })}
              placeholder="15/06"
            />
          </label>
          <label>
            Data fim
            <input
              value={project.endDate ?? ''}
              onChange={(e) =>
                patch({ endDate: e.target.value.trim() ? e.target.value : null })
              }
              placeholder="—"
            />
          </label>
          <label>
            Cor destaque
            <input
              type="color"
              value={project.accent}
              onChange={(e) => patch({ accent: e.target.value })}
            />
          </label>
          <label className="span-2">
            Descrição
            <textarea
              rows={3}
              value={project.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="panel edit-section">
        <div className="panel-head">
          <h2>Fases, responsáveis e cronograma</h2>
        </div>
        <div className="edit-phases">
          {project.phases.map((phase) => (
            <div key={phase.id} className="edit-phase">
              <div className="edit-phase-head" style={{ borderColor: phase.color }}>
                <div className="edit-grid compact">
                  <label>
                    Nº
                    <input
                      type="number"
                      value={phase.number}
                      onChange={(e) =>
                        updatePhase(phase.id, (ph) => ({
                          ...ph,
                          number: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </label>
                  <label className="span-2">
                    Nome da fase
                    <input
                      value={phase.name}
                      onChange={(e) =>
                        updatePhase(phase.id, (ph) => ({ ...ph, name: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Lead / responsável etapa
                    <input
                      value={phase.lead}
                      onChange={(e) =>
                        updatePhase(phase.id, (ph) => ({ ...ph, lead: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Cor
                    <input
                      type="color"
                      value={phase.color}
                      onChange={(e) =>
                        updatePhase(phase.id, (ph) => ({ ...ph, color: e.target.value }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="edit-tasks">
                {phase.tasks.map((task) => (
                  <div key={task.id} className="edit-task-row">
                    <label>
                      Detalhe / tarefa
                      <input
                        value={task.title}
                        onChange={(e) =>
                          updateTask(phase.id, task.id, (t) => ({
                            ...t,
                            title: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Responsável
                      <input
                        value={task.owner}
                        onChange={(e) =>
                          updateTask(phase.id, task.id, (t) => ({
                            ...t,
                            owner: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Status
                      <select
                        value={task.status}
                        onChange={(e) =>
                          updateTask(phase.id, task.id, (t) => ({
                            ...t,
                            status: e.target.value as TaskStatus,
                          }))
                        }
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {statusLabels[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Semana início
                      <input
                        type="number"
                        value={task.startWeek}
                        min={project.timeline.startWeek}
                        max={project.timeline.endWeek}
                        onChange={(e) =>
                          updateTask(phase.id, task.id, (t) => {
                            const startWeek = Number(e.target.value) || t.startWeek
                            return {
                              ...t,
                              startWeek,
                              endWeek: Math.max(startWeek, t.endWeek),
                            }
                          })
                        }
                      />
                    </label>
                    <label>
                      Semana fim
                      <input
                        type="number"
                        value={task.endWeek}
                        min={project.timeline.startWeek}
                        max={project.timeline.endWeek}
                        onChange={(e) =>
                          updateTask(phase.id, task.id, (t) => {
                            const endWeek = Number(e.target.value) || t.endWeek
                            return {
                              ...t,
                              endWeek,
                              startWeek: Math.min(t.startWeek, endWeek),
                            }
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-danger-ghost"
                      onClick={() => removeTask(phase.id, task.id)}
                      disabled={phase.tasks.length <= 1}
                      title="Remover tarefa"
                    >
                      Remover
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => addTask(phase.id)}
                >
                  + Adicionar tarefa
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel edit-section">
        <div className="panel-head">
          <h2>Features & tempos</h2>
        </div>
        <div className="edit-features">
          {project.featurePhases.map((fp) => (
            <div key={fp.id} className="edit-feature-phase">
              <h3>{fp.name}</h3>
              {fp.features.map((feature) => (
                <div key={feature.id} className="edit-task-row feature-row">
                  <label className="span-grow">
                    Feature
                    <input
                      value={feature.name}
                      onChange={(e) =>
                        updateFeature(fp.id, feature.id, (f) => ({
                          ...f,
                          name: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="check-label">
                    Prototipado
                    <input
                      type="checkbox"
                      checked={feature.prototyped}
                      onChange={(e) =>
                        updateFeature(fp.id, feature.id, (f) => ({
                          ...f,
                          prototyped: e.target.checked,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Tempo Dev IA
                    <input
                      value={feature.timeWithAi}
                      onChange={(e) =>
                        updateFeature(fp.id, feature.id, (f) => ({
                          ...f,
                          timeWithAi: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Tempo Sem IA
                    <input
                      value={feature.timeWithoutAi}
                      onChange={(e) =>
                        updateFeature(fp.id, feature.id, (f) => ({
                          ...f,
                          timeWithoutAi: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="panel edit-section">
        <div className="panel-head">
          <h2>Equipe</h2>
          <button type="button" className="btn btn-ghost" onClick={addTeamMember}>
            + Pessoa
          </button>
        </div>
        <div className="edit-team">
          {project.team.map((member, index) => (
            <div key={`${member.name}-${index}`} className="edit-task-row team-row">
              <label>
                Nome
                <input
                  value={member.name}
                  onChange={(e) => updateTeam(index, 'name', e.target.value)}
                />
              </label>
              <label>
                Função
                <input
                  value={member.role}
                  onChange={(e) => updateTeam(index, 'role', e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn btn-danger-ghost"
                onClick={() => removeTeam(index)}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
