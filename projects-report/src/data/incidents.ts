export type IncidentStatus = 'resolvido' | 'em investigação' | 'mitigado'

/** Incidente causado pelo time (ex.: deploy) que exigiu documentação / post-mortem. */
export type IncidentOrigin = 'deploy'

/**
 * Prioridade operacional.
 * `know-issues` = problema identificado, em espera até haver capacidade.
 */
export type IncidentPriority = 'crítica' | 'know-issues'

export type IncidentTimelineEvent = {
  when: string
  title: string
  detail?: string
  status: string
}

export type PostMortem = {
  status: IncidentStatus
  startedAt: string
  resolvedAt?: string
  summary: string
  scenario?: string
  rootCause: string
  resolution: string
  actionItems: string[]
  events?: IncidentTimelineEvent[]
}

export type Incident = {
  id: string
  title: string
  /** Data de referência na timeline (DD/MM/YYYY). */
  date: string
  severity: 'crítica'
  /** Default implícito: crítica. Know-issues fica em backlog consciente. */
  priority?: IncidentPriority
  monitored: boolean
  alerted: boolean
  documented: boolean
  /** Presente quando o incidente veio do nosso time e precisou ser documentado. */
  origin?: IncidentOrigin
  postMortem?: PostMortem
  /** Referência Jira (import retroativo). */
  jiraKey?: string
}

