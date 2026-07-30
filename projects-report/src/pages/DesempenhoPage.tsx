import { useState } from 'react'

type TabId = 'app' | 'site'

const APP_BOARD = {
  pdf: '/desempenho/app-board.pdf',
  image: '/desempenho/app-board.jpg',
  title: 'Board APP',
  source: 'Speedboat · export 02/07/2026',
  fileLabel: 'spdbr-board-10600',
}

export function DesempenhoPage() {
  const [tab, setTab] = useState<TabId>('app')

  return (
    <div className="section-page desempenho-page">
      <header className="section-hero">
        <p className="selector-kicker">Time de desenvolvimento</p>
        <h1>Desempenho</h1>
        <p className="selector-lead">
          Acompanhar entrega e boards por canal. Hoje: APP. Em breve: Site.
        </p>
      </header>

      <div className="incident-tabs" role="tablist" aria-label="Canal">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'app'}
          className={`incident-tab${tab === 'app' ? ' is-active' : ''}`}
          onClick={() => setTab('app')}
        >
          APP
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'site'}
          className={`incident-tab${tab === 'site' ? ' is-active' : ''}`}
          onClick={() => setTab('site')}
        >
          Site
          <span className="incident-tab-count">em breve</span>
        </button>
      </div>

      {tab === 'app' ? <AppBoardPanel /> : <SitePlaceholder />}
    </div>
  )
}

function AppBoardPanel() {
  return (
    <div className="desempenho-board">
      <div className="desempenho-board-toolbar">
        <div>
          <h2>{APP_BOARD.title}</h2>
          <p>
            {APP_BOARD.source} · {APP_BOARD.fileLabel}
          </p>
        </div>
        <a
          className="btn btn-primary"
          href={APP_BOARD.pdf}
          target="_blank"
          rel="noreferrer"
        >
          Abrir PDF
        </a>
      </div>

      <div className="desempenho-board-frame panel">
        <img
          src={APP_BOARD.image}
          alt="Board de desempenho APP (Speedboat)"
          className="desempenho-board-image"
        />
      </div>
    </div>
  )
}

function SitePlaceholder() {
  return (
    <div className="panel section-placeholder-panel desempenho-site-empty">
      <p className="selector-kicker">Em construção</p>
      <h2>Site</h2>
      <p>
        Quando você enviar o board do Site, carregamos nesta aba — no mesmo
        formato do APP.
      </p>
    </div>
  )
}
