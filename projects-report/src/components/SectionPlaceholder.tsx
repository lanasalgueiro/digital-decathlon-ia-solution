import type { ReactNode } from 'react'

type Props = {
  title: string
  lead: string
  children?: ReactNode
}

export function SectionPlaceholder({ title, lead, children }: Props) {
  return (
    <div className="section-page">
      <header className="section-hero">
        <p className="selector-kicker">Em construção</p>
        <h1>{title}</h1>
        <p className="selector-lead">{lead}</p>
      </header>
      <div className="panel section-placeholder-panel">
        {children ?? (
          <p>
            Esta área será preenchida com dados e fluxos específicos. A estrutura
            de navegação já está pronta para evoluir o módulo.
          </p>
        )}
      </div>
    </div>
  )
}