export type MonthGroup = {
  key: string
  label: string
  year: number
  month: number
  items: Incident[]
  monitoredCount: number
  monitoredPercent: number
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

/**
 * Visão única: todos críticos.
 * Em vermelho na UI = tem post-mortem (origem deploy).
 */
/** Seed inicial — a lista efetiva vem do storage (com cadastros locais). */
export const seedIncidents: Incident[] = [
  {
    id: 'gi-2026-07-25',
    title: 'Falha com pagamentos à vista cartão Visa',
    date: '25/07/2026',
    severity: 'crítica',
    monitored: true,
    alerted: true,
    documented: true,
  },
  {
    id: 'rnl-express-site',
    title: 'Instabilidade no Serviço RNL Express',
    date: '01/07/2026',
    severity: 'crítica',
    monitored: true,
    alerted: true,
    documented: true,
    origin: 'deploy',
    postMortem: {
      status: 'resolvido',
      startedAt: '01/07/2026 11:20',
      resolvedAt: '16/07/2026 18:48',
      summary:
        'Indisponibilidade da modalidade “Retire na Loja Express” (RNL) no site: usuários não conseguiam selecionar a opção no checkout, interrompendo o fluxo de retirada e afetando conversão.',
      scenario:
        'Itens com estoque disponível em loja não podiam ser selecionados para retirada. Queda imediata no volume de transações concluídas pela restrição das opções de frete, com impacto negativo na experiência e credibilidade.',
      rootCause:
        'Lacuna no processo de QA: o fluxo completo de checkout não foi validado após alteração no header do site. A mudança gerou efeito colateral na lógica de seleção de frete, não captado nos testes de regressão. Detecção via monitoramento de funil e reportes internos; investigação apontou falhas na integração do header após a última atualização.',
      resolution:
        'Incidente resolvido após acionamento da equipe técnica e correção da integração afetada pelo header. Resolução definitiva em 16/07/2026 às 18h48.',
      actionItems: [
        'Reformular QA: testes E2E obrigatórios para qualquer alteração em componentes globais (ex.: header).',
        'Automatizar testes de frete validando disponibilidade do RNL Express em cenários de estoque.',
        'Alertas em tempo real para anomalias na seleção de métodos de entrega no checkout.',
      ],
    },
  },
  {
    id: 'checkout-guest-loop-2026-06',
    title:
      'Instabilidade no Funil de Conversão – Loop no Checkout (Guest Users)',
    date: '09/06/2026',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    postMortem: {
      status: 'resolvido',
      startedAt: '01/06/2026 09:00',
      resolvedAt: '09/06/2026 10:35',
      summary:
        'Quebra crítica de conversão na jornada de Guest Checkout: ao preencher o CEP no header ou editar o endereço no pagamento, os dados pessoais do carrinho eram esvaziados em silêncio, impedindo a conclusão do pedido e gerando perda imediata de receita.',
      scenario:
        'Ocorria com usuários não logados (guests) que chegavam ao checkout com CEP já preenchido pelo Header, ou que editavam/complementavam o endereço. Ao salvar número, complemento e destinatário, o checkout limpava o Profile e o receiverName, forçando regressão à etapa de dados pessoais — loop infinito entre Profile e Address.',
      rootCause:
        'Falha na persistência/sincronização do estado do carrinho via API. No salvamento dos dados complementares de Address, o manipulador de estado limpava ou sobrescrevia o nó de Profile e o receiverName, interpretando a atualização de endereço guest como reset da sessão.',
      resolution:
        'Ajuste na lógica de merge do payload de checkout para que atualizações na etapa de Address preservem Profile e receiverName. Deploy em produção; funil recuperou a faixa estável de ~34% em Shipping Method Selected.',
      actionItems: [
        'Alertas proativos no Amplitude para desvio de conversão entre Checkout Commenced e Shipping Commenced.',
        'Detecção de recorrência anormal de validação de Profile na mesma sessão (sinal de loop).',
        'Notificações imediatas no Slack/Teams quando os monitores dispararem.',
      ],
    },
  },
  {
    id: 'gi-2026-04-28',
    title:
      'Valor à vista (1x) exibido igual ao valor parcelado na modal de adicionar ao carrinho',
    date: '28/04/2026',
    severity: 'crítica',
    monitored: true,
    alerted: true,
    documented: true,
  },
  {
    id: 'checkout-vtex-config-conflict-2026-03',
    title: 'Conflito de Configuração e Falha de Desativação (Checkout)',
    date: '23/04/2026',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    postMortem: {
      status: 'resolvido',
      startedAt: '24/03/2026',
      resolvedAt: '24/04/2026 11:29',
      summary:
        'Configuração VTEX de modal rápido/barato permaneceu ativa após teste, entrando em conflito com a solução de frete via API. O problema só foi descoberto semanas depois, na investigação de share de modalidades de frete.',
      rootCause:
        'Ativação da config VTEX (modal rápido/barato) para teste sem desativação efetiva confirmada; deploy da feature via API não detectou o conflito com a config ainda ativa — falha de comunicação e de validação no processo de testes.',
      resolution:
        'Em 23/04, substituição imediata da solução de frete pela nativa VTEX. Em 24/04, retorno do shipping customizado com desativação definitiva da config VTEX (modal rápido/barato).',
      actionItems: [
        'Monitoramento de Checkout (Payment): telemetria própria sobre o iFrame VTEX (ponto cego crítico) — prioridade em maio.',
        'Retomar teste regressivo semanal completo em produção em todas as etapas.',
        'Gestão de QA: alinhar proximidade e feedbacks com a consultoria de Quality.',
        'Release-Admin VTEX: owners devem reportar no Slack qualquer alteração de config em produção.',
      ],
      events: [
        {
          when: '24/03',
          title: 'Ativação da config VTEX',
          detail: 'Modal rápido/barato ativado para teste.',
          status: 'Início do problema',
        },
        {
          when: '24/03',
          title: 'Teste falha; decisão via API',
          detail: 'Suposição de que a config havia sido desligada.',
          status: 'Falha de comunicação',
        },
        {
          when: '06/04',
          title: 'Deploy da feature via API',
          detail:
            'Desenvolvimento e testes não detectaram o conflito com a config ativa.',
          status: 'Falha de validação',
        },
        {
          when: '23/04 ~11:43',
          title: 'Descoberta no Slack',
          detail:
            'Investigação de share de modalidades de frete identifica a config ainda ativa.',
          status: 'Descoberta',
        },
        {
          when: '23/04 ~14:00',
          title: 'Frete nativo VTEX',
          detail: 'Substituição imediata da solução de frete.',
          status: 'Resolução imediata',
        },
        {
          when: '24/04 11:29',
          title: 'Shipping customizado restaurado',
          detail: 'Desativação definitiva da config VTEX (modal rápido/barato).',
          status: 'Resolução definitiva',
        },
      ],
    },
  },
  {
    id: 'gi-2026-03-26',
    title: 'Aumento de erro 500 na rota api/getorderlist',
    date: '26/03/2026',
    severity: 'crítica',
    monitored: true,
    alerted: true,
    documented: true,
  },
  {
    id: 'gi-2026-03-24',
    title: 'Correção no indicador de StartOrder',
    date: '24/03/2026',
    severity: 'crítica',
    monitored: true,
    alerted: true,
    documented: true,
  },
  {
    id: 'gi-2026-03-16',
    title: 'Queda no site',
    date: '16/03/2026',
    severity: 'crítica',
    monitored: true,
    alerted: true,
    documented: true,
  },
  {
    id: 'gi-2026-01-13',
    title: 'Instabilidade Checkout - 13/01/26',
    date: '13/01/2026',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
  },
  {
    id: 'gi-2026-01-06',
    title: 'Falha na integração de pedidos',
    date: '06/01/2026',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
  },
  // Retroativos Jira 2025 (limpos em deploy_2025_critical_manage.json)
  {
    id: 'jira-spdbr-4274',
    title: '[iOS][Crash] O aplicativo congela durante a navegação',
    date: '17/12/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-4274',
  },
  {
    id: 'jira-spdbr-4211',
    title: 'Botão Baixar boleto não está fazendo download do boleto',
    date: '09/12/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-4211',
  },
  {
    id: 'jira-spdbr-4145',
    title: 'App trava após fechar modal de login no guest',
    date: '27/11/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-4145',
  },
  {
    id: 'jira-spdbr-4013',
    title:
      '[Cartão presente] APP crasha após preencher dados e tocar em comprar',
    date: '31/10/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-4013',
  },
  {
    id: 'jira-spdbr-3981',
    title: 'Crash ao tentar abrir os detalhes do pedido 3P',
    date: '29/10/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-3981',
  },
  {
    id: 'jira-spdbr-3972',
    title: 'Cadastro de usuários parou de funcionar',
    date: '28/10/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-3972',
  },
  {
    id: 'jira-spdbr-3971',
    title: 'Não é possível realizar cadastro via guest-chekout',
    date: '28/10/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-3971',
  },
  {
    id: 'jira-spdbr-3960',
    title: 'Adiciona produto indisponivel no carrinho',
    date: '27/10/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-3960',
  },
  {
    id: 'jira-spdbr-3948',
    title: 'Input de vale presente não apresenta o teclado numerico',
    date: '27/10/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-3948',
  },
  {
    id: 'jira-spdbr-3713',
    title: 'Modal de Login não abre no carrinho',
    date: '08/10/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-3713',
  },
  {
    id: 'jira-spdbr-3663',
    title:
      'Modal de conflito de e-mail quebrando o checkout após clicar em "Entrar"',
    date: '02/10/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-3663',
  },
  {
    id: 'jira-spdbr-3662',
    title: 'Checkout - Pagamento não está carregando',
    date: '02/10/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-3662',
  },
  {
    id: 'jira-spdbr-3660',
    title:
      '[Msite] Após informar CEP selecionar entrega não carregam as opções de entrega',
    date: '02/10/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-3660',
  },
  {
    id: 'jira-spdbr-3549',
    title: 'Erro ao fechar pedido 1P + 3P',
    date: '25/09/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-3549',
  },
  {
    id: 'jira-spdbr-3500',
    title: 'Não é possível selecionar o envio do segundo pacote',
    date: '16/09/2025',
    severity: 'crítica',
    priority: 'know-issues',
    monitored: false,
    alerted: false,
    documented: true,
    jiraKey: 'SPDBR-3500',
  },
  {
    id: 'jira-spdbr-3462',
    title: '[Login] Erro ao tentar realizar login',
    date: '10/09/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-3462',
  },
  {
    id: 'jira-spdbr-3435',
    title: '[iOS] Tela branca após instalação do aplicativo',
    date: '08/09/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-3435',
  },
  {
    id: 'jira-spdbr-3434',
    title: 'Erro ao tentar adicionar produto ao carrinho',
    date: '08/09/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-3434',
  },
  {
    id: 'jira-spdbr-3421',
    title: 'Não é possível finalizar compra via Boleto',
    date: '08/09/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-3421',
  },
  {
    id: 'jira-spdbr-3318',
    title: 'Compre e Retire não funciona',
    date: '20/08/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-3318',
  },
  {
    id: 'jira-spdbr-3305',
    title: '[Mobile] - Quebra de layout na Home ai acessar o Modal de Cep no header',
    date: '15/08/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-3305',
  },
  {
    id: 'jira-spdbr-2900',
    title: 'Tamanhos incorretos ao acessar PDP via produto selecionado na PLP',
    date: '06/06/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-2900',
  },
  {
    id: 'jira-spdbr-2771',
    title: '[App] Botão Pagar boleto apresentado em um pedido pago via PIX',
    date: '16/05/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-2771',
  },
  {
    id: 'jira-spdbr-2605',
    title:
      'Android/iOS - Crash ao tentar abrir na home ultima compra realizada com status faturado',
    date: '09/04/2025',
    severity: 'crítica',
    monitored: false,
    alerted: false,
    documented: true,
    origin: 'deploy',
    jiraKey: 'SPDBR-2605',
  },
]

function parseDate(date: string): { day: number; month: number; year: number } {
  const [day, month, year] = date.split('/').map(Number)
  return { day, month, year }
}

export function sortKey(date: string): number {
  const { day, month, year } = parseDate(date)
  return year * 10000 + month * 100 + day
}

/**
 * Cobertura do mês: média de monitorado / alertado / documentado.
 * Sem incidentes → 100%.
 */
export function monthCoveragePercent(items: Incident[]): {
  monitoredCount: number
  monitoredPercent: number
  coveragePercent: number
} {
  if (items.length === 0) {
    return { monitoredCount: 0, monitoredPercent: 100, coveragePercent: 100 }
  }

  const monitoredCount = items.filter((i) => i.monitored).length
  const alertedCount = items.filter((i) => i.alerted).length
  const documentedCount = items.filter((i) => i.documented).length
  const n = items.length

  const monitoredPercent = (monitoredCount / n) * 100
  const alertedPercent = (alertedCount / n) * 100
  const documentedPercent = (documentedCount / n) * 100
  const coveragePercent =
    (monitoredPercent + alertedPercent + documentedPercent) / 3

  return { monitoredCount, monitoredPercent, coveragePercent }
}

/** Agrupa por mês (mais recente primeiro). Só meses com incidente. */
export function groupIncidentsByMonth(items: Incident[]): MonthGroup[] {
  const map = new Map<string, Incident[]>()

  for (const item of items) {
    const { month, year } = parseDate(item.date)
    const key = `${year}-${String(month).padStart(2, '0')}`
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }

  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, groupItems]) => {
      const { month, year } = parseDate(groupItems[0].date)
      const sorted = [...groupItems].sort(
        (a, b) => sortKey(b.date) - sortKey(a.date),
      )
      const cov = monthCoveragePercent(sorted)
      return {
        key,
        label: `${MONTH_NAMES[month - 1]} ${year}`,
        year,
        month,
        items: sorted,
        monitoredCount: cov.monitoredCount,
        monitoredPercent: cov.coveragePercent,
      }
    })
}

