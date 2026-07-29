export type TaskStatus = 'aguardando' | 'em_andamento' | 'concluido' | 'bloqueado'

export type Task = {
  id: string
  title: string
  owner: string
  status: TaskStatus
  startWeek: number
  endWeek: number
}

export type Phase = {
  id: string
  number: number
  name: string
  lead: string
  color: string
  tasks: Task[]
}

export type FeatureEstimate = {
  id: string
  name: string
  prototyped: boolean
  timeWithAi: string
  timeWithoutAi: string
}

export type FeaturePhase = {
  id: string
  name: string
  features: FeatureEstimate[]
  totals?: {
    withAi: string
    withoutAi: string
  }
}

export type ProjectStatus = 'ativo' | 'planejamento' | 'concluido'

/** core = projeto principal · atuacao = participação / escopo menor */
export type ProjectKind = 'core' | 'atuacao'

export type Project = {
  id: string
  title: string
  subtitle: string
  status: ProjectStatus
  kind: ProjectKind
  accent: string
  startDate: string
  endDate: string | null
  description: string
  demoUrl?: string
  team: { name: string; role: string }[]
  timeline: {
    startWeek: number
    endWeek: number
    months: { name: string; weeks: number[] }[]
  }
  phases: Phase[]
  featurePhases: FeaturePhase[]
}

