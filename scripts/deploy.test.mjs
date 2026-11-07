import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./deploy.sh', import.meta.url))

async function fixture(t, fail = '') {
  const directory = await mkdtemp(path.join(tmpdir(), 'resume-deploy-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await mkdir(path.join(directory, 'bin'))
  await writeFile(path.join(directory, 'commands.log'), '')
  await writeFile(
    path.join(directory, 'bin', 'docker'),
    [
      '#!/bin/bash',
      'printf "%s\\n" "$*" >> "$DEPLOY_TEST_LOG"',
      'case "$*" in',
      '  *"printenv POSTGRES_DB"*) echo resume_copilot ;;',
      '  *"printenv POSTGRES_USER"*) echo resume ;;',
      '  *"node scripts/migrate.mjs --check-target"*) [ "$DEPLOY_TEST_FAIL" != target ] ;;',
      '  *"node scripts/migrate.mjs") [ "$DEPLOY_TEST_FAIL" != migrate ] ;;',
      'esac',
    ].join('\n'),
    { mode: 0o755 },
  )
  const env = {
    ...process.env,
    PATH: directory + '/bin:' + process.env.PATH,
    DEPLOY_TEST_LOG: directory + '/commands.log',
    DEPLOY_TEST_FAIL: fail,
    DEPLOY_DIRECTORY: directory,
    ALIYUN_REGISTRY: 'example.test',
    IMAGE_TAG: 'test-sha',
  }
  const run = (mode, failure = fail) =>
    spawnSync('bash', [script, ...(mode ? [mode] : [])], {
      env: { ...env, DEPLOY_TEST_FAIL: failure },
      encoding: 'utf8',
    })
  const commands = () => readFile(env.DEPLOY_TEST_LOG, 'utf8')
  return { directory, run, commands }
}

test('normal deployment applies migrations without resetting the database', async (t) => {
  const { run, commands } = await fixture(t)
  const result = run()
  assert.equal(result.status, 0, result.stderr)
  const log = await commands()
  assert.match(log, /api node scripts\/migrate\.mjs\n/)
  assert.match(log, /up -d --wait --wait-timeout 120 api app/)
  assert.doesNotMatch(log, /dropdb|createdb|pg_dump|pg_restore/)
})

test('retired reset argument is rejected before any Docker operation', async (t) => {
  const { run, commands } = await fixture(t)
  const result = run('reset')
  assert.notEqual(result.status, 0)
  assert.equal(await commands(), '')
})

test('failed migration prevents application replacement and allows retry', async (t) => {
  const { run, commands } = await fixture(t, 'migrate')
  assert.notEqual(run().status, 0)
  assert.doesNotMatch(await commands(), /up -d --wait --wait-timeout 120 api app/)
  const resumed = run(undefined, '')
  assert.equal(resumed.status, 0, resumed.stderr)
  assert.doesNotMatch(await commands(), /dropdb|createdb/)
})

test('wrong database target fails before migrations or application replacement', async (t) => {
  const { run, commands } = await fixture(t, 'target')
  assert.notEqual(run().status, 0)
  assert.doesNotMatch(
    await commands(),
    /api node scripts\/migrate\.mjs\n|up -d --wait --wait-timeout 120 api app/,
  )
})
