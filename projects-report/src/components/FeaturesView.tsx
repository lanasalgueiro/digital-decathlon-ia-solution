import { Fragment, useMemo } from 'react'
import type { Project } from '../data/projects'

type Props = {
  project: Project
  onTogglePrototyped: (featureId: string, prototyped: boolean) => void
}

export function FeaturesView({ project, onTogglePrototyped }: Props) {
  const prototypedCount = useMemo(
    () =>
      project.featurePhases.reduce(
        (acc, phase) => acc + phase.features.filter((f) => f.prototyped).length,
        0,
      ),
    [project.featurePhases],
  )

  const totalFeatures = useMemo(
    () => project.featurePhases.reduce((acc, p) => acc + p.features.length, 0),
    [project.featurePhases],
  )

  return (
    <>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="stat-card">
          <div className="label">Features</div>
          <div className="value">{totalFeatures}</div>
          <div className="hint">no escopo mapeado</div>
        </div>
        <div className="stat-card">
          <div className="label">Prototipadas</div>
          <div className="value">{prototypedCount}</div>
          <div className="hint">marque e salve em Editar</div>
        </div>
        <div className="stat-card">
          <div className="label">Estimativa fase 1</div>
          <div className="value" style={{ fontSize: '1.2rem' }}>
            {project.featurePhases[0]?.totals?.withAi ?? '—'}
          </div>
          <div className="hint">
            com IA · sem IA {project.featurePhases[0]?.totals?.withoutAi ?? '—'}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Features & estimativas de desenvolvimento</h2>
        </div>
        <table className="features-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Prototipado</th>
              <th>Tempo Dev IA</th>
              <th>Tempo Sem IA</th>
            </tr>
          </thead>
          <tbody>
            {project.featurePhases.map((phase) => (
              <Fragment key={phase.id}>
                <tr className="phase-row">
                  <td>{phase.name}</td>
                  <td />
                  <td>{phase.totals?.withAi ?? ''}</td>
                  <td>{phase.totals?.withoutAi ?? ''}</td>
                </tr>
                {phase.features.map((feature) => (
                  <tr key={feature.id}>
                    <td>{feature.name}</td>
                    <td>
                      <button
                        type="button"
                        className={`check${feature.prototyped ? ' on' : ''}`}
                        aria-pressed={feature.prototyped}
                        aria-label={`Marcar ${feature.name} como prototipado`}
                        onClick={() =>
                          onTogglePrototyped(feature.id, !feature.prototyped)
                        }
                      >
                        {feature.prototyped ? '✓' : ''}
                      </button>
                    </td>
                    <td>{feature.timeWithAi}</td>
                    <td>{feature.timeWithoutAi}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
