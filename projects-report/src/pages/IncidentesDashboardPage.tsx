import { Link } from 'react-router-dom'
import {
  averageMonthlyMonitoredPercent,
  averageMttrHours,
  formatDurationHours,
  groupCoverageByMonth,
} from '../data/incidents'
import { loadIncidents } from '../lib/incidentStorage'

const KR_MONITOR_TARGET = 85
/** Meta 2026 de média mensal de bugs críticos pós-deploy (origem deploy). */
const KR_DEPLOY_AVG_TARGET_2026 = 1
const KR_MTTR_TARGET_HOURS = 24

export function IncidentesDashboardPage() {
  const items = loadIncidents()
  const coverageMonths = groupCoverageByMonth(items)
  const monthlyMonitored = averageMonthlyMonitoredPercent(coverageMonths)
  const mttrHours = averageMttrHours(items)

  const deployItems = items.filter(
    (i) => i.origin === 'deploy' || Boolean(i.postMortem),
  )
  const deployCount = deployItems.length
  /** Mesmo intervalo do calendário; meses sem deploy contam 0 na média. */
  const deployVolumeMonths = groupCoverageByMonth(items).map((month) => {
    const inMonth = deployItems.filter((i) => {
      const [, m, y] = i.date.split('/')
      return (
        Number(y) === month.year &&
        Number(m) === month.month
      )
    })
    return { ...month, items: inMonth }
  })
  const avgDeployPerMonth =
    deployVolumeMonths.length === 0
      ? 0
      : deployCount / deployVolumeMonths.length

  return (
    <div className="section-page incidents-page okr-dashboard">
      <header className="section-hero">
        <p className="selector-kicker">Incidentes · Operações</p>
        <h1>Dashboard de OKRs</h1>
        <p className="selector-lead">
          Dois indicadores: cobertura de monitoramento e volume de bugs
          críticos pós-deploy.
        </p>
        <Link to="/incidentes" className="incident-dash-back">
          ← Voltar à timeline
        </Link>
      </header>

      {/* OKR 1 */}
      <section className="panel okr-section okr-keep">
        <p className="okr-label">OKR · Monitoramento</p>
        <h2>
          {KR_MONITOR_TARGET}% dos incidentes alertados, monitorados e
          documentados
        </h2>
        <p className="okr-section-lead">
          Acompanha <strong>todos</strong> os incidentes — origem deploy ou
          externa. Por mês: média de monitorado, alertado e documentado. Mês
          sem incidente = 100%. O total é a média aritmética desses percentuais
          mensais.
        </p>

        <div className="okr-keep-stats">
          <div>
            <span>Cobertura atual</span>
            <strong>{formatPercent(monthlyMonitored)}</strong>
          </div>
          <div>
            <span>Meta</span>
            <strong>{KR_MONITOR_TARGET}%</strong>
          </div>
        </div>

        <div
          className="stats-grid general-incidents-stats"
          style={{ marginTop: '1rem' }}
        >
          <div className="stat-card">
            <div className="label">Total</div>
            <div className="value">{items.length}</div>
          </div>
          <div className="stat-card">
            <div className="label">Cobertura</div>
            <div className="value">{formatPercent(monthlyMonitored)}</div>
            <div className="hint">
              média dos {coverageMonths.length} meses · vazio = 100%
            </div>
          </div>
          <div className="stat-card">
            <div className="label">MTTR</div>
            <div className="value">
              {mttrHours == null ? '—' : formatDurationHours(mttrHours)}
            </div>
            <div className="hint">referência &lt; {KR_MTTR_TARGET_HOURS}h</div>
          </div>
        </div>

        <ul className="month-coverage-list" style={{ marginTop: '1rem' }}>
          {[...coverageMonths].reverse().map((month) => (
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
                  {month.items.length === 0
                    ? 'sem incidentes → 100%'
                    : `${month.items.length} incidente${month.items.length === 1 ? '' : 's'}`}
                </small>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* OKR 2 — só origem deploy */}
      <section className="panel okr-section okr-problem">
        <p className="okr-label">OKR · Volume pós-deploy</p>
        <h2>Reduzir 60% de bugs críticos pós-deploy (incidentes)</h2>
        <p className="okr-section-lead">
          Cálculos apenas com filtro <strong>Origem: deploy</strong>. Meta
          2026: <strong>≤ {KR_DEPLOY_AVG_TARGET_2026} / mês</strong>. Volume de
          LY ainda a confirmar para fechar o −60%.
        </p>

        <div className="okr-keep-stats">
          <div>
            <span>Média atual (só deploy)</span>
            <strong>{avgDeployPerMonth.toFixed(1)} / mês</strong>
          </div>
          <div>
            <span>Meta 2026</span>
            <strong>≤ {KR_DEPLOY_AVG_TARGET_2026} / mês</strong>
          </div>
        </div>

        <div
          className="stats-grid general-incidents-stats"
          style={{ marginTop: '1rem' }}
        >
          <div className="stat-card">
            <div className="label">Total origem deploy</div>
            <div className="value">{deployCount}</div>
            <div className="hint">no período</div>
          </div>
          <div className="stat-card">
            <div className="label">Média / mês</div>
            <div className="value">{avgDeployPerMonth.toFixed(1)}</div>
            <div className="hint">
              {deployVolumeMonths.length} meses · meta ≤{' '}
              {KR_DEPLOY_AVG_TARGET_2026}
            </div>
          </div>
          <div className="stat-card">
            <div className="label">LY</div>
            <div className="value">—</div>
            <div className="hint">a confirmar</div>
          </div>
        </div>

        <ul className="month-volume-list" style={{ marginTop: '1rem' }}>
          {[...deployVolumeMonths].reverse().map((month) => {
            const max = Math.max(
              ...deployVolumeMonths.map((m) => m.items.length),
              1,
            )
            const count = month.items.length
            const pct = (count / max) * 100
            return (
              <li key={month.key}>
                <span className="month-coverage-label">{month.label}</span>
                <div className="month-coverage-track" aria-hidden>
                  <span
                    className="month-volume-fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="month-coverage-value">
                  {count}
                  <small>
                    {count === 0 ? 'sem deploy' : 'origem deploy'}
                  </small>
                </span>
              </li>
            )
          })}
        </ul>

        <p className="month-coverage-total">
          Total origem deploy: <strong>{deployCount}</strong>
          {' · '}
          Média: <strong>{avgDeployPerMonth.toFixed(1)} / mês</strong>
          {' · '}
          Meta 2026: <strong>≤ {KR_DEPLOY_AVG_TARGET_2026} / mês</strong>
          {' · '}
          LY: <strong>a confirmar</strong>
        </p>
      </section>
    </div>
  )
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}
