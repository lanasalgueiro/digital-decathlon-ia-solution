import { useState } from 'react'
import { Link } from 'react-router-dom'
import { NewIncidentModal } from '../components/NewIncidentModal'
import {
  groupIncidentsByMonth,
  type Incident,
  type PostMortem,
} from '../data/incidents'
import { loadIncidents, saveIncidents } from '../lib/incidentStorage'

type OriginFilter = 'all' | 'deploy' | 'externa'

function isDeployOrigin(item: Incident) {
  return item.origin === 'deploy' || Boolean(item.postMortem)
}

export function IncidentesPage() {
  const [items, setItems] = useState<Incident[]>(() => loadIncidents())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Incident | null>(null)
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(
    () => loadIncidents().find((i) => i.postMortem)?.id ?? null,
  )

  const deployCount = items.filter(isDeployOrigin).length
  const externaCount = items.length - deployCount

  const visibleItems =
    originFilter === 'deploy'
      ? items.filter(isDeployOrigin)
      : originFilter === 'externa'
        ? items.filter((i) => !isDeployOrigin(i))
        : items

  const months = groupIncidentsByMonth(visibleItems)
  const flatItems = months.flatMap((m) => m.items)

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(item: Incident) {
    setEditing(item)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
  }

  function handleSave(incident: Incident) {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === incident.id)
      const next = exists
        ? prev.map((i) => (i.id === incident.id ? incident : i))
        : [incident, ...prev]
      saveIncidents(next)
      return next
    })
    setExpandedId(incident.id)
  }

  return (
    <div className="section-page incidents-page">
      <header className="section-hero">
        <p className="selector-kicker">Operações</p>
        <h1>Incidentes críticos</h1>
        <p className="selector-lead">
          Visão única dos incidentes. Em vermelho: casos com post-mortem —
          origem <strong>deploy</strong> (ocasionados pelo time e que exigiram
          documentação).
        </p>
        <Link to="/incidentes/dashboard" className="incident-dash-cta">
          Ver dashboard de cobertura →
        </Link>
      </header>

      <div className="incident-filters" role="group" aria-label="Filtros">
        <button
          type="button"
          className={`incident-filter-chip${originFilter === 'deploy' ? ' is-active' : ''}`}
          aria-pressed={originFilter === 'deploy'}
          onClick={() =>
            setOriginFilter((v) => (v === 'deploy' ? 'all' : 'deploy'))
          }
        >
          Origem: deploy
          <span className="incident-filter-count">{deployCount}</span>
        </button>
        <button
          type="button"
          className={`incident-filter-chip is-externa${originFilter === 'externa' ? ' is-active' : ''}`}
          aria-pressed={originFilter === 'externa'}
          onClick={() =>
            setOriginFilter((v) => (v === 'externa' ? 'all' : 'externa'))
          }
        >
          Origem: externa
          <span className="incident-filter-count">{externaCount}</span>
        </button>
        {originFilter !== 'all' ? (
          <button
            type="button"
            className="incident-filter-clear"
            onClick={() => setOriginFilter('all')}
          >
            Limpar filtro
          </button>
        ) : null}
        <span className="incident-filter-meta">
          {flatItems.length} de {items.length}
        </span>
      </div>

      {flatItems.length === 0 ? (
        <div className="panel section-placeholder-panel">
          <p style={{ margin: 0, color: 'var(--ink-soft)' }}>
            {originFilter === 'deploy'
              ? 'Nenhum incidente com origem deploy neste filtro.'
              : originFilter === 'externa'
                ? 'Nenhum incidente com origem externa neste filtro.'
                : 'Nenhum incidente encontrado.'}
          </p>
        </div>
      ) : null}

      <ol className="incident-timeline">
        {flatItems.map((item, index) => {
          const open = expandedId === item.id
          const hasPm = Boolean(item.postMortem)
          const month = months.find((m) =>
            m.items.some((i) => i.id === item.id),
          )
          const isFirstOfMonth = month?.items[0]?.id === item.id

          return (
            <li
              key={item.id}
              className={`incident-item${hasPm ? ' has-postmortem' : ''}`}
            >
              <div className="incident-rail" aria-hidden>
                <span
                  className={`incident-dot${hasPm ? ' is-postmortem' : item.monitored ? ' is-ok' : ''}`}
                />
                {index < flatItems.length - 1 ? (
                  <span className="incident-line" />
                ) : null}
              </div>

              <div className="general-timeline-block">
                {isFirstOfMonth && month ? (
                  <div className="month-timeline-header">
                    <strong>{month.label}</strong>
                    <span>
                      {month.items.length} incidente
                      {month.items.length === 1 ? '' : 's'}
                    </span>
                  </div>
                ) : null}

                <article
                  className={`incident-card${hasPm ? ' is-postmortem' : ''}`}
                >
                  <header className="incident-card-head">
                    <div className="incident-card-top">
                      <div className="incident-meta">
                        <time className="incident-dates">{item.date}</time>
                        <span className="incident-badge severity-crítica">
                          crítica
                        </span>
                        {item.origin === 'deploy' ? (
                          <span
                            className="incident-badge origin-deploy"
                            title="Incidente ocasionado pelo nosso time; exigiu documentação"
                          >
                            Origem: deploy
                          </span>
                        ) : null}
                        {hasPm ? (
                          <span className="incident-badge has-pm">
                            Post-mortem
                          </span>
                        ) : null}
                        <YesNoBadge label="Monitorado" value={item.monitored} />
                        <YesNoBadge label="Alertado" value={item.alerted} />
                        <YesNoBadge
                          label="Documentado"
                          value={item.documented}
                        />
                      </div>
                      <button
                        type="button"
                        className="incident-edit-btn"
                        aria-label={`Editar ${item.title}`}
                        title="Editar incidente"
                        onClick={() => openEdit(item)}
                      >
                        ✎
                      </button>
                    </div>
                    <h2>{item.title}</h2>
                    {item.postMortem ? (
                      <p className="incident-summary">
                        {item.postMortem.summary}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="incident-expand-btn"
                      aria-expanded={open}
                      onClick={() =>
                        setExpandedId(open ? null : item.id)
                      }
                    >
                      {open
                        ? 'Recolher detalhes'
                        : hasPm
                          ? 'Expandir post-mortem'
                          : 'Expandir'}
                      <span aria-hidden>{open ? '▴' : '▾'}</span>
                    </button>
                  </header>

                  {open ? <IncidentDetails item={item} /> : null}
                </article>
              </div>
            </li>
          )
        })}
      </ol>

      <button
        type="button"
        className="incident-fab"
        aria-label="Cadastrar incidente"
        onClick={openCreate}
      >
        <span aria-hidden>+</span>
      </button>

      <NewIncidentModal
        open={modalOpen}
        initial={editing}
        onClose={closeModal}
        onSave={handleSave}
      />
    </div>
  )
}

function IncidentDetails({ item }: { item: Incident }) {
  const pm = item.postMortem

  return (
    <div className="incident-details">
      {item.origin === 'deploy' ? (
        <section className="origin-note">
          <h3>Origem</h3>
          <p>
            <strong>deploy</strong> — incidente ocasionado pelo nosso time e que
            fez necessário documentar (post-mortem).
          </p>
        </section>
      ) : null}

      <section>
        <h3>Acompanhamento</h3>
        <ul className="general-flag-list">
          <li>
            Monitorado: <YesNoBadge value={item.monitored} />
          </li>
          <li>
            Alertado: <YesNoBadge value={item.alerted} />
          </li>
          <li>
            Documentado: <YesNoBadge value={item.documented} />
          </li>
        </ul>
      </section>

      {pm ? <PostMortemDetails pm={pm} /> : null}
    </div>
  )
}

function PostMortemDetails({ pm }: { pm: PostMortem }) {
  return (
    <>
      <section>
        <h3>Período</h3>
        <p>
          {pm.startedAt}
          {pm.resolvedAt ? ` → ${pm.resolvedAt}` : ''} · {pm.status}
        </p>
      </section>

      {pm.scenario ? (
        <section>
          <h3>Cenário</h3>
          <p>{pm.scenario}</p>
        </section>
      ) : null}

      <section>
        <h3>Causa raiz</h3>
        <p>{pm.rootCause}</p>
      </section>

      <section>
        <h3>Resolução</h3>
        <p>{pm.resolution}</p>
      </section>

      {pm.events?.length ? (
        <section>
          <h3>Linha do tempo do incidente</h3>
          <ol className="incident-event-list">
            {pm.events.map((event, i) => (
              <li key={`${event.when}-${i}`}>
                <time>{event.when}</time>
                <div>
                  <strong>{event.title}</strong>
                  {event.detail ? <p>{event.detail}</p> : null}
                  <span className="incident-event-status">{event.status}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {pm.actionItems.length ? (
        <section>
          <h3>Planos de ação</h3>
          <ul className="incident-actions">
            {pm.actionItems.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}

function YesNoBadge({
  value,
  label,
}: {
  value: boolean
  label?: string
}) {
  return (
    <span
      className={`yesno-badge ${value ? 'is-yes' : 'is-no'}`}
      title={label}
    >
      {label ? `${label}: ` : ''}
      {value ? 'Sim' : 'Não'}
    </span>
  )
}
