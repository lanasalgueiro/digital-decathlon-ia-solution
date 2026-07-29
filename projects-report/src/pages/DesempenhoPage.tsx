import { SectionPlaceholder } from '../components/SectionPlaceholder'

export function DesempenhoPage() {
  return (
    <SectionPlaceholder
      title="Desempenho do time de desenvolvimento"
      lead="Indicadores de entrega, ritmo e qualidade do time."
    >
      <div className="stats-grid" style={{ marginBottom: '1rem' }}>
        <div className="stat-card">
          <div className="label">Throughput</div>
          <div className="value">—</div>
          <div className="hint">itens / sprint</div>
        </div>
        <div className="stat-card">
          <div className="label">Lead time</div>
          <div className="value">—</div>
          <div className="hint">mediana</div>
        </div>
        <div className="stat-card">
          <div className="label">Bugs abertos</div>
          <div className="value">—</div>
          <div className="hint">ativos</div>
        </div>
        <div className="stat-card">
          <div className="label">Deployments</div>
          <div className="value">—</div>
          <div className="hint">últimos 30 dias</div>
        </div>
      </div>
      <p style={{ margin: 0, color: 'var(--ink-soft)' }}>
        Próximo passo: conectar métricas reais (Jira, GitHub, CI) para alimentar
        estes cartões.
      </p>
    </SectionPlaceholder>
  )
}
