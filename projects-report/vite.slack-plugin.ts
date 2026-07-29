import type { Plugin } from 'vite'
import { loadEnv } from 'vite'

type Body = {
  text?: string
  blocks?: unknown[]
}

async function readJson(req: import('http').IncomingMessage): Promise<Body> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  return JSON.parse(raw) as Body
}

export function slackApiPlugin(): Plugin {
  return {
    name: 'slack-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '')
      const webhook =
        env.SLACK_WEBHOOK_URL ||
        env.VITE_SLACK_WEBHOOK_URL ||
        process.env.SLACK_WEBHOOK_URL ||
        ''

      server.middlewares.use('/api/slack/status', async (req, res, next) => {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              configured: Boolean(webhook),
              hint: webhook
                ? 'Webhook configurado. POST /api/slack/status com { text }.'
                : 'Defina SLACK_WEBHOOK_URL no .env',
            }),
          )
          return
        }

        if (req.method !== 'POST') {
          next()
          return
        }

        try {
          if (!webhook) {
            res.statusCode = 503
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                ok: false,
                error:
                  'SLACK_WEBHOOK_URL não configurada. Crie um Incoming Webhook no Slack e adicione no .env',
              }),
            )
            return
          }

          const body = await readJson(req)
          if (!body.text?.trim()) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'Campo text é obrigatório' }))
            return
          }

          const slackRes = await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: body.text }),
          })

          const slackBody = await slackRes.text()
          if (!slackRes.ok || slackBody !== 'ok') {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                ok: false,
                error: `Slack respondeu: ${slackBody || slackRes.statusText}`,
              }),
            )
            return
          }

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              ok: false,
              error: error instanceof Error ? error.message : 'Erro ao enviar',
            }),
          )
        }
      })
    },
  }
}
