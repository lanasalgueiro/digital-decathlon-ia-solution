import type { Phase, Project, Task, TaskStatus } from '../data/projects'
import { getCurrentWeek } from '../data/projects'

export type TaskRef = {
  phase: Phase
  task: Task
}

export function listTaskRefs(project: Project): TaskRef[] {
  return project.phases.flatMap((phase) =>
    phase.tasks.map((task) => ({ phase, task })),
  )
}

/** Tarefa cuja janela já passou e ainda não está concluída. */
export function isOverdueTask(task: Task, week = getCurrentWeek()): boolean {
  return task.status !== 'concluido' && task.endWeek < week
}

export function getOverdueTasks(project: Project, week = getCurrentWeek()): TaskRef[] {
  return listTaskRefs(project).filter(({ task }) => isOverdueTask(task, week))
}

/** Tarefas da semana atual ainda não concluídas (o que estamos fazendo). */
export function getCurrentWork(project: Project, week = getCurrentWeek()): TaskRef[] {
  return listTaskRefs(project).filter(
    ({ task }) =>
      task.status !== 'concluido' &&
      week >= task.startWeek &&
      week <= task.endWeek,
  )
}

export function getCompletedTasks(project: Project): TaskRef[] {
  return listTaskRefs(project).filter(({ task }) => task.status === 'concluido')
}

/** Já concluídas cuja janela já passou. */
export function getCompletedPastDue(
  project: Project,
  week = getCurrentWeek(),
): TaskRef[] {
  return listTaskRefs(project).filter(
    ({ task }) => task.status === 'concluido' && task.endWeek < week,
  )
}

export function getBlockedTasks(project: Project): Task[] {
  return project.phases.flatMap((phase) =>
    phase.tasks.filter((task) => task.status === 'bloqueado'),
  )
}

export function getNextWeekTasks(project: Project, week = getCurrentWeek()): Task[] {
  const next = week + 1
  return project.phases.flatMap((phase) =>
    phase.tasks.filter(
      (task) =>
        task.status !== 'concluido' &&
        task.startWeek <= next &&
        task.endWeek >= next,
    ),
  )
}

export function formatTaskAlert(ref: TaskRef): string {
  const { phase, task } = ref
  return `Fase ${phase.number} — ${phase.name}: ${task.title} (resp. ${task.owner}, S${task.startWeek}–S${task.endWeek})`
}

export function setTaskStatusInProject(
  project: Project,
  phaseId: string,
  taskId: string,
  status: TaskStatus,
): Project {
  return {
    ...project,
    phases: project.phases.map((phase) =>
      phase.id !== phaseId
        ? phase
        : {
            ...phase,
            tasks: phase.tasks.map((task) =>
              task.id === taskId ? { ...task, status } : task,
            ),
          },
    ),
  }
}

export function phaseProgress(phase: Phase): { done: number; total: number } {
  const total = phase.tasks.length
  const done = phase.tasks.filter((t) => t.status === 'concluido').length
  return { done, total }
}

export function isPhaseComplete(phase: Phase): boolean {
  return phase.tasks.length > 0 && phase.tasks.every((t) => t.status === 'concluido')
}

/** Todas as tarefas do projeto concluídas (100%). */
export function isProjectFullyComplete(project: Project): boolean {
  const tasks = listTaskRefs(project)
  return tasks.length > 0 && tasks.every(({ task }) => task.status === 'concluido')
}

export function getProjectProgressSummary(project: Project, week = getCurrentWeek()) {
  const tasks = listTaskRefs(project)
  const completed = tasks.filter(({ task }) => task.status === 'concluido').length
  const currentWork = getCurrentWork(project, week).length
  const overdue = getOverdueTasks(project, week).length
  const total = tasks.length
  return {
    total,
    completed,
    currentWork,
    overdue,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    fullyComplete: isProjectFullyComplete(project),
  }
}

function phaseWindow(phase: Phase): { start: number; end: number } {
  const starts = phase.tasks.map((t) => t.startWeek)
  const ends = phase.tasks.map((t) => t.endWeek)
  return {
    start: Math.min(...starts),
    end: Math.max(...ends),
  }
}

export function getCurrentPhase(project: Project, week = getCurrentWeek()): Phase | null {
  const active = project.phases
    .map((phase) => ({ phase, ...phaseWindow(phase) }))
    .filter(({ start, end }) => week >= start && week <= end)
    .sort((a, b) => b.phase.number - a.phase.number)

  if (active[0]) return active[0].phase

  const upcoming = project.phases
    .map((phase) => ({ phase, ...phaseWindow(phase) }))
    .filter(({ start }) => start > week)
    .sort((a, b) => a.start - b.start)

  return upcoming[0]?.phase ?? project.phases[project.phases.length - 1] ?? null
}
