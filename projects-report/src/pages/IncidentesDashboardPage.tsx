import { Link } from 'react-router-dom'
import {
  averageIncidentsPerMonth,
  averageMonthlyMonitoredPercent,
  averageMttrHours,
  countDeployOrigin,
  formatDurationHours,
  groupIncidentsByMonth,
} from '../data/incidents'
import { loadIncidents } from '../lib/incidentStorage'

const KR_AVG_TARGET_2026 = 1.5
const KR_AVG_TARGET_2027 = 2
const KR_DEPLOY_TARGET = 0
const KR_MTTR_TARGET_HOURS = 24

export function IncidentesDashboardPage() {
  const items = loadIncidents()
  const months = groupIncidentsByMonth(items)
  const monthlyMonitored = averageMonthlyMonitoredPercent(months)
  const avgPerMonth = averageIncidentsPerMonth(items)
  const deployCount = countDeployOrigin(items)
  const mttrHours = averageMttrHours(items)
  const withPostMortem = items.filter((i) => i.postMortem).length
  const currentYear = new Date().getFullYear()
  const activeAvgTarget =
    currentYear <= 2026 ? KR_AVG_TARGET_2026 : KR_AVG_TARGET_2027
  const activeAvgLabel =
    currentYear <= 2026 ? 'até fim de 2026' : 'meta 2027'

  return (
    <div className="section-page incidents-page okr-dashboard">
      <header className="section-hero">
        <p className="selector-kicker">Proposta de OKR · Operações</p>
        <h1>Incidentes: prevenir, não só monitorar</h1>
        <p className="selector-lead">
          Reformulação do indicador atual para focar em redução de incidentes e
          velocidade de resposta — com baseline real do histórico.
        </p>
        <Link to="/incidentes" className="incident-dash-back">
          ← Voltar à timeline
        </Link>
      </header>

      {/* Problema do OKR atual */}
      <section className="panel okr-section okr-problem">
        <h2>OKR atual (problema)</h2>
        <p className="okr-quote">
          “85% dos incidentes alertados, monitorados e documentados”
        </p>
        <ul className="okr-bullets">
          <li>
            Recompensa <strong>ter</strong> incidentes: só dá para medir se
            houver ocorrência.
          </li>
          <li>
            É métrica <strong>reativa</strong> — mede processo depois do
            problema, não prevenção.
          </li>
          <li>
            Não diferencia incidente externo vs. ocasionado pelo nosso time
            (deploy).
          </li>
        </ul>
        <p className="okr-note">
          Cobertura de monitoramento continua útil como indicador de saúde no
          dashboard, mas deixa de ser o objetivo principal.
        </p>
      </section>

      {/* Objective */}
      <section className="panel okr-section okr-objective">
        <p className="okr-label">Objective proposto</p>
        <h2>Reduzir incidentes causados pelo time e acelerar a resposta</h2>
        <p>
          Trabalhar para <strong>evitar</strong> falhas (especialmente pós-deploy)
          e, quando ocorrerem, detectar e resolver rápido — com aprendizado via
          post-mortem.
        </p>
      </section>

      {/* KRs com baseline */}
      <section className="okr-kr-grid">
        <article className="panel okr-kr-card">
          <p className="okr-label">KR 1 · Prevenção</p>
          <h3>Média de incidentes / mês</h3>
          <div className="okr-targets-row">
            <div className="okr-target-chip is-active">
              <span>Até fim de 2026</span>
              <strong>≤ {KR_AVG_TARGET_2026}</strong>
            </div>
            <div className="okr-target-chip">
              <span>Em 2027</span>
              <strong>≤ {KR_AVG_TARGET_2027}</strong>
            </div>
          </div>
          <div className="okr-baseline">
            <span className="okr-baseline-label">Baseline hoje</span>
            <strong>{avgPerMonth.toFixed(1)}</strong>
            <span className="okr-baseline-hint">
              {items.length} incidentes em {months.length} meses com registro
            </span>
          </div>
          <ProgressBar
            current={avgPerMonth}
            target={activeAvgTarget}
            invert
            label={`Meta vigente (${activeAvgLabel}): ≤ ${activeAvgTarget}/mês`}
          />
          <p className="okr-why">
            Menos ocorrências = menos impacto em conversão e experiência. A meta
            puxa o time a evitar, não a “preencher checklist”.
          </p>
        </article>

        <article className="panel okr-kr-card is-critical">
          <p className="okr-label">KR 2 · Qualidade do processo</p>
          <h3>0 incidentes com origem deploy no trimestre</h3>
          <div className="okr-baseline">
            <span className="okr-baseline-label">Baseline hoje</span>
            <strong>{deployCount}</strong>
            <span className="okr-baseline-hint">
              {withPostMortem} com post-mortem documentado
            </span>
          </div>
          <ProgressBar
            current={deployCount}
            target={KR_DEPLOY_TARGET}
            invert
            label="Meta: 0 no trimestre"
          />
          <p className="okr-why">
            Origem <strong>deploy</strong> = ocasionado pelo nosso time e que
            exigiu documentação. Está sob nosso controle (QA, E2E, validação em
            prod).
          </p>
        </article>

        <article className="panel okr-kr-card">
          <p className="okr-label">KR 3 · Velocidade de resposta</p>
          <h3>MTTR médio &lt; {KR_MTTR_TARGET_HOURS}h</h3>
          <div className="okr-baseline">
            <span className="okr-baseline-label">Baseline hoje</span>
            <strong>
              {mttrHours == null ? '—' : formatDurationHours(mttrHours)}
            </strong>
            <span className="okr-baseline-hint">
              Mean Time to Resolve (incidentes com datas de início e fim)
            </span>
          </div>
          <ProgressBar
            current={mttrHours ?? KR_MTTR_TARGET_HOURS * 10}
            target={KR_MTTR_TARGET_HOURS}
            invert
            label={`Meta: < ${KR_MTTR_TARGET_HOURS}h`}
            disabled={mttrHours == null}
          />
          <p className="okr-why">
            Mesmo quando houver incidente, o time responde rápido. Complementa a
            prevenção sem depender de “ter muitos casos”.
          </p>
        </article>
      </section>

      {/* Volume por mês */}
      <section className="panel okr-section">
        <h2>Volume por mês (baseline)</h2>
        <p className="okr-section-lead">
          Quantidade de incidentes críticos registrados — a curva que queremos
          puxar para baixo.
        </p>
        <ul className="month-volume-list">
          {[...months].reverse().map((month) => {
            const max = Math.max(...months.map((m) => m.items.length), 1)
            const pct = (month.items.length / max) * 100
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
                  {month.items.length}
                  <small>
                    {month.items.filter((i) => i.origin === 'deploy').length}{' '}
                    deploy
                  </small>
                </span>
              </li>
            )
          })}
        </ul>
        <p className="month-coverage-total">
          Média atual: <strong>{avgPerMonth.toFixed(1)} / mês</strong>
          {' · '}
          Meta 2026: <strong>≤ {KR_AVG_TARGET_2026}</strong>
          {' · '}
          Meta 2027: <strong>≤ {KR_AVG_TARGET_2027}</strong>
        </p>
      </section>

      {/* Saúde operacional (secundário) */}
      <section className="panel okr-section okr-secondary">
        <h2>Indicador de saúde (secundário)</h2>
        <p className="okr-section-lead">
          Mantemos cobertura de monitoramento no dashboard — sem ser o OKR
          principal.
        </p>
        <div className="stats-grid general-incidents-stats">
          <div className="stat-card">
            <div className="label">Total de incidentes</div>
            <div className="value">{items.length}</div>
          </div>
          <div className="stat-card">
            <div className="label">Origem deploy</div>
            <div className="value">{deployCount}</div>
            <div className="hint">post-mortem / documentação</div>
          </div>
          <div className="stat-card">
            <div className="label">Cobertura monitorados</div>
            <div className="value">{formatPercent(monthlyMonitored)}</div>
            <div className="hint">média mensal (legado)</div>
          </div>
        </div>
        <ul className="month-coverage-list" style={{ marginTop: '1rem' }}>
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
      </section>

      {/* Resumo para o chefe */}
      <section className="panel okr-section okr-summary">
        <h2>Resumo para alinhamento</h2>
        <ol className="okr-summary-list">
          <li>
            Tirar o foco de “% monitorado/alertado/documentado” como OKR.
          </li>
          <li>
            Adotar: <strong>≤ {KR_AVG_TARGET_2026}/mês até fim de 2026</strong>,{' '}
            <strong>≤ {KR_AVG_TARGET_2027}/mês em 2027</strong>,{' '}
            <strong>0 origem deploy no trimestre</strong>,{' '}
            <strong>MTTR &lt; 24h</strong>.
          </li>
          <li>
            Usar a timeline + post-mortems para aprendizado; o dashboard mede se
            estamos prevenindo de verdade.
          </li>
        </ol>
      </section>
    </div>
  )
}

function ProgressBar({
  current,
  target,
  invert,
  label,
  disabled,
}: {
  current: number
  target: number
  invert?: boolean
  label: string
  disabled?: boolean
}) {
  // invert: menor é melhor — progresso = quão perto da meta
  let ratio: number
  if (disabled) {
    ratio = 0
  } else if (invert) {
    if (current <= target) ratio = 1
    else if (target === 0) ratio = Math.max(0, 1 - current / Math.max(current, 3))
    else ratio = Math.min(1, target / current)
  } else {
    ratio = target === 0 ? 0 : Math.min(1, current / target)
  }

  const pct = Math.round(ratio * 100)
  const onTrack = !disabled && (invert ? current <= target : current >= target)

  return (
    <div className={`okr-progress${onTrack ? ' is-ok' : ''}${disabled ? ' is-disabled' : ''}`}>
      <div className="okr-progress-meta">
        <span>{label}</span>
        <span>{disabled ? 'sem dados' : `${pct}% do caminho`}</span>
      </div>
      <div className="okr-progress-track" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function formatPercent(value: number) {
  return `${value.toFixed(0)}%`
}
