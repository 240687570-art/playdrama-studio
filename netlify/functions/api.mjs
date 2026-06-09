import { Readable } from 'node:stream'
import { getUser } from '@netlify/identity'

function makeNodeRequest(request) {
  const url = new URL(request.url)
  const headers = Object.fromEntries(request.headers.entries())

  headers.host = headers.host || url.host

  const stream = new Readable({
    read() {},
  })

  stream.method = request.method
  stream.url = `${url.pathname}${url.search}`
  stream.headers = headers

  return stream
}

function makeNodeResponse() {
  let status = 200
  const headers = {}
  const chunks = []
  let finish

  const ended = new Promise((resolve) => {
    finish = resolve
  })

  const response = {
    writeHead(nextStatus, nextHeaders = {}) {
      status = nextStatus
      Object.assign(headers, nextHeaders)
    },
    setHeader(name, value) {
      headers[name] = value
    },
    write(chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
    },
    end(chunk = '') {
      if (chunk) {
        this.write(chunk)
      }
      finish()
    },
  }

  return {
    response,
    ended,
    toWebResponse() {
      const body = status === 204 || status === 304 ? null : Buffer.concat(chunks)
      return new Response(body, {
        status,
        headers,
      })
    },
  }
}

export default async function api(request) {
  let handle

  try {
    const server = await import('../../server/index.mjs')
    handle = server.handle
  } catch (error) {
    return Response.json(
      {
        error: 'api_import_failed',
        message: error.message,
      },
      { status: 500 },
    )
  }

  const nodeRequest = makeNodeRequest(request)
  const nodeResponse = makeNodeResponse()
  const identityUser = await getUser().catch(() => null)

  if (identityUser?.id && identityUser?.email) {
    nodeRequest.headers['x-playdrama-identity-provider'] = 'netlify-identity'
    nodeRequest.headers['x-playdrama-identity-id'] = identityUser.id
    nodeRequest.headers['x-playdrama-identity-email'] = identityUser.email
    nodeRequest.headers['x-playdrama-identity-name'] =
      identityUser.name || identityUser.user_metadata?.full_name || identityUser.email
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    nodeRequest.push(await request.text())
  }
  nodeRequest.push(null)

  try {
    await handle(nodeRequest, nodeResponse.response)
    await nodeResponse.ended
  } catch (error) {
    return Response.json(
      {
        error: 'api_handler_failed',
        message: error.message,
      },
      { status: 500 },
    )
  }

  return nodeResponse.toWebResponse()
}

export const config = {
  path: '/api/*',
}
