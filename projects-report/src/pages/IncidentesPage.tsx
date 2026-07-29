import { SectionPlaceholder } from '../components/SectionPlaceholder'

export function IncidentesPage() {
  return (
    <SectionPlaceholder
      title="Incidentes críticos"
      lead="Post-mortems, causa raiz e ações corretivas."
    >
      <table className="portfolio-table">
        <thead>
          <tr>
            <th>Incidente</th>
            <th>Severidade</th>
            <th>Status</th>
            <th>Post-mortem</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={4} style={{ color: 'var(--ink-soft)' }}>
              Nenhum incidente crítico registrado ainda. Quando houver, liste aqui
              com link para o post-mortem.
            </td>
          </tr>
        </tbody>
      </table>
    </SectionPlaceholder>
  )
}
