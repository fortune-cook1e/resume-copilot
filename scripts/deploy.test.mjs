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
  await writeFile(
    path.join(directory, 'bin', 'docker'),
    [
      '#!/bin/bash',
      'printf "%s\\n" "$*" >> "$DEPLOY_TEST_LOG"',
      'case "$*" in',
      '  *"ps --services --status running"*) echo app ;;',
      '  *"printenv POSTGRES_DB"*) echo resume_copilot ;;',
      '  *"printenv POSTGRES_USER"*) echo resume ;;',
      '  *"pg_dump"*) echo synthetic-dump ;;',
      '  *"pg_restore"*) cat >/dev/null; [ "$DEPLOY_TEST_FAIL" != restore ] ;;',
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
    spawnSync('bash', [script, mode], {
      env: { ...env, DEPLOY_TEST_FAIL: failure },
      encoding: 'utf8',
    })
  const commands = () => readFile(env.DEPLOY_TEST_LOG, 'utf8')
  return { directory, run, commands }
}

test('normal deployment applies migrations without resetting the database', async (t) => {
  const { run, commands } = await fixture(t)
  const result = run('migrate')
  assert.equal(result.status, 0, result.stderr)
  const log = await commands()
  assert.match(log, /node scripts\/migrate.mjs/)
  assert.doesNotMatch(log, /dropdb|pg_dump/)
})

test('reset verifies the backup before dropping the database and refuses repetition', async (t) => {
  const { run, commands } = await fixture(t)
  const result = run('reset')
  assert.equal(result.status, 0, result.stderr)
  const log = await commands()
  const restore = log.indexOf('pg_restore')
  const drop = log.indexOf('dropdb --force')
  assert.ok(restore >= 0 && drop > restore)
  assert.match(log.slice(drop), /createdb/)
  assert.match(log.slice(drop), /node scripts\/migrate.mjs/)
  const again = run('reset')
  assert.notEqual(again.status, 0)
  const after = await commands()
  assert.equal(after.match(/dropdb --force/g)?.length, 1)
})

test('failed backup verification preserves the target database and restarts the old app', async (t) => {
  const { run, commands } = await fixture(t, 'restore')
  const result = run('reset')
  assert.notEqual(result.status, 0)
  const log = await commands()
  assert.doesNotMatch(log, /dropdb --force/)
  assert.match(log, /start app/)
})

test('initialization failure resumes through migrate without a second database reset', async (t) => {
  const { run, commands } = await fixture(t, 'migrate')
  assert.notEqual(run('reset').status, 0)
  assert.notEqual(run('reset', '').status, 0)
  const resumed = run('migrate', '')
  assert.equal(resumed.status, 0, resumed.stderr)
  assert.equal((await commands()).match(/dropdb --force/g)?.length, 1)
})

test('wrong database target fails before stopping applications or taking a backup', async (t) => {
  const { run, commands } = await fixture(t, 'target')
  assert.notEqual(run('reset').status, 0)
  assert.doesNotMatch(await commands(), /stop app|pg_dump|dropdb/)
})