/**
 * Cobertura mensal: preenche meses sem incidente no intervalo como 100%.
 * Intervalo = do primeiro mês com dado até o mês atual (ou o último com dado).
 * Total = média aritmética simples desses % mensais.
 */
export function groupCoverageByMonth(items: Incident[]): MonthGroup[] {
  const withData = groupIncidentsByMonth(items)
  if (withData.length === 0) return []

  const oldest = withData[withData.length - 1]
  const newest = withData[0]

  const now = new Date()
  let endYear = newest.year
  let endMonth = newest.month
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth() + 1
  if (
    nowYear > endYear ||
    (nowYear === endYear && nowMonth > endMonth)
  ) {
    endYear = nowYear
    endMonth = nowMonth
  }

  const byKey = new Map(withData.map((g) => [g.key, g]))
  const filled: MonthGroup[] = []

  let y = oldest.year
  let m = oldest.month
  while (y < endYear || (y === endYear && m <= endMonth)) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    const existing = byKey.get(key)
    if (existing) {
      filled.push(existing)
    } else {
      filled.push({
        key,
        label: `${MONTH_NAMES[m - 1]} ${y}`,
        year: y,
        month: m,
        items: [],
        monitoredCount: 0,
        monitoredPercent: 100,
      })
    }
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }

  return filled.sort((a, b) => (a.key < b.key ? 1 : -1))
}

