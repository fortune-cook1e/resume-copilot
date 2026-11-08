import type { ExportedHandler } from '@cloudflare/workers-types'
import { httpServerHandler } from 'cloudflare:node'
import { createApplication } from './dist/main.js'
import type { WorkerBindings } from './src/config/runtime.module'

// Nest initializes once on the first request, inside the Workers request context.
let handler: Promise<ReturnType<typeof httpServerHandler>> | undefined

export default {
  async fetch(request, bindings, context) {
    try {
      handler ??= createApplication(bindings).then((app) => {
        // Workers has port-shaped addresses; Node's Unix-socket union is wider.
        const server = app.getHttpServer() as Parameters<typeof httpServerHandler>[0]
        return httpServerHandler(server)
      })
      return await (
        await handler
      ).fetch!(request, bindings, context)
    } catch {
      console.error('API request failed')
      return Response.json(
        { data: null, error: { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable' } },
        { status: 503 },
      )
    }
  },
} satisfies ExportedHandler<WorkerBindings>
