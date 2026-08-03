import { useEffect, useId, useState, type FormEvent } from 'react'
import type { Incident } from '../data/incidents'

type Props = {
  open: boolean
  initial?: Incident | null
  onClose: () => void
  onSave: (incident: Incident) => void
}

type FormState = {
  title: string
  date: string
  monitored: boolean
  alerted: boolean
  documented: boolean
  originDeploy: boolean
  knowIssues: boolean
  summary: string
  rootCause: string
  resolution: string
}

function formFromIncident(incident?: Incident | null): FormState {
  if (!incident) {
    return {
      title: '',
      date: toInputDate(new Date()),
      monitored: false,
      alerted: false,
      documented: false,
      originDeploy: false,
      knowIssues: false,
      summary: '',
      rootCause: '',
      resolution: '',
    }
  }

  return {
    title: incident.title,
    date: brToInputDate(incident.date),
    monitored: incident.monitored,
    alerted: incident.alerted,
    documented: incident.documented,
    originDeploy: incident.origin === 'deploy' || Boolean(incident.postMortem),
    knowIssues: incident.priority === 'know-issues',
    summary: incident.postMortem?.summary ?? '',
    rootCause: incident.postMortem?.rootCause ?? '',
    resolution: incident.postMortem?.resolution ?? '',
  }
}

export function NewIncidentModal({ open, initial, onClose, onSave }: Props) {
  const titleId = useId()
  const editing = Boolean(initial)
  const [form, setForm] = useState<FormState>(() => formFromIncident(initial))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(formFromIncident(initial))
    setError(null)
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) {
      setError('Informe o título do incidente.')
      return
    }
    if (!form.date) {
      setError('Informe a data.')
      return
    }
    if (form.originDeploy && !form.knowIssues && !form.summary.trim()) {
      setError('Com origem deploy, preencha o resumo do post-mortem.')
      return
    }

    const date = fromInputDate(form.date)
    const prev = initial

    const incident: Incident = {
      id: prev?.id ?? `incident-${Date.now()}`,
      title,
      date,
      severity: 'crítica',
      ...(form.knowIssues ? { priority: 'know-issues' as const } : {}),
      monitored: form.monitored,
      alerted: form.alerted,
      documented: form.documented || form.originDeploy || form.knowIssues,
      ...(form.originDeploy && !form.knowIssues
        ? {
            origin: 'deploy' as const,
            postMortem: {
              status: prev?.postMortem?.status ?? ('resolvido' as const),
              startedAt: prev?.postMortem?.startedAt ?? date,
              resolvedAt: prev?.postMortem?.resolvedAt,
              summary: form.summary.trim(),
              scenario: prev?.postMortem?.scenario,
              rootCause: form.rootCause.trim() || 'A documentar.',
              resolution: form.resolution.trim() || 'A documentar.',
              actionItems: prev?.postMortem?.actionItems ?? [],
              events: prev?.postMortem?.events,
            },
          }
        : {}),
      ...(prev?.jiraKey ? { jiraKey: prev.jiraKey } : {}),
    }

    onSave(incident)
    onClose()
  }

  return (
    <div className="incident-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="incident-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="incident-modal-head">
          <div>
            <p className="selector-kicker">
              {editing ? 'Editar registro' : 'Novo registro'}
            </p>
            <h2 id={titleId}>
              {editing ? 'Editar incidente' : 'Cadastrar incidente'}
            </h2>
          </div>
          <button
            type="button"
            className="incident-modal-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <form className="incident-modal-form" onSubmit={handleSubmit}>
          <label>
            Título
            <input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Ex.: Falha no checkout"
              autoFocus
            />
          </label>

          <label>
            Data
            <input
              type="date"
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
            />
          </label>

          <fieldset className="incident-modal-flags">
            <legend>Acompanhamento</legend>
            <label className="check-label">
              <input
                type="checkbox"
                checked={form.monitored}
                onChange={(e) => update('monitored', e.target.checked)}
              />
              Monitorado
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={form.alerted}
                onChange={(e) => update('alerted', e.target.checked)}
              />
              Alertado
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={form.documented}
                onChange={(e) => update('documented', e.target.checked)}
              />
              Documentado
            </label>
          </fieldset>

          <label className="check-label incident-modal-origin">
            <input
              type="checkbox"
              checked={form.originDeploy}
              onChange={(e) => {
                const checked = e.target.checked
                setForm((prev) => ({
                  ...prev,
                  originDeploy: checked,
                  knowIssues: checked ? false : prev.knowIssues,
                }))
              }}
            />
            <span>
              <strong>Origem: deploy</strong>
              <small>
                Ocasionado pelo nosso time e exige documentação / post-mortem
              </small>
            </span>
          </label>

          <label className="check-label incident-modal-origin">
            <input
              type="checkbox"
              checked={form.knowIssues}
              onChange={(e) => {
                const checked = e.target.checked
                setForm((prev) => ({
                  ...prev,
                  knowIssues: checked,
                  originDeploy: checked ? false : prev.originDeploy,
                }))
              }}
            />
            <span>
              <strong>Know-issues</strong>
              <small>
                Problema identificado; fica em espera até haver capacidade
              </small>
            </span>
          </label>

          {form.originDeploy && !form.knowIssues ? (
            <div className="incident-modal-pm">
              <label>
                Resumo do post-mortem
                <textarea
                  value={form.summary}
                  onChange={(e) => update('summary', e.target.value)}
                  rows={3}
                  placeholder="O que aconteceu e o impacto"
                />
              </label>
              <label>
                Causa raiz
                <textarea
                  value={form.rootCause}
                  onChange={(e) => update('rootCause', e.target.value)}
                  rows={2}
                />
              </label>
              <label>
                Resolução
                <textarea
                  value={form.resolution}
                  onChange={(e) => update('resolution', e.target.value)}
                  rows={2}
                />
              </label>
            </div>
          ) : null}

          {error ? <p className="incident-modal-error">{error}</p> : null}

          <div className="incident-modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editing ? 'Salvar alterações' : 'Salvar incidente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function toInputDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** DD/MM/YYYY → YYYY-MM-DD */
function brToInputDate(value: string): string {
  const [d, m, y] = value.split('/')
  if (!d || !m || !y) return toInputDate(new Date())
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function fromInputDate(value: string): string {
  const [y, m, d] = value.split('-')
  return `${d}/${m}/${y}`
}