/** Média aritmética dos percentuais mensais (o que aparece na lista). */
export function averageMonthlyMonitoredPercent(
  groups: MonthGroup[],
): number {
  if (groups.length === 0) return 0
  const total = groups.reduce((sum, g) => sum + g.monitoredPercent, 0)
  return total / groups.length
}

/** Média de incidentes por mês com registro. */
export function averageIncidentsPerMonth(items: Incident[]): number {
  const groups = groupIncidentsByMonth(items)
  if (groups.length === 0) return 0
  return items.length / groups.length
}

export function countDeployOrigin(items: Incident[]): number {
  return items.filter((i) => i.origin === 'deploy' || Boolean(i.postMortem))
    .length
}

/** Parse "DD/MM/YYYY" ou "DD/MM/YYYY HH:mm" → Date local. */
export function parseIncidentDateTime(value: string): Date | null {
  const match = value
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/)
  if (!match) return null
  const [, d, m, y, hh = '0', mm = '0'] = match
  return new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(hh),
    Number(mm),
  )
}

/** MTTR médio em horas (só incidentes com startedAt + resolvedAt). */
export function averageMttrHours(items: Incident[]): number | null {
  const durations: number[] = []
  for (const item of items) {
    const pm = item.postMortem
    if (!pm?.startedAt || !pm.resolvedAt) continue
    const start = parseIncidentDateTime(pm.startedAt)
    const end = parseIncidentDateTime(pm.resolvedAt)
    if (!start || !end) continue
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    if (hours >= 0) durations.push(hours)
  }
  if (durations.length === 0) return null
  return durations.reduce((a, b) => a + b, 0) / durations.length
}

