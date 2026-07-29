import { Link } from 'react-router-dom'
import {
  averageMonthlyMonitoredPercent,
  groupIncidentsByMonth,
} from '../data/incidents'
import { loadIncidents } from '../lib/incidentStorage'

export function IncidentesDashboardPage() {
  const items = loadIncidents()
  const months = groupIncidentsByMonth(items)
  const monthlyAverage = averageMonthlyMonitoredPercent(months)
  const withPostMortem = items.filter((i) => i.postMortem).length

  return (
    <div className="section-page incidents-page">
      <header className="section-hero">
        <p className="selector-kicker">Incidentes</p>
        <h1>Dashboard</h1>
        <p className="selector-lead">
          Cobertura de monitoramento por mês e visão resumida dos incidentes
          críticos.
        </p>
        <Link to="/incidentes" className="incident-dash-back">
          ← Voltar à timeline
        </Link>
      </header>

      <div className="stats-grid general-incidents-stats">
        <div className="stat-card">
          <div className="label">Total</div>
          <div className="value">{items.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Com post-mortem</div>
          <div className="value">{withPostMortem}</div>
          <div className="hint">origem deploy</div>
        </div>
        <div className="stat-card">
          <div className="label">Média mensal monitorados</div>
          <div className="value">{formatPercent(monthlyAverage)}</div>
          <div className="hint">média dos % de cada mês</div>
        </div>
      </div>

      <div className="month-coverage-bar panel">
        <h3>Cobertura por mês (% monitorados)</h3>
        <ul className="month-coverage-list">
          {months.map((month) => (
            <li key={month.key}>
              <span className="month-coverage-label">{month.label}</span>
              <div className="month-coverage-track" aria-hidden>
                <span
                  className="month-coverage-fill"
                  style={{ width: `${month.monitoredPercent}%` }}
                />
              </div>
              <span className="month-coverage-value">
                {formatPercent(month.monitoredPercent)}
                <small>
                  {month.monitoredCount}/{month.items.length}
                </small>
              </span>
            </li>
          ))}
        </ul>
        <p className="month-coverage-total">
          Total (média dos meses):{' '}
          <strong>{formatPercent(monthlyAverage)}</strong>
        </p>
      </div>
    </div>
  )
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}
