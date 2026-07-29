# Projects Report

Interface dinâmica para acompanhar projetos Decathlon (cronograma Gantt, features, equipe e status semanal no Slack).

Stack: **Vite + React + React Router** (Next.js não é necessário neste estágio).

## Como rodar

```bash
cd projects-report
npm install
cp .env.example .env   # opcional, para Slack
npm run dev
```

## Rotas

| Path | Conteúdo |
|------|----------|
| `/` | Overview de todos os projetos |
| `/projects/:id` | Core: visão geral · Atuação: página simples |
| `/projects/:id/timeline` | Cronograma |
| `/projects/:id/features` | Features |
| `/projects/:id/team` | Equipe |
| `/projects/:id/status` | Status → Slack |
| `/projects/:id/edit` | Edição local |

## Status semanal → Slack

Substitui a gem: monta o relatório no mesmo padrão e dispara no Slack.

1. Abra o projeto → **Status → Slack**
2. Cole as novidades em tópicos (opcional — o app já usa fase atual, tarefas, bloqueios e próximos passos do cronograma)
3. Revise a prévia
4. **Disparar no Slack**

### Padrão do relatório

- Título com a quarta-feira da semana
- Fase atual a partir do Gantt
- Status fluído a partir dos tópicos + tarefas
- Atenção / Impedimentos (ou “Nenhum” / sem riscos)
- Próximos passos (tópicos ou tarefas da próxima semana)
- Link do cronograma + equipe do projeto

### Configurar Slack

1. Crie um [Incoming Webhook](https://api.slack.com/messaging/webhooks) no canal desejado
2. No `.env`:

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
VITE_SCHEDULE_LINK=https://github.com/seu-org/digital-decathlon-ia-mvp
```

3. Reinicie `npm run dev`

O endpoint `POST /api/slack/status` roda no Vite (proxy server-side) para não expor CORS e manter o webhook fora do browser.

## Edição local

No menu **Editar / salvar**:
- altere título, datas, responsáveis, status, semanas, features e equipe
- **Salvar local** grava no `localStorage`
- **Restaurar padrão** volta ao seed do código

## Dados

Fonte: `src/data/projects.ts`. **Ultimate** está ativo; **Blog - Decathlon** está concluído (06/04–26/06).
