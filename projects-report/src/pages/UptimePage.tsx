import { SectionPlaceholder } from '../components/SectionPlaceholder'

const services = [
  { name: 'Totem / Ultimate', status: 'desconhecido' },
  { name: 'Blog', status: 'desconhecido' },
  { name: 'VTEX', status: 'desconhecido' },
  { name: 'Kruzer', status: 'desconhecido' },
  { name: 'Canais PDV', status: 'desconhecido' },
]

export function UptimePage() {
  return (
    <SectionPlaceholder
      title="Status de canais / serviços"
      lead="Uptime e saúde dos serviços em produção."
    >
      <div className="uptime-list">
        {services.map((service) => (
          <div key={service.name} className="uptime-row">
            <strong>{service.name}</strong>
            <span className="uptime-badge">{service.status}</span>
          </div>
        ))}
      </div>
      <p style={{ margin: '1rem 0 0', color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
        Próximo passo: integrar checks de uptime (status page, health endpoints ou
        ferramenta de monitoramento).
      </p>
    </SectionPlaceholder>
  )
}
