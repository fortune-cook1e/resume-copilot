import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

let client
try {
  const url = new URL(process.env.DATABASE_URL)
  const args = process.argv.slice(2)
  if (args.length) {
    const [mode, database, user] = args
    if (
      mode !== '--check-target' ||
      args.length !== 3 ||
      url.hostname !== 'postgres' ||
      (url.port && url.port !== '5432') ||
      decodeURIComponent(url.pathname.slice(1)) !== database ||
      decodeURIComponent(url.username) !== user ||
      ['postgres', 'template0', 'template1'].includes(database)
    )
      throw new Error('Database target does not match the Compose database.')
  }
  client = postgres(url.href, { max: 1, connect_timeout: 10, onnotice: () => {} })
  await client`SELECT 1`
  if (!args.length) {
    const folder = fileURLToPath(new URL('../drizzle/', import.meta.url))
    const journal = JSON.parse(
      await readFile(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'),
    )
    const [history] =
      await client`SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS present`
    const [tables] =
      await client`SELECT count(*)::int AS count FROM pg_tables WHERE schemaname = 'public'`
    const last = history.present
      ? (
          await client`SELECT max(created_at)::text AS created_at FROM drizzle.__drizzle_migrations`
        )[0].created_at
      : null
    if (tables.count && (!last || Number(last) < journal.entries[0].when))
      throw new Error('Database migration history is incompatible with this release.')
    await migrate(drizzle(client), { migrationsFolder: folder })
    console.log('Database migrations completed.')
  } else {
    console.log('Compose database target verified.')
  }
} catch {
  console.error(
    'Database preflight or migration failed. Check the target, connection, and migration history.',
  )
  process.exitCode = 1
} finally {
  await client?.end({ timeout: 5 })
}
