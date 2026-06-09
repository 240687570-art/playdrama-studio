import http from 'node:http'
import { randomUUID } from 'node:crypto'
import './load-env.mjs'

const PORT = Number(process.env.EMAIL_DEV_WEBHOOK_PORT || 8790)
const API_KEY = process.env.EMAIL_API_KEY || ''
const deliveries = []

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
  })
  res.end(JSON.stringify(payload, null, 2))
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

function isAuthorized(req) {
  if (!API_KEY) {
    return true
  }
  return req.headers.authorization === `Bearer ${API_KEY}`
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'playdrama-email-webhook-dev',
      deliveries: deliveries.length,
      apiKeyRequired: Boolean(API_KEY),
    })
    return
  }

  if (req.method === 'GET' && url.pathname === '/deliveries') {
    sendJson(res, 200, {
      deliveries: deliveries.slice(-50).reverse(),
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/send') {
    if (!isAuthorized(req)) {
      sendJson(res, 401, {
        status: 'failed',
        errorMessage: 'Invalid EMAIL_API_KEY',
      })
      return
    }

    try {
      const payload = await readJson(req)
      const delivery = {
        ...payload,
        receivedAt: new Date().toISOString(),
        providerMessageId: `dev_${randomUUID()}`,
        status: process.env.EMAIL_DEV_FORCE_STATUS || 'queued',
      }
      deliveries.push(delivery)

      console.log(`PlayDrama dev email accepted: ${JSON.stringify(delivery)}`)

      sendJson(res, 202, {
        id: delivery.providerMessageId,
        status: delivery.status,
      })
    } catch (error) {
      sendJson(res, 400, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      })
    }
    return
  }

  sendJson(res, 404, {
    error: 'not_found',
    routes: ['GET /health', 'GET /deliveries', 'POST /send'],
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`PlayDrama dev email webhook listening on http://127.0.0.1:${PORT}`)
  console.log(`Use EMAIL_PROVIDER=webhook and EMAIL_WEBHOOK_URL=http://127.0.0.1:${PORT}/send`)
})
