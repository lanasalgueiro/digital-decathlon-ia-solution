import type { TaskStatus } from '../data/projects'

export const STATUS_LABELS: Record<TaskStatus, string> = {
  aguardando: 'Aguardando',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  bloqueado: 'Bloqueado',
}

export const STATUS_OPTIONS: TaskStatus[] = [
  'aguardando',
  'em_andamento',
  'concluido',
  'bloqueado',
]

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>
}
