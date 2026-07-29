import type { Project } from '../data/projects'
import { getCurrentWeek } from '../data/projects'
import {
  getCompletedPastDue,
  getCompletedTasks,
  getCurrentPhase,
  getCurrentWork,
  getNextWeekTasks,
  getOverdueTasks,
  isProjectFullyComplete,
  type TaskRef,
} from './projectProgress'

export type WeeklyNotes = {
  updates: string
  risks: string
  impediments: string
  nextSteps: string
}

export type StatusReportInput = {
  projects: Project[]
  notes?: WeeklyNotes
  scheduleLink: string
  reportDate?: Date
  /** Se definido, destaca este projeto no topo (ainda lista todos). */
  focusProjectId?: string
}

export type StatusReport = {
  title: string
  wednesdayLabel: string
  week: number
  overdueAlerts: string[]
  markdown: string
  slackText: string
}

const projectStatusLabel: Record<Project['status'], string> = {
  ativo: 'Ativo',
  planejamento: 'Planejamento',
  concluido: 'Concluído',
}

function getWednesdayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day <= 3 ? 3 - day : 3 - day + 7
  d.setDate(d.getDate() + diff)
  d.setHours(12, 0, 0, 0)
  return d
}

export function formatPtDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n|,|;/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(Boolean)
}

function formatTaskLine(ref: TaskRef): string {
  const { phase, task } = ref
  return `• ${task.title} — Fase ${phase.number} · ${task.owner} · S${task.startWeek}–S${task.endWeek}`
}

function formatCompletedLine(ref: TaskRef): string {
  const { phase, task } = ref
  return `• ${task.title} — Fase ${phase.number} · ${task.owner} · S${task.endWeek}`
}

function formatOverdueLine(ref: TaskRef): string {
  const { phase, task } = ref
  return `• ${task.title} — Fase ${phase.number} · ${task.owner} · passou S${task.endWeek}`
}

function bulletBlock(title: string, lines: string[], emptyLabel: string): string[] {
  return [title, ...(lines.length > 0 ? lines : [`• ${emptyLabel}`]), '']
}

function composeProjectBlock(project: Project, week: number): string[] {
  if (isProjectFullyComplete(project) || project.status === 'concluido') {
    const lines = [`✅ *Projeto ${project.title} — Concluído*`]
    if (project.endDate) lines.push(`Fim: ${project.endDate}`)
    lines.push('—', '')
    return lines
  }

  // Atuação: só descrição + status (sem cronograma interno)
  if (project.kind === 'atuacao') {
    const lines = [
      `*📎 ${project.title}*  ·  Atuação · ${projectStatusLabel[project.status]}`,
      project.description,
    ]
    if (project.team.length) {
      lines.push(`Envolvidos: ${project.team.map((m) => m.name).join(' · ')}`)
    }
    lines.push('—', '')
    return lines
  }

  const currentPhase = getCurrentPhase(project, week)
  const currentWork = getCurrentWork(project, week)
  const overdue = getOverdueTasks(project, week)
  const completed = getCompletedTasks(project)
  const completedPast = getCompletedPastDue(project, week)
  const doneList = completedPast.length > 0 ? completedPast : completed
  const next = getNextWeekTasks(project, week)

  const phaseLine = currentPhase
    ? `Fase atual: ${currentPhase.number} — ${currentPhase.name} (lead: ${currentPhase.lead})`
    : 'Fase atual: —'

  const lines: string[] = [
    `*📌 ${project.title}*  ·  ${projectStatusLabel[project.status]}`,
    `${phaseLine}`,
    `Início: ${project.startDate}${project.endDate ? ` · Fim: ${project.endDate}` : ''}`,
  ]

  if (project.demoUrl) {
    lines.push(`Demo: ${project.demoUrl}`)
  }

  lines.push('')
  lines.push(
    ...bulletBlock(
      '✅ *Já concluído*',
      doneList.map(formatCompletedLine),
      'Nenhuma tarefa concluída ainda',
    ),
  )
  lines.push(
    ...bulletBlock(
      '🔵 *O que estamos fazendo*',
      currentWork.map(formatTaskLine),
      'Nada em curso nesta semana',
    ),
  )
  lines.push(
    ...bulletBlock(
      '⚠️ *Deveria estar concluído*',
      overdue.map(formatOverdueLine),
      'Nada atrasado — ótimo',
    ),
  )

  if (next.length > 0) {
    lines.push(
      ...bulletBlock(
        '➡️ *Próxima semana*',
        next.map((t) => `• ${t.title} (${t.owner}) — S${t.startWeek}–S${t.endWeek}`),
        '',
      ),
    )
  }

  lines.push('—')
  lines.push('')
  return lines
}

