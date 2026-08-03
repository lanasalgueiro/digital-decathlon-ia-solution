import { Link } from 'react-router-dom'
import {
  averageMonthlyMonitoredPercent,
  averageMttrHours,
  buildDeployOkrMonths,
  consolidateYear,
  formatDurationHours,
  groupCoverageByMonth,
  isDeployOrigin,
} from '../data/incidents'
import { loadIncidents } from '../lib/incidentStorage'

const KR_MONITOR_TARGET = 85
/** Meta 2026: ≤ 1 incidente origem deploy por mês. */
const KR_DEPLOY_AVG_TARGET_2026 = 1
const KR_REDUCTION_PCT = 60
const LY_YEAR = 2025
const TY_YEAR = 2026
const KR_MTTR_TARGET_HOURS = 24

export function IncidentesDashboardPage() {
  const items = loadIncidents()
  const asOf = new Date()
  const coverageMonths = groupCoverageByMonth(items)
  const monthlyMonitored = averageMonthlyMonitoredPercent(coverageMonths)
  const mttrHours = averageMttrHours(items)

  const ly = consolidateYear(items, LY_YEAR, new Date(LY_YEAR, 11, 31))
  const ty = consolidateYear(items, TY_YEAR, asOf)
  const okrMonths = buildDeployOkrMonths(
    items,
    LY_YEAR,
    TY_YEAR,
    KR_DEPLOY_AVG_TARGET_2026,
    asOf,
  )

  const lyAvg = ly.deployAvgPerMonth
  const targetFromLy = lyAvg * (1 - KR_REDUCTION_PCT / 100)
  const tyAvg = ty.deployAvgPerMonth
  const reductionVsLy =
    lyAvg === 0 ? null : ((lyAvg - tyAvg) / lyAvg) * 100
  const ytdBudget = KR_DEPLOY_AVG_TARGET_2026 * ty.monthsInScope
  const ytdOnTrack = ty.deployCount <= ytdBudget

  return (
    <div className="section-page incidents-page okr-dashboard">
      <header className="section-hero">
        <p className="selector-kicker">Incidentes · Operações</p>
        <h1>Dashboard de OKRs</h1>
        <p className="selector-lead">
          Monitoramento (todos) e volume pós-deploy (só origem deploy), com
          consolidado {LY_YEAR} → {TY_YEAR}.
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

      {/* OKR 2 */}
      <section className="panel okr-section okr-problem">
        <p className="okr-label">OKR · Volume pós-deploy</p>
        <h2>Reduzir {KR_REDUCTION_PCT}% de bugs críticos pós-deploy</h2>
        <p className="okr-section-lead">
          Escopo: só <strong>Origem: deploy</strong>. Baseline{' '}
          <strong>{LY_YEAR}</strong> consolidada no app. Meta operacional{' '}
          <strong>{TY_YEAR}: ≤ {KR_DEPLOY_AVG_TARGET_2026} / mês</strong>
          {ly.deployCount > 0 ? (
            <>
              {' '}
              (equivalente a −{KR_REDUCTION_PCT}% sobre LY seria ≤{' '}
              {targetFromLy.toFixed(2)} / mês).
            </>
          ) : null}
        </p>

        {/* Visão anual OKR: Ano → Total · Média = Total/12 */}
        <h3 className="okr-subhead">Visão anual · críticos pós-deploy</h3>
        <p className="okr-section-lead" style={{ marginBottom: '0.75rem' }}>
          Só origem deploy. <strong>Média ano = Total ÷ 12</strong> (ano civil
          completo, inclusive no ano corrente).
        </p>

        <div className="okr-month-table-wrap" style={{ marginBottom: '1rem' }}>
          <table className="okr-month-table okr-year-summary-table">
            <thead>
              <tr>
                <th>Ano</th>
                <th>Total</th>
                <th>Média ano</th>
                <th>Fórmula</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>{LY_YEAR}</strong>
                  <small className="okr-year-tag"> LY · baseline</small>
                </td>
                <td>
                  <strong>{ly.deployCount}</strong>
                </td>
                <td>
                  <strong>{lyAvg.toFixed(2)}</strong>
                  <small> / mês</small>
                </td>
                <td>
                  {ly.deployCount} ÷ 12
                </td>
              </tr>
              <tr className={ytdOnTrack ? 'is-ok' : 'is-bad'}>
                <td>
                  <strong>{TY_YEAR}</strong>
                  <small className="okr-year-tag">
                    {' '}
                    YTD até {ty.byMonth[ty.byMonth.length - 1]?.label}
                  </small>
                </td>
                <td>
                  <strong>{ty.deployCount}</strong>
                </td>
                <td>
                  <strong>{tyAvg.toFixed(2)}</strong>
                  <small> / mês</small>
                </td>
                <td>
                  {ty.deployCount} ÷ 12
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="okr-year-grid">
          <article className="okr-year-card">
            <p className="okr-baseline-label">{LY_YEAR} · LY</p>
            <div className="okr-year-stats">
              <div>
                <span>Total deploy</span>
                <strong>{ly.deployCount}</strong>
              </div>
              <div>
                <span>Média ano</span>
                <strong>{lyAvg.toFixed(2)}</strong>
              </div>
            </div>
            <p className="okr-why">
              Baseline do −{KR_REDUCTION_PCT}%: {ly.deployCount} ÷ 12 ={' '}
              {lyAvg.toFixed(2)} / mês → meta ≤ {targetFromLy.toFixed(2)} / mês.
            </p>
          </article>

          <article className={`okr-year-card${ytdOnTrack ? ' is-ok' : ' is-bad'}`}>
            <p className="okr-baseline-label">
              {TY_YEAR} · YTD (até {ty.byMonth[ty.byMonth.length - 1]?.label})
            </p>
            <div className="okr-year-stats">
              <div>
                <span>Total deploy</span>
                <strong>{ty.deployCount}</strong>
              </div>
              <div>
                <span>Média ano</span>
                <strong>{tyAvg.toFixed(2)}</strong>
              </div>
            </div>
            <p className="okr-why">
              {ty.deployCount} ÷ 12 = {tyAvg.toFixed(2)} / mês. Orçamento YTD: ≤{' '}
              {ytdBudget.toFixed(0)} ({KR_DEPLOY_AVG_TARGET_2026} ×{' '}
              {ty.monthsInScope} meses).{' '}
              {ytdOnTrack ? 'No alvo.' : 'Acima do orçamento.'}
              {reductionVsLy != null ? (
                <>
                  {' '}
                  vs LY: {reductionVsLy >= 0 ? '−' : '+'}
                  {Math.abs(reductionVsLy).toFixed(0)}% na média anual.
                </>
              ) : null}
            </p>
          </article>
        </div>

        <div className="okr-keep-stats" style={{ marginTop: '1rem' }}>
          <div>
            <span>Média ano {TY_YEAR}</span>
            <strong>{tyAvg.toFixed(2)} / mês</strong>
          </div>
          <div>
            <span>Meta {TY_YEAR}</span>
            <strong>≤ {KR_DEPLOY_AVG_TARGET_2026} / mês</strong>
          </div>
        </div>

        {/* Mês a mês */}
        <h3 className="okr-subhead">OKR mês a mês · {TY_YEAR} vs {LY_YEAR}</h3>
        <p className="okr-section-lead" style={{ marginBottom: '0.75rem' }}>
          Colunas: deploy no mês (LY / TY), acumulado TY e orçamento (meta × nº
          do mês). Verde = acumulado dentro do orçamento.
        </p>

        <div className="okr-month-table-wrap">
          <table className="okr-month-table">
            <thead>
              <tr>
                <th>Mês</th>
                <th>{LY_YEAR}</th>
                <th>{TY_YEAR}</th>
                <th>Acum. {TY_YEAR}</th>
                <th>Orçamento</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {okrMonths.map((row) => (
                <tr
                  key={row.month}
                  className={row.onTrack ? 'is-ok' : 'is-bad'}
                >
                  <td>{row.label}</td>
                  <td>{row.lyDeploy}</td>
                  <td>
                    <strong>{row.tyDeploy}</strong>
                  </td>
                  <td>{row.tyCumulative}</td>
                  <td>≤ {row.budgetCumulative}</td>
                  <td>{row.onTrack ? 'No alvo' : 'Acima'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="month-volume-list" style={{ marginTop: '1.15rem' }}>
          {okrMonths.map((row) => {
            const max = Math.max(
              ...okrMonths.map((m) => Math.max(m.lyDeploy, m.tyDeploy)),
              1,
            )
            return (
              <li key={row.month}>
                <span className="month-coverage-label">{row.label}</span>
                <div className="month-coverage-track month-dual-track" aria-hidden>
                  <span
                    className="month-volume-fill is-ly"
                    style={{ width: `${(row.lyDeploy / max) * 100}%` }}
                    title={`${LY_YEAR}: ${row.lyDeploy}`}
                  />
                  <span
                    className="month-volume-fill is-ty"
                    style={{ width: `${(row.tyDeploy / max) * 100}%` }}
                    title={`${TY_YEAR}: ${row.tyDeploy}`}
                  />
                </div>
                <span className="month-coverage-value">
                  {row.tyDeploy}
                  <small>
                    LY {row.lyDeploy} · acum {row.tyCumulative}/
                    {row.budgetCumulative}
                  </small>
                </span>
              </li>
            )
          })}
        </ul>

        <p className="month-coverage-total">
          {TY_YEAR}: Total <strong>{ty.deployCount}</strong> · Média ano{' '}
          <strong>{tyAvg.toFixed(2)}</strong> ({ty.deployCount}÷12)
          {' · '}
          Meta: <strong>≤ {KR_DEPLOY_AVG_TARGET_2026} / mês</strong>
          {' · '}
          {LY_YEAR}: Total <strong>{ly.deployCount}</strong> · Média ano{' '}
          <strong>{lyAvg.toFixed(2)}</strong> ({ly.deployCount}÷12)
        </p>

        <details className="okr-deploy-list">
          <summary>
            Lista origem deploy {TY_YEAR} ({ty.deployCount})
          </summary>
          <ul>
            {items
              .filter((i) => isDeployOrigin(i) && i.date.endsWith(`/${TY_YEAR}`))
              .map((i) => (
                <li key={i.id}>
                  <time>{i.date}</time> {i.title}
                  {i.jiraKey ? ` · ${i.jiraKey}` : ''}
                </li>
              ))}
          </ul>
        </details>
      </section>
    </div>
  )
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}