export const projects: Project[] = [
  {
    id: 'ultimate',
    title: 'Ultimate',
    subtitle: 'Totem · self-checkout · experiência em loja',
    status: 'ativo',
    kind: 'core',
    accent: '#0a5c8a',
    startDate: '15/06',
    endDate: null,
    description:
      'Projeto de totem / experiência digital Decathlon com layout, documentação, desenvolvimento front e fechamento em loja.',
    demoUrl: 'https://decathlon-totem-v2.vercel.app/#/home',
    team: [
      { name: 'Vinicius', role: 'Design / UX' },
      { name: 'Lana Salgueiro', role: 'Produto / IA' },
      { name: 'Luan', role: 'Tech / Planejamento' },
      { name: 'GoK', role: 'Front / Prototipação' },
      { name: 'Esteira Dev', role: 'Manutenção' },
    ],
    timeline: {
      startWeek: 24,
      endWeek: 43,
      months: [
        { name: 'Junho', weeks: [24, 25, 26] },
        { name: 'Julho', weeks: [27, 28, 29, 30] },
        { name: 'Agosto', weeks: [31, 32, 33, 34, 35] },
        { name: 'Setembro', weeks: [36, 37, 38, 39] },
        { name: 'Outubro', weeks: [40, 41, 42, 43] },
      ],
    },
    phases: [
      {
        id: 'fase-1',
        number: 1,
        name: 'Criação Layout & Design',
        lead: 'Vinicius',
        color: '#115591',
        tasks: [
          {
            id: 'f1-t1',
            title: 'Alocação UX',
            owner: 'Lana',
            status: 'aguardando',
            startWeek: 25,
            endWeek: 26,
          },
          {
            id: 'f1-t2',
            title: 'Prototipação do Projeto',
            owner: 'GoK',
            status: 'aguardando',
            startWeek: 26,
            endWeek: 28,
          },
          {
            id: 'f1-t3',
            title: 'Aprovação dos Protótipos',
            owner: 'Vini / Luan',
            status: 'aguardando',
            startWeek: 28,
            endWeek: 29,
          },
          {
            id: 'f1-t4',
            title: 'Refinamento de Layout',
            owner: 'GoK / Luan',
            status: 'aguardando',
            startWeek: 29,
            endWeek: 30,
          },
        ],
      },
      {
        id: 'fase-2',
        number: 2,
        name: 'Documentação & Planejamento',
        lead: 'Luan',
        color: '#4D838D',
        tasks: [
          {
            id: 'f2-t1',
            title: 'Criação das Histórias de Desenvolvimento',
            owner: 'Luan',
            status: 'aguardando',
            startWeek: 30,
            endWeek: 32,
          },
          {
            id: 'f2-t2',
            title: 'Documentação e Viabilidade técnica PagarMe - Bipt',
            owner: 'Luan',
            status: 'aguardando',
            startWeek: 31,
            endWeek: 33,
          },
          {
            id: 'f2-t3',
            title: 'Plano de Monitoramento',
            owner: 'Luan',
            status: 'aguardando',
            startWeek: 33,
            endWeek: 34,
          },
          {
            id: 'f2-t4',
            title: 'Comparador de Produto - Data',
            owner: 'Lana',
            status: 'aguardando',
            startWeek: 34,
            endWeek: 35,
          },
        ],
      },
      {
        id: 'fase-3',
        number: 3,
        name: 'Lançamento e execução do projeto',
        lead: 'Lana Salgueiro',
        color: '#BD6431',
        tasks: [
          {
            id: 'f3-t1',
            title: 'Definição de LLM',
            owner: 'Lana',
            status: 'aguardando',
            startWeek: 26,
            endWeek: 31,
          },
          {
            id: 'f3-t2',
            title: 'Desenvolvimento Front',
            owner: 'GoK',
            status: 'aguardando',
            startWeek: 31,
            endWeek: 36,
          },
          {
            id: 'f3-t3',
            title: 'Testes (QA)',
            owner: 'Vini / Luan / Lana',
            status: 'aguardando',
            startWeek: 35,
            endWeek: 38,
          },
          {
            id: 'f3-t4',
            title: 'Publicação APP (Validar Subida)',
            owner: 'Luan / Vini',
            status: 'aguardando',
            startWeek: 38,
            endWeek: 39,
          },
        ],
      },
      {
        id: 'fase-5',
        number: 5,
        name: 'Fechamento do projeto',
        lead: 'Luan / Lana',
        color: '#382572',
        tasks: [
          {
            id: 'f5-t1',
            title: 'Treinamento e documentação de uso',
            owner: 'Lana / Vini',
            status: 'aguardando',
            startWeek: 34,
            endWeek: 35,
          },
          {
            id: 'f5-t2',
            title: 'Acompanhamento em Loja - Utilização',
            owner: 'Luan / Vini / Lana',
            status: 'aguardando',
            startWeek: 40,
            endWeek: 42,
          },
          {
            id: 'f5-t3',
            title: 'Manutenção e Ajustes',
            owner: 'Esteira Dev',
            status: 'aguardando',
            startWeek: 40,
            endWeek: 43,
          },
        ],
      },
    ],
    featurePhases: [
      {
        id: 'features-fase-1',
        name: 'fase 1',
        totals: { withAi: '24–30', withoutAi: '43–57' },
        features: [
          {
            id: 'feat-1',
            name: 'Setup - Criação Inicial',
            prototyped: false,
            timeWithAi: '1',
            timeWithoutAi: '5 a 7',
          },
          {
            id: 'feat-2',
            name: 'Totem Modo contínuo',
            prototyped: false,
            timeWithAi: '1 a 2',
            timeWithoutAi: '3 a 4',
          },
          {
            id: 'feat-3',
            name: 'Integração - CMS',
            prototyped: false,
            timeWithAi: '3',
            timeWithoutAi: '5 a 7',
          },
          {
            id: 'feat-4',
            name: 'Configuração Produtos',
            prototyped: false,
            timeWithAi: '1 a 2',
            timeWithoutAi: '3 a 4',
          },
          {
            id: 'feat-5',
            name: 'Modo de Hibernação',
            prototyped: false,
            timeWithAi: '1 a 2',
            timeWithoutAi: '2 a 3',
          },
          {
            id: 'feat-6',
            name: 'Busca',
            prototyped: false,
            timeWithAi: '2',
            timeWithoutAi: '3 a 4',
          },
          {
            id: 'feat-7',
            name: 'PDD',
            prototyped: false,
            timeWithAi: '1 a 2',
            timeWithoutAi: '2 a 3',
          },
          {
            id: 'feat-8',
            name: 'PLP',
            prototyped: false,
            timeWithAi: '2',
            timeWithoutAi: '3 a 4',
          },
          {
            id: 'feat-9',
            name: 'PDP',
            prototyped: false,
            timeWithAi: '2',
            timeWithoutAi: '3 a 4',
          },
          {
            id: 'feat-10',
            name: 'Carrinho',
            prototyped: false,
            timeWithAi: '3',
            timeWithoutAi: '4 a 6',
          },
          {
            id: 'feat-11',
            name: 'Como quero Pagar',
            prototyped: false,
            timeWithAi: '2 a 3',
            timeWithoutAi: '4 a 6',
          },
          {
            id: 'feat-12',
            name: 'Compartilhamento',
            prototyped: false,
            timeWithAi: '1',
            timeWithoutAi: '2',
          },
          {
            id: 'feat-13',
            name: 'Cadastro de Cliente',
            prototyped: false,
            timeWithAi: '1',
            timeWithoutAi: '2 a 3',
          },
          {
            id: 'feat-14',
            name: 'Integração Stone',
            prototyped: false,
            timeWithAi: '3',
            timeWithoutAi: '7',
          },
        ],
      },
      {
        id: 'features-fase-2',
        name: 'fase 2',
        features: [
          {
            id: 'feat-15',
            name: 'Pagamento no Self-Checkout',
            prototyped: false,
            timeWithAi: '—',
            timeWithoutAi: '—',
          },
        ],
      },
    ],
  },
  {
    id: 'blog-decathlon',
    title: 'Blog - Decathlon',
    subtitle: 'Conteúdo e presença digital · concluído com sucesso',
    status: 'concluido',
    kind: 'core',
    accent: '#1f7a4d',
    startDate: '06/04',
    endDate: '26/06',
    description:
      'Projeto Blog Decathlon concluído com sucesso — layout, documentação, desenvolvimento, publicação e fechamento de conteúdo.',
    team: [
      { name: 'Lais Duarte', role: 'Design / Layout' },
      { name: 'Lana Salgueiro', role: 'Produto / Lançamento' },
      { name: 'Henrique Carvalho', role: 'Documentação & Planejamento' },
      { name: 'GoK', role: 'Front / Prototipação' },
      { name: 'Raphael Buriti', role: 'Estrutura / Tech / Publicação' },
      { name: 'Daniela Cristina', role: 'Histórias de desenvolvimento' },
      { name: 'Esteira Dev - Web', role: 'CMS Vtex' },
      { name: 'Cadastra', role: 'Conteúdo & performance' },
    ],
    timeline: {
      startWeek: 15,
      endWeek: 26,
      months: [
        { name: 'Abril', weeks: [15, 16, 17] },
        { name: 'Maio', weeks: [18, 19, 20, 21, 22] },
        { name: 'Junho', weeks: [23, 24, 25, 26] },
      ],
    },
    phases: [
      {
        id: 'blog-fase-1',
        number: 1,
        name: 'Criação Layout & Design',
        lead: 'Lais Duarte',
        color: '#115591',
        tasks: [
          {
            id: 'blog-f1-t1',
            title: 'Alocação UX',
            owner: 'Lana',
            status: 'concluido',
            startWeek: 15,
            endWeek: 16,
          },
          {
            id: 'blog-f1-t2',
            title: 'Criação do Figma',
            owner: 'GoK',
            status: 'concluido',
            startWeek: 16,
            endWeek: 17,
          },
          {
            id: 'blog-f1-t3',
            title: 'Aprovação das Áreas (Lais)',
            owner: 'Lais',
            status: 'concluido',
            startWeek: 17,
            endWeek: 18,
          },
          {
            id: 'blog-f1-t4',
            title: 'Refinamento de Layout',
            owner: 'GoK / Lais',
            status: 'concluido',
            startWeek: 18,
            endWeek: 19,
          },
        ],
      },
      {
        id: 'blog-fase-2',
        number: 2,
        name: 'Documentação & Planejamento',
        lead: 'Henrique Carvalho',
        color: '#4D838D',
        tasks: [
          {
            id: 'blog-f2-t1',
            title: 'Criação das Histórias de Desenvolvimento',
            owner: 'Daniela Cristina',
            status: 'concluido',
            startWeek: 15,
            endWeek: 17,
          },
          {
            id: 'blog-f2-t2',
            title: 'Definição da Estrutura do Sphere',
            owner: 'Raphael Buriti',
            status: 'concluido',
            startWeek: 17,
            endWeek: 19,
          },
          {
            id: 'blog-f2-t3',
            title: 'Construção do CMS - Vtex',
            owner: 'Esteira Dev - Web',
            status: 'concluido',
            startWeek: 18,
            endWeek: 21,
          },
        ],
      },
      {
        id: 'blog-fase-3',
        number: 3,
        name: 'Lançamento e execução do projeto',
        lead: 'Lana Salgueiro',
        color: '#BD6431',
        tasks: [
          {
            id: 'blog-f3-t1',
            title: 'Alocação Desenvolvedor',
            owner: 'Lana',
            status: 'concluido',
            startWeek: 19,
            endWeek: 19,
          },
          {
            id: 'blog-f3-t2',
            title: 'Desenvolvimento Front',
            owner: 'GoK & Quality',
            status: 'concluido',
            startWeek: 19,
            endWeek: 23,
          },
          {
            id: 'blog-f3-t3',
            title: 'Testes (QA)',
            owner: 'GoK / Cadastra',
            status: 'concluido',
            startWeek: 22,
            endWeek: 25,
          },
          {
            id: 'blog-f3-t4',
            title: 'Publicação Site',
            owner: 'Raphael Buriti',
            status: 'concluido',
            startWeek: 25,
            endWeek: 26,
          },
        ],
      },
      {
        id: 'blog-fase-5',
        number: 5,
        name: 'Fechamento do projeto',
        lead: 'Cadastra',
        color: '#382572',
        tasks: [
          {
            id: 'blog-f5-t1',
            title: 'Cadastro de conteúdo',
            owner: 'Cadastra',
            status: 'concluido',
            startWeek: 26,
            endWeek: 26,
          },
          {
            id: 'blog-f5-t2',
            title: 'Acompanhamento de performance',
            owner: 'Cadastra',
            status: 'concluido',
            startWeek: 26,
            endWeek: 26,
          },
        ],
      },
    ],
    featurePhases: [
      {
        id: 'blog-features-1',
        name: 'fase 1',
        features: [
          {
            id: 'blog-feat-1',
            name: 'Home do blog',
            prototyped: true,
            timeWithAi: '—',
            timeWithoutAi: '—',
          },
          {
            id: 'blog-feat-2',
            name: 'Página de artigo',
            prototyped: true,
            timeWithAi: '—',
            timeWithoutAi: '—',
          },
          {
            id: 'blog-feat-3',
            name: 'CMS Vtex / Sphere',
            prototyped: true,
            timeWithAi: '—',
            timeWithoutAi: '—',
          },
          {
            id: 'blog-feat-4',
            name: 'Publicação e conteúdo',
            prototyped: true,
            timeWithAi: '—',
            timeWithoutAi: '—',
          },
        ],
      },
    ],
  },
  {
    id: 'one-promotion',
    title: 'One Promotion',
    subtitle: 'Documentação VTEX × OnePromotion United Global → PDV',
    status: 'ativo',
    kind: 'atuacao',
    accent: '#6b4c9a',
    startDate: '—',
    endDate: null,
    description:
      'Documentar as promoções da VTEX versus as funcionalidades da ferramenta OnePromotion United Global e entregar para o time de PDV integrar e dar suporte.',
    team: [
      { name: 'Lana Salgueiro', role: 'Produto / Documentação' },
      { name: 'Consultor especialista VTEX', role: 'Quality / Especialista' },
    ],
    timeline: {
      startWeek: 30,
      endWeek: 35,
      months: [
        { name: 'Julho', weeks: [30] },
        { name: 'Agosto', weeks: [31, 32, 33, 34, 35] },
      ],
    },
    phases: [
      {
        id: 'op-fase-1',
        number: 1,
        name: 'Documentação & entrega PDV',
        lead: 'Lana Salgueiro',
        color: '#6b4c9a',
        tasks: [
          {
            id: 'op-t1',
            title: 'Mapear promoções VTEX vs OnePromotion United Global',
            owner: 'Lana',
            status: 'aguardando',
            startWeek: 30,
            endWeek: 32,
          },
          {
            id: 'op-t2',
            title: 'Documentar funcionalidades OnePromotion (com especialista VTEX)',
            owner: 'Consultor VTEX / Quality',
            status: 'aguardando',
            startWeek: 31,
            endWeek: 33,
          },
          {
            id: 'op-t3',
            title: 'Entregar documentação ao time de PDV',
            owner: 'Lana',
            status: 'aguardando',
            startWeek: 33,
            endWeek: 34,
          },
          {
            id: 'op-t4',
            title: 'Apoio à integração e suporte PDV',
            owner: 'Lana + Quality',
            status: 'aguardando',
            startWeek: 34,
            endWeek: 35,
          },
        ],
      },
    ],
    featurePhases: [
      {
        id: 'op-features-1',
        name: 'escopo',
        features: [
          {
            id: 'op-feat-1',
            name: 'Comparativo promoções VTEX × OnePromotion',
            prototyped: false,
            timeWithAi: '—',
            timeWithoutAi: '—',
          },
          {
            id: 'op-feat-2',
            name: 'Pacote de entrega para PDV (integração + suporte)',
            prototyped: false,
            timeWithAi: '—',
            timeWithoutAi: '—',
          },
        ],
      },
    ],
  },
  {
    id: 'price-sync',
    title: 'Price Sync',
    subtitle: 'AS IS → To Be · preço para VTEX e Kruzer',
    status: 'ativo',
    kind: 'atuacao',
    accent: '#8a5a2b',
    startDate: '—',
    endDate: null,
    description:
      'Documentar e estruturar o AS IS da integração de preço para implementar o price sync, e montar a documentação To Be para descer o preço para VTEX e Kruzer.',
    team: [
      { name: 'Lana Salgueiro', role: 'Produto / Documentação' },
      { name: 'Takeshi', role: 'Integração / Tech' },
    ],
    timeline: {
      startWeek: 30,
      endWeek: 36,
      months: [
        { name: 'Julho', weeks: [30] },
        { name: 'Agosto', weeks: [31, 32, 33, 34, 35] },
        { name: 'Setembro', weeks: [36] },
      ],
    },
    phases: [
      {
        id: 'ps-fase-1',
        number: 1,
        name: 'AS IS & To Be',
        lead: 'Lana / Takeshi',
        color: '#8a5a2b',
        tasks: [
          {
            id: 'ps-t1',
            title: 'Documentar AS IS da integração de preço',
            owner: 'Lana / Takeshi',
            status: 'aguardando',
            startWeek: 30,
            endWeek: 32,
          },
          {
            id: 'ps-t2',
            title: 'Estruturar AS IS para implementação do Price Sync',
            owner: 'Takeshi',
            status: 'aguardando',
            startWeek: 31,
            endWeek: 33,
          },
          {
            id: 'ps-t3',
            title: 'Montar documentação To Be (preço → VTEX e Kruzer)',
            owner: 'Lana / Takeshi',
            status: 'aguardando',
            startWeek: 33,
            endWeek: 35,
          },
          {
            id: 'ps-t4',
            title: 'Alinhar To Be com stakeholders',
            owner: 'Lana',
            status: 'aguardando',
            startWeek: 35,
            endWeek: 36,
          },
        ],
      },
    ],
    featurePhases: [
      {
        id: 'ps-features-1',
        name: 'escopo',
        features: [
          {
            id: 'ps-feat-1',
            name: 'Documento AS IS — integração de preço',
            prototyped: false,
            timeWithAi: '—',
            timeWithoutAi: '—',
          },
          {
            id: 'ps-feat-2',
            name: 'Documento To Be — sync para VTEX e Kruzer',
            prototyped: false,
            timeWithAi: '—',
            timeWithoutAi: '—',
          },
        ],
      },
    ],
  },
]

export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id)
}

export function getProjectStats(project: Project) {
  return {
    phases: project.phases.length,
    tasks: project.phases.reduce((acc, p) => acc + p.tasks.length, 0),
    features: project.featurePhases.reduce((acc, p) => acc + p.features.length, 0),
    team: project.team.length,
  }
}

export function getCurrentWeek(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 1)
  const diff = date.getTime() - start.getTime()
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7)
}