function composeNotesBlock(notes: WeeklyNotes): string[] {
  const updates = normalizeLines(notes.updates)
  const risks = normalizeLines(notes.risks)
  const impediments = normalizeLines(notes.impediments)
  const nextSteps = normalizeLines(notes.nextSteps)

  if (
    updates.length === 0 &&
    risks.length === 0 &&
    impediments.length === 0 &&
    nextSteps.length === 0
  ) {
    return []
  }

  const block: string[] = ['*📝 Notas da semana*', '']
  if (updates.length) {
    block.push('*Atualizações*', ...updates.map((l) => `• ${l}`), '')
  }
  if (risks.length) {
    block.push('*Atenção / risco*', ...risks.map((l) => `• ${l}`), '')
  }
  if (impediments.length) {
    block.push('*Impedimentos*', ...impediments.map((l) => `• ${l}`), '')
  }
  if (nextSteps.length) {
    block.push('*Próximos passos*', ...nextSteps.map((l) => `• ${l}`), '')
  }
  return block
}

export function composeStatusReport(input: StatusReportInput): StatusReport {
  const date = input.reportDate ?? new Date()
  const wednesday = getWednesdayOfWeek(date)
  const wednesdayLabel = formatPtDate(wednesday)
  const week = getCurrentWeek(date)

  const ordered = [...input.projects].sort((a, b) => {
    if (input.focusProjectId) {
      if (a.id === input.focusProjectId) return -1
      if (b.id === input.focusProjectId) return 1
    }
    const order = { ativo: 0, planejamento: 1, concluido: 2 }
    return order[a.status] - order[b.status]
  })

  const overdueAlerts = ordered.flatMap((project) =>
    getOverdueTasks(project, week).map(
      (ref) => `${project.title}: ${formatOverdueLine(ref).replace(/^• /, '')}`,
    ),
  )

  const title = `💡 Status Semanal de Projetos | ${wednesdayLabel}`

  const summaryLines = [
    `*${title}*`,
    `Semana ISO: *${week}* · ${ordered.length} projeto(s)`,
    `Cronograma: ${input.scheduleLink}`,
    '',
  ]

  if (overdueAlerts.length > 0) {
    summaryLines.push(
      `⚠️ *Resumo de atrasos (${overdueAlerts.length})*`,
      ...overdueAlerts.map((a) => `• ${a}`),
      '',
    )
  } else {
    summaryLines.push('✅ *Nenhum atraso de cronograma entre os projetos.*', '')
  }

  const projectBlocks = ordered.flatMap((project) =>
    composeProjectBlock(project, week),
  )

  const notesBlock = input.notes ? composeNotesBlock(input.notes) : []

  const markdown = [...summaryLines, ...projectBlocks, ...notesBlock]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return {
    title,
    wednesdayLabel,
    week,
    overdueAlerts,
    markdown,
    slackText: markdown,
  }
}

export const emptyNotes = (): WeeklyNotes => ({
  updates: '',
  risks: '',
  impediments: '',
  nextSteps: '',
})

export { getCurrentPhase, getOverdueTasks }
