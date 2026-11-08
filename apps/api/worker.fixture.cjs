const { readFile, readdir } = require('node:fs/promises')

/** @param {{ origin: string, port?: number, bindings?: Record<string, string> }} options */
exports.createTestRuntime = async function createTestRuntime(options) {
  const { Miniflare, convertV4MiniflareOptions } = require('miniflare')
  const secret = 'isolated-test-secret-with-more-than-32-characters'
  let profile = {
    sub: 'google-test-1',
    email: 'owner@example.test',
    email_verified: true,
    name: 'Owner',
  }
  const root = __dirname + '/'
  const runtime = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      modulesRoot: root,
      scriptPath: root + '.worker-test/worker.js',
      compatibilityDate: '2026-11-08',
      compatibilityFlags: ['nodejs_compat', 'enable_nodejs_http_server_modules'],
      host: '127.0.0.1',
      ...(options.port ? { port: options.port } : {}),
      d1Databases: ['DB'],
      outboundService: async (request) => {
        if (new URL(request.url).hostname !== 'oauth2.googleapis.com')
          throw new Error('Unexpected test network request')
        const token = [
          Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
          Buffer.from(JSON.stringify(profile)).toString('base64url'),
          'test-signature',
        ].join('.')
        return Response.json({
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 3600,
          id_token: token,
        })
      },
      bindings: {
        NODE_ENV: 'test',
        BETTER_AUTH_URL: options.origin,
        BETTER_AUTH_SECRET: secret,
        GOOGLE_CLIENT_ID: 'test-client',
        GOOGLE_CLIENT_SECRET: 'test-secret',
        LOG_LEVEL: 'silent',
        ...options.bindings,
      },
    }),
  )
  try {
    const database = await runtime.getD1Database('DB')
    const files = (await readdir(root + 'drizzle')).filter((name) => name.endsWith('.sql')).sort()
    for (const file of files) {
      const sql = await readFile(root + 'drizzle/' + file, 'utf8')
      await database.batch(
        sql
          .split('--> statement-breakpoint')
          .filter((sql) => sql.trim())
          .map((sql) => database.prepare(sql)),
      )
    }
    await runtime.ready
    return {
      runtime,
      secret,
      /** @param {typeof profile} value */ setGoogleProfile(value) {
        profile = value
      },
    }
  } catch (error) {
    await runtime.dispose()
    throw error
  }
}
