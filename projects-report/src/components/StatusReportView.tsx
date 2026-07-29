import { useEffect, useMemo, useState } from 'react'
import type { Project } from '../data/projects'
import {
  composeStatusReport,
  emptyNotes,
  type WeeklyNotes,
} from '../lib/statusReport'

type Props = {
  projects: Project[]
  focusProjectId?: string
}

const NOTES_KEY = 'projects-report:status-notes:portfolio'

function loadNotes(): WeeklyNotes {
  try {
    const raw = localStorage.getItem(NOTES_KEY)
    if (!raw) return emptyNotes()
    return { ...emptyNotes(), ...(JSON.parse(raw) as WeeklyNotes) }
  } catch {
    return emptyNotes()
  }
}

function defaultScheduleLink(): string {
  return (
    import.meta.env.VITE_SCHEDULE_LINK ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    '[Link desse repo]'
  )
}

export function StatusReportView({ projects, focusProjectId }: Props) {
  const [notes, setNotes] = useState<WeeklyNotes>(() => loadNotes())
  const [scheduleLink, setScheduleLink] = useState(defaultScheduleLink)
  const [slackConfigured, setSlackConfigured] = useState<boolean | null>(null)
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
  }, [notes])

  useEffect(() => {
    fetch('/api/slack/status')
      .then((r) => r.json())
      .then((data: { configured?: boolean }) => setSlackConfigured(Boolean(data.configured)))
      .catch(() => setSlackConfigured(false))
  }, [])

  const report = useMemo(
    () =>
      composeStatusReport({
        projects,
        notes,
        scheduleLink,
        focusProjectId,
      }),
    [projects, notes, scheduleLink, focusProjectId],
  )

  const patchNotes = (field: keyof WeeklyNotes, value: string) => {
    setNotes((prev) => ({ ...prev, [field]: value }))
  }

  const sendToSlack = async () => {
    setSending(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/slack/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: report.slackText }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Falha ao enviar para o Slack')
      }
      setFeedback('Status enviado para o Slack.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erro ao enviar')
    } finally {
      setSending(false)
    }
  }

  const copyReport = async () => {
    await navigator.clipboard.writeText(report.markdown)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="status-module">
      <div className="edit-toolbar panel">
        <div>
          <h2>Status semanal → Slack</h2>
          <p>
            Mesmo recorte da visão geral (já concluído · em andamento · atrasos),
            quebrado por projeto. Notas opcionais entram no final.
          </p>
        </div>
        <div className="edit-actions">
          <button type="button" className="btn btn-ghost" onClick={copyReport}>
            {copied ? 'Copiado' : 'Copiar texto'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={sendToSlack}
            disabled={sending}
          >
            {sending ? 'Enviando…' : 'Disparar no Slack'}
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`status-feedback${feedback.includes('enviado') ? ' ok' : ' err'}`}>
          {feedback}
        </div>
      )}

      {report.overdueAlerts.length > 0 && (
        <div className="alert-banner" role="alert">
          <div>
            <strong>
              {report.overdueAlerts.length} alerta(s) no resumo do Slack
            </strong>
            <ul className="alert-list">
              {report.overdueAlerts.map((alert) => (
                <li key={alert}>{alert}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <div className="stat-card">
          <div className="label">Quarta do relatório</div>
          <div className="value" style={{ fontSize: '1.2rem' }}>
            {report.wednesdayLabel}
          </div>
          <div className="hint">semana {report.week}</div>
        </div>
        <div className="stat-card">
          <div className="label">Projetos</div>
          <div className="value">{projects.length}</div>
          <div className="hint">no status</div>
        </div>
        <div className="stat-card">
          <div className="label">Alertas</div>
          <div
            className="value"
            style={{
              fontSize: '1.35rem',
              color: report.overdueAlerts.length ? 'var(--danger)' : undefined,
            }}
          >
            {report.overdueAlerts.length}
          </div>
          <div className="hint">fora da semana</div>
        </div>
        <div className="stat-card">
          <div className="label">Slack</div>
          <div className="value" style={{ fontSize: '1.15rem' }}>
            {slackConfigured === null ? '…' : slackConfigured ? 'OK' : 'Off'}
          </div>
          <div className="hint">
            {slackConfigured
              ? 'Webhook configurado'
              : 'Defina SLACK_WEBHOOK_URL no .env'}
          </div>
        </div>
      </div>

      <section className="panel edit-section">
        <div className="panel-head">
          <h2>Notas opcionais (vão no final)</h2>
        </div>
        <div className="status-form">
          <label>
            Atualizações
            <textarea
              rows={3}
              placeholder="Tópicos extras da semana"
              value={notes.updates}
              onChange={(e) => patchNotes('updates', e.target.value)}
            />
          </label>
          <label>
            Atenção / em risco
            <textarea
              rows={2}
              placeholder="Opcional"
              value={notes.risks}
              onChange={(e) => patchNotes('risks', e.target.value)}
            />
          </label>
          <label>
            Impedimentos
            <textarea
              rows={2}
              placeholder="Opcional"
              value={notes.impediments}
              onChange={(e) => patchNotes('impediments', e.target.value)}
            />
          </label>
          <label>
            Próximos passos
            <textarea
              rows={2}
              placeholder="Opcional"
              value={notes.nextSteps}
              onChange={(e) => patchNotes('nextSteps', e.target.value)}
            />
          </label>
          <label>
            Link do cronograma
            <input
              value={scheduleLink}
              onChange={(e) => setScheduleLink(e.target.value)}
              placeholder="URL do repo / planilha"
            />
          </label>
        </div>
      </section>

      <section className="panel edit-section">
        <div className="panel-head">
          <h2>Prévia do status (Slack)</h2>
        </div>
        <pre className="status-preview">{report.markdown}</pre>
      </section>
    </div>
  )
}