export function formatDurationHours(hours: number): string {
  if (hours < 24) return `${hours.toFixed(1)}h`
  const days = hours / 24
  return `${days.toFixed(1)} dias`
}

export function isKnowIssue(item: Incident): boolean {
  return item.priority === 'know-issues'
}

/** Origem deploy que conta no OKR de volume (exclui know-issues em backlog). */
export function isDeployOrigin(item: Incident): boolean {
  if (isKnowIssue(item)) return false
  return item.origin === 'deploy' || Boolean(item.postMortem)
}

export function yearOf(item: Incident): number {
  return parseDate(item.date).year
}

export type YearConsolidate = {
  year: number
  totalCritical: number
  deployCount: number
  externaCount: number
  /**
   * Média anual oficial do OKR: Total deploy / 12
   * (mesmo no ano corrente — baseline anual, não YTD).
   */
  deployAvgPerMonth: number
  /** Meses com dado na tabela mês a mês (YTD no ano corrente). */
  monthsInScope: number
  byMonth: { month: number; label: string; deploy: number; total: number }[]
}

/** Consolida um ano civil: jan–dez (ou jan–mês atual se for o ano corrente). */
export function consolidateYear(
  items: Incident[],
  year: number,
  asOf: Date = new Date(),
): YearConsolidate {
  const inYear = items.filter((i) => yearOf(i) === year)
  const deploy = inYear.filter(isDeployOrigin)
  const endMonth =
    year === asOf.getFullYear() ? asOf.getMonth() + 1 : 12

  const byMonth = Array.from({ length: endMonth }, (_, idx) => {
    const month = idx + 1
    const monthItems = inYear.filter((i) => parseDate(i.date).month === month)
    return {
      month,
      label: MONTH_NAMES[month - 1],
      deploy: monthItems.filter(isDeployOrigin).length,
      total: monthItems.length,
    }
  })

  return {
    year,
    totalCritical: inYear.length,
    deployCount: deploy.length,
    externaCount: inYear.length - deploy.length,
    deployAvgPerMonth: deploy.length / 12,
    monthsInScope: endMonth,
    byMonth,
  }
}

export type OkrMonthRow = {
  month: number
  label: string
  lyDeploy: number
  tyDeploy: number
  /** Acumulado TY até o mês */
  tyCumulative: number
  /** Orçamento acumulado = metaMensal * mês */
  budgetCumulative: number
  onTrack: boolean
}

/**
 * OKR mês a mês: compara LY vs TY (só deploy) e orçamento da meta mensal.
 */
export function buildDeployOkrMonths(
  items: Incident[],
  lyYear: number,
  tyYear: number,
  monthlyTarget: number,
  asOf: Date = new Date(),
): OkrMonthRow[] {
  const ly = consolidateYear(items, lyYear, new Date(lyYear, 11, 31))
  const ty = consolidateYear(items, tyYear, asOf)
  const endMonth = ty.monthsInScope

  let tyCumulative = 0
  return Array.from({ length: endMonth }, (_, idx) => {
    const month = idx + 1
    const lyDeploy = ly.byMonth.find((m) => m.month === month)?.deploy ?? 0
    const tyDeploy = ty.byMonth.find((m) => m.month === month)?.deploy ?? 0
    tyCumulative += tyDeploy
    const budgetCumulative = monthlyTarget * month
    return {
      month,
      label: MONTH_NAMES[month - 1],
      lyDeploy,
      tyDeploy,
      tyCumulative,
      budgetCumulative,
      onTrack: tyCumulative <= budgetCumulative,
    }
  })
}
