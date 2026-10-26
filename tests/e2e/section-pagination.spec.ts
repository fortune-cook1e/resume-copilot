import { execFileSync } from 'node:child_process'
import { createHmac, randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { test, expect } from '../../apps/web/node_modules/@playwright/test'
import { defaultResumeData } from '../../packages/contracts/src/resume'

test.describe.configure({ mode: 'serial' })
const apiRequire = createRequire(require.resolve('../../apps/api/package.json'))
type TestApplication = Pick<
  import('../../apps/api/node_modules/@nestjs/common').INestApplication,
  'listen' | 'close'
>
let app: TestApplication | undefined
let database: ReturnType<typeof import('../../apps/api/node_modules/postgres')> | undefined
const userId = `pagination-${randomUUID()}`
let cookie = ''
let seeded = false

function readPdfPages(path: string): string[] {
  const pages: { text: string; width: number; height: number; origins: [number, number][] }[] =
    JSON.parse(
      execFileSync(
        process.env.PDF_TEST_PYTHON ?? 'python3',
        [
          '-c',
          `
import json, sys
from pypdf import PdfReader
pages = []
for page in PdfReader(sys.argv[1]).pages:
    origins = []
    def visitor(text, cm, tm, font, size):
        if text.strip():
            origins.append([tm[4]*cm[0]+tm[5]*cm[2]+cm[4], tm[4]*cm[1]+tm[5]*cm[3]+cm[5]])
    text = page.extract_text(visitor_text=visitor)
    pages.append(dict(text=text, width=float(page.mediabox.width), height=float(page.mediabox.height), origins=origins))
print(json.dumps(pages))
`,
          path,
        ],
        { encoding: 'utf8' },
      ),
    )
  // PDF text origins must stay inside the 32px (24pt) content margins.
  // The browser check additionally measures full glyph rectangles.
  for (const page of pages) {
    expect(page.width).toBeGreaterThan(594)
    expect(page.width).toBeLessThan(597)
    expect(page.height).toBeGreaterThan(840)
    expect(page.height).toBeLessThan(843)
    for (const [x, y] of page.origins) {
      expect(x).toBeGreaterThanOrEqual(23)
      expect(x).toBeLessThanOrEqual(page.width - 23)
      expect(y).toBeGreaterThanOrEqual(23)
      expect(y).toBeLessThanOrEqual(page.height - 23)
    }
  }
  return pages.map((page) => page.text)
}

test.beforeAll(async () => {
  const url = process.env.AUTH_TEST_DATABASE_URL
  if (!url) return
  if (new URL(url).pathname !== '/resume_copilot_test')
    throw new Error('An isolated resume_copilot_test database is required')
  const postgres = apiRequire('postgres') as typeof import('../../apps/api/node_modules/postgres')
  database = postgres(url, { onnotice: () => {} })
  const [target] = await database`SELECT current_database() AS name`
  if (target.name !== 'resume_copilot_test') throw new Error('Refusing non-test database')
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: url,
    LOG_LEVEL: 'silent',
    BETTER_AUTH_URL: 'http://127.0.0.1:3100',
    BETTER_AUTH_SECRET: 'pagination-test-only-secret-at-least-thirty-two-characters',
    GOOGLE_CLIENT_ID: 'pagination-test-client',
    GOOGLE_CLIENT_SECRET: 'pagination-test-secret',
  })
  await database`INSERT INTO "user" (id, name, email, email_verified)
    VALUES (${userId}, 'Pagination Author', ${userId + '@example.test'}, true)`
  seeded = true
  const token = randomUUID()
  await database`INSERT INTO session (id, token, user_id, expires_at)
    VALUES (${randomUUID()}, ${token}, ${userId}, now() + interval '1 hour')`
  const signature = createHmac('sha256', process.env.BETTER_AUTH_SECRET!)
    .update(token)
    .digest('base64')
  cookie = encodeURIComponent(`${token}.${signature}`)
  const { createApplication } = apiRequire('./dist/main.js') as {
    createApplication: () => Promise<TestApplication>
  }
  app = await createApplication()
  await app.listen(3101, '127.0.0.1')
})

test.afterAll(async () => {
  await app?.close()
  if (database) {
    try {
      if (seeded) await database`DELETE FROM "user" WHERE id = ${userId}`
    } finally {
      await database.end()
    }
  }
})

test('automatically continues long sections and rich text with matching screen and PDF pages', async ({
  page,
}, testInfo) => {
  const data = structuredClone(defaultResumeData)
  data.basics.name = 'Pagination Author'
  const markers = Array.from(
    { length: 90 },
    (_, index) => `Paragraph${String(index).padStart(3, '0')}`,
  )
  const longWords = Array.from(
    { length: 950 },
    (_, index) => `word${String(index).padStart(3, '0')}`,
  )
  data.modules.projects.items = [
    {
      id: 'long-project',
      visible: true,
      name: 'Long Project',
      description: '',
      date: '',
      website: { icon: '', label: '', link: '' },
      summary:
        markers
          .map(
            (marker) =>
              `**${marker}** A readable project description with a [link](https://example.com).`,
          )
          .join('\n\n') +
        '\n\n' +
        longWords.join(' '),
    },
  ]
  data.modules.education.items = [
    {
      id: 'school',
      visible: true,
      university: 'FollowingUniversity',
      major: '',
      date: '',
      location: '',
      summary: '',
    },
  ]
  const payload = { ...data, sectionOrder: ['projects', 'education'] }
  // Same public print payload boundary used by the API renderer. This is a
  // real rendering check; it deliberately does not claim database persistence.
  await page.addInitScript((data) => {
    Object.assign(window, { __RESUME_DATA__: { id: 'pagination-fixture', data, isPrint: true } })
  }, payload)
  await page.goto('/resume/print')
  await expect(page.locator('#resume-document')).toHaveAttribute('data-ready', 'true')
  const pages = page.getByRole('region', { name: /^Page \d+$/ })
  await expect.poll(() => pages.count()).toBeGreaterThan(2)
  const screenPages = await pages.allInnerTexts()
  const expectedMarkers = [...markers, ...longWords, 'FollowingUniversity']
  for (const marker of expectedMarkers) {
    expect(screenPages.join(' ').match(new RegExp(`\\b${marker}\\b`, 'g')), marker).toHaveLength(1)
  }
  expect(screenPages.join(' ').match(/Pagination Author/g)).toHaveLength(1)
  const bounds = await pages.evaluateAll((elements) =>
    elements.flatMap((element) => {
      const area = element.querySelector('.resume-page-content')!
      const box = area.getBoundingClientRect()
      const walker = document.createTreeWalker(area, NodeFilter.SHOW_TEXT)
      const failures: string[] = []
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue
        const range = document.createRange()
        range.selectNodeContents(node)
        for (const rect of range.getClientRects()) {
          if (
            rect.bottom > box.bottom + 1 ||
            rect.top < box.top - 1 ||
            rect.right > box.right + 1
          ) {
            failures.push(node.textContent.slice(0, 40))
          }
        }
      }
      return failures
    }),
  )
  expect(bounds).toEqual([])
  expect(await pages.locator('a[href="https://example.com"]').count()).toBeGreaterThan(0)

  const pdfPath = testInfo.outputPath('pagination.pdf')
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  })
  const pdfPages = readPdfPages(pdfPath)
  expect(pdfPages).toHaveLength(screenPages.length)
  for (const marker of expectedMarkers) {
    expect(pdfPages.join(' ').match(new RegExp(`\\b${marker}\\b`, 'g'))).toHaveLength(1)
    expect(pdfPages.findIndex((text) => new RegExp(`\\b${marker}\\b`).test(text))).toBe(
      screenPages.findIndex((text) => new RegExp(`\\b${marker}\\b`).test(text)),
    )
  }
})

test('saves, reopens and exports the same real multi-page resume through the authenticated editor', async ({
  page,
  context,
}, testInfo) => {
  test.skip(
    !process.env.AUTH_TEST_DATABASE_URL,
    'Requires an explicitly selected isolated test database and API build',
  )
  await context.addCookies([
    { name: 'better-auth.session_token', value: cookie, url: 'http://127.0.0.1:3100' },
  ])
  const data = structuredClone(defaultResumeData)
  data.basics.name = 'Pagination Author'
  data.modules.projects.items = [
    {
      id: 'project',
      name: 'Editable Project',
      visible: true,
      date: '',
      description: '',
      website: { icon: '', label: '', link: '' },
      summary: Array.from(
        { length: 80 },
        (_, i) => `Line${i} A project achievement with **readable formatting**.`,
      ).join('\n\n'),
    },
  ]
  const response = await page.request.post('/api/resumes', {
    headers: { origin: 'http://127.0.0.1:3100' },
    data: { title: 'Pagination journey', data },
  })
  expect(response.status()).toBe(201)
  const { data: resume } = await response.json()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/builder/${resume.id}`)
  await page.locator('#resume-document').waitFor({ state: 'attached' })
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
  })
  await page.getByRole('button', { name: 'Page', exact: true }).click()
  await expect(page.locator('#resume-document')).toHaveAttribute('data-ready', 'true')
  const preview = page.getByRole('region', { name: /^Page \d+$/ })
  await expect.poll(() => preview.count()).toBeGreaterThan(1)
  await page
    .getByRole('button', { name: 'Edit Editable Project', exact: true })
    .last()
    .press('Enter')
  const name = page.getByRole('textbox', { name: 'Name', exact: true })
  await expect(name).toHaveValue('Editable Project')
  await name.fill('Saved Project')
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible()
  await page.getByRole('button', { name: 'Page', exact: true }).click()
  await expect.poll(() => preview.count()).toBeGreaterThan(1)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.reload()
  await expect(page.locator('#resume-document')).toHaveAttribute('data-ready', 'true')
  const screenPages = await preview.allInnerTexts()
  expect(screenPages[0]).toContain('Saved Project')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).click()
  const download = await downloadPromise
  const path = testInfo.outputPath('saved-resume.pdf')
  await download.saveAs(path)
  const pdfPages = readPdfPages(path)
  expect(pdfPages).toHaveLength(screenPages.length)
  for (let i = 0; i < 80; i++) {
    const pattern = new RegExp(`\\bLine${i}\\b`)
    expect(pdfPages.findIndex((text) => pattern.test(text))).toBe(
      screenPages.findIndex((text) => pattern.test(text)),
    )
  }
  expect(pdfPages.join(' ')).toContain('Saved Project')
  await page.getByRole('button', { name: 'Edit Saved Project', exact: true }).first().press('Enter')
  await page.getByRole('textbox', { name: 'Summary', exact: true }).fill('A shorter saved summary.')
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible()
  await expect(preview).toHaveCount(1)
  await page.reload()
  await expect(page.locator('#resume-document')).toHaveAttribute('data-ready', 'true')
  await expect(preview).toHaveCount(1)
  await expect(preview).toContainText('A shorter saved summary.')
  const cleanup = await page.request.delete(`/api/resumes/${resume.id}`, {
    headers: { origin: 'http://127.0.0.1:3100' },
  })
  expect(cleanup.status()).toBe(200)
})

test('retains ordered-list numbering on continuation pages', async ({ page }) => {
  const data = structuredClone(defaultResumeData)
  data.modules.projects.items = [
    {
      id: 'list',
      name: 'Numbered project',
      visible: true,
      date: '',
      description: '',
      website: { icon: '', link: '', label: '' },
      summary: Array.from(
        { length: 100 },
        (_, i) => `${i + 1}. Item${String(i).padStart(3, '0')} A numbered achievement.`,
      ).join('\n'),
    },
  ]
  await page.addInitScript((data) => {
    Object.assign(window, { __RESUME_DATA__: { id: 'numbered-fixture', data, isPrint: true } })
  }, data)
  await page.goto('/resume/print')
  await expect(page.locator('#resume-document')).toHaveAttribute('data-ready', 'true')
  const lists = await page
    .getByRole('region', { name: /^Page \d+$/ })
    .locator('ol')
    .evaluateAll((elements) =>
      elements.map((list) => {
        const first = list.querySelector('li')!
        return {
          number: first.hasAttribute('value') ? first.value : (list as HTMLOListElement).start,
          text: first.textContent,
        }
      }),
    )
  expect(lists.length).toBeGreaterThan(1)
  for (const list of lists) {
    const index = Number(list.text?.match(/Item(\d+)/)?.[1])
    expect(list.number).toBe(index + 1)
  }
})

test('does not create a page for hidden or visually empty sections with a fresh-page setting', async ({
  page,
}) => {
  const data = {
    ...structuredClone(defaultResumeData),
    basics: { ...defaultResumeData.basics, name: 'Empty Section Author' },
    modules: {
      ...structuredClone(defaultResumeData.modules),
      summary: {
        id: 'summary',
        name: 'Empty summary heading',
        visible: true,
        items: [],
        content: '<p><br></p>',
        startOnNewPage: true,
      },
      languages: {
        id: 'languages',
        name: 'Hidden languages',
        visible: false,
        startOnNewPage: true,
        items: [{ id: 'language', visible: true, language: 'Hidden text', fluency: '' }],
      },
    },
    sectionOrder: ['summary', 'languages'],
  }
  await page.addInitScript((data) => {
    Object.assign(window, { __RESUME_DATA__: { id: 'empty-fixture', data, isPrint: true } })
  }, data)
  await page.goto('/resume/print')
  await expect(page.locator('#resume-document')).toHaveAttribute('data-ready', 'true')
  const pages = page.getByRole('region', { name: /^Page \d+$/ })
  await expect(pages).toHaveCount(1)
  await expect(pages).not.toContainText('Empty summary heading')
  await expect(pages).not.toContainText('Hidden text')
})

test('starts a section on a fresh page and retains it through reorder, reopen and real PDF export', async ({
  page,
  context,
}, testInfo) => {
  test.skip(
    !process.env.AUTH_TEST_DATABASE_URL,
    'Requires an explicitly selected isolated test database and API build',
  )
  await context.addCookies([
    { name: 'better-auth.session_token', value: cookie, url: 'http://127.0.0.1:3100' },
  ])
  await page.setViewportSize({ width: 1440, height: 1000 })
  const data = structuredClone(defaultResumeData)
  data.basics.name = 'Page Start Author'
  data.modules.projects.items = [
    {
      id: 'project',
      visible: true,
      name: 'FreshPageProject',
      date: '',
      description: '',
      summary: 'Short project content.',
      website: { icon: '', link: '', label: '' },
    },
  ]
  data.modules.education.items = [
    {
      id: 'school',
      visible: true,
      university: 'FirstUniversity',
      major: '',
      date: '',
      location: '',
      summary: '',
    },
  ]
  const created = await page.request.post('/api/resumes', {
    headers: { origin: 'http://127.0.0.1:3100' },
    data: {
      title: 'Page start journey',
      data: { ...data, sectionOrder: ['education', 'projects'] },
    },
  })
  expect(created.status()).toBe(201)
  const { data: resume } = await created.json()
  await page.goto(`/builder/${resume.id}`)
  const pages = page.getByRole('region', { name: /^Page \d+$/ })
  await expect(pages).toHaveCount(1)
  await page.getByRole('button', { name: 'Projects section actions' }).click()
  const option = page.getByRole('menuitemcheckbox', { name: 'Start on a new page' })
  await expect(option).not.toBeChecked()
  await option.click()
  await expect(pages).toHaveCount(2)
  await expect(pages.nth(1)).toContainText('FreshPageProject')
  await expect(pages.nth(0)).toContainText('FirstUniversity')
  await page.getByRole('button', { name: 'Projects', exact: true }).press('Alt+ArrowUp')
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible()
  await page.reload()
  await expect(page.locator('#resume-document')).toHaveAttribute('data-ready', 'true')
  await expect(pages).toHaveCount(2)
  await expect(pages.nth(1)).toContainText('FirstUniversity')
  await page.getByRole('button', { name: 'Projects section actions' }).click()
  await expect(option).toBeChecked()
  await page.keyboard.press('Escape')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).click()
  const file = testInfo.outputPath('fresh-page.pdf')
  await (await downloadPromise).saveAs(file)
  const pdfPages = readPdfPages(file)
  expect(pdfPages).toHaveLength(2)
  expect(pdfPages[0]).toContain('Page Start Author')
  expect(pdfPages[1]).toContain('FreshPageProject')
  expect(pdfPages[1]).toContain('FirstUniversity')
  await page.getByRole('button', { name: 'Hide Projects', exact: true }).click()
  await expect(pages).toHaveCount(1)
  await page.getByRole('button', { name: 'Show Projects', exact: true }).click()
  await expect(pages).toHaveCount(2)
  await page.getByRole('button', { name: 'Projects section actions' }).click()
  await option.click()
  await expect(pages).toHaveCount(1)
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible()
  const invalid = await page.request.patch(`/api/resumes/${resume.id}`, {
    headers: { origin: 'http://127.0.0.1:3100' },
    data: {
      data: {
        ...data,
        modules: {
          ...data.modules,
          projects: { ...data.modules.projects, startOnNewPage: 'true' },
        },
      },
    },
  })
  expect(invalid.status()).toBe(400)
  const cleanup = await page.request.delete(`/api/resumes/${resume.id}`, {
    headers: { origin: 'http://127.0.0.1:3100' },
  })
  expect(cleanup.status()).toBe(200)
})

test('keeps a fitting section together, combines page rules, and lets oversized content continue', async ({
  page,
  context,
}, testInfo) => {
  test.skip(
    !process.env.AUTH_TEST_DATABASE_URL,
    'Requires an explicitly selected isolated test database and API build',
  )
  await context.addCookies([
    { name: 'better-auth.session_token', value: cookie, url: 'http://127.0.0.1:3100' },
  ])
  await page.setViewportSize({ width: 1440, height: 1000 })
  const data = structuredClone(defaultResumeData)
  data.basics.name = 'Keep Together Author'
  data.modules.education.items = [
    {
      id: 'school',
      visible: true,
      university: 'PriorUniversity',
      major: '',
      date: '',
      location: '',
      summary: Array.from({ length: 36 }, (_, i) => `BeforeLine${i} A prior achievement.`).join(
        '\n\n',
      ),
    },
  ]
  data.modules.projects.items = [
    {
      id: 'project',
      visible: true,
      name: 'KeptProject',
      date: '',
      description: '',
      summary: Array.from({ length: 10 }, (_, i) => `ProjectLine${i} A project achievement.`).join(
        '\n\n',
      ),
      website: { icon: '', link: '', label: '' },
    },
  ]
  const created = await page.request.post('/api/resumes', {
    headers: { origin: 'http://127.0.0.1:3100' },
    data: { title: 'Keep journey', data: { ...data, sectionOrder: ['education', 'projects'] } },
  })
  expect(created.status()).toBe(201)
  const { data: resume } = await created.json()
  await page.goto(`/builder/${resume.id}`)
  await expect(page.locator('#resume-document')).toHaveAttribute('data-ready', 'true')
  const pages = page.getByRole('region', { name: /^Page \d+$/ })
  await expect(pages).toHaveCount(2)
  await expect(pages.nth(0)).toContainText('KeptProject')
  await page.getByRole('button', { name: 'Projects section actions' }).click()
  const keep = page.getByRole('menuitemcheckbox', { name: 'Keep on one page' })
  const start = page.getByRole('menuitemcheckbox', { name: 'Start on a new page' })
  await expect(keep).not.toBeChecked()
  await keep.click()
  await expect(pages.nth(0)).not.toContainText('KeptProject')
  await expect(pages.nth(1)).toContainText('KeptProject')
  await expect(pages.nth(1)).toContainText('ProjectLine9')
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible()
  await page.reload()
  await expect(page.locator('#resume-document')).toHaveAttribute('data-ready', 'true')
  await expect(pages.nth(1)).toContainText('KeptProject')
  await page.getByRole('button', { name: 'Projects section actions' }).click()
  await expect(keep).toBeChecked()
  await expect(start).not.toBeChecked()
  await start.click()
  await expect(pages).toHaveCount(2)
  const combinedDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).click()
  const combinedPath = testInfo.outputPath('combined-rules.pdf')
  await (await combinedDownload).saveAs(combinedPath)
  const combinedPages = readPdfPages(combinedPath)
  expect(combinedPages).toHaveLength(2)
  expect(combinedPages[0]).not.toContain('KeptProject')
  expect(combinedPages[1]).toContain('KeptProject')
  expect(combinedPages[1]).toContain('ProjectLine9')
  await page.screenshot({ path: testInfo.outputPath('kept-section-editor.png') })
  await page.getByRole('button', { name: 'Projects section actions' }).click()
  await start.click()
  await page.getByRole('button', { name: 'Hide Education', exact: true }).click()
  await expect(pages).toHaveCount(1)
  await expect(pages.nth(0)).toContainText('KeptProject')
  await page.getByRole('button', { name: 'Edit KeptProject', exact: true }).press('Enter')
  const tokens = Array.from({ length: 900 }, (_, i) => `Overflow${String(i).padStart(3, '0')}`)
  await page.getByRole('textbox', { name: 'Summary', exact: true }).fill(tokens.join(' '))
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible()
  await expect(page.locator('#resume-document')).toHaveAttribute('data-ready', 'true')
  await expect.poll(() => pages.count()).toBeGreaterThan(1)
  const screenPages = await pages.allInnerTexts()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).click()
  const file = testInfo.outputPath('oversized-kept-section.pdf')
  await (await downloadPromise).saveAs(file)
  const pdfPages = readPdfPages(file)
  expect(pdfPages).toHaveLength(screenPages.length)
  for (const token of tokens) {
    const pattern = new RegExp(`\\b${token}\\b`)
    expect(pdfPages.join(' ').match(new RegExp(`\\b${token}\\b`, 'g')), token).toHaveLength(1)
    expect(
      pdfPages.findIndex((text) => pattern.test(text)),
      token,
    ).toBe(screenPages.findIndex((text) => pattern.test(text)))
  }
  const cleanup = await page.request.delete(`/api/resumes/${resume.id}`, {
    headers: { origin: 'http://127.0.0.1:3100' },
  })
  expect(cleanup.status()).toBe(200)
})

test('does not split a Unicode grapheme at a page boundary', async ({ page }) => {
  const data = structuredClone(defaultResumeData)
  const glyph = '👩‍💻'
  data.modules.projects.items = [
    {
      id: 'unicode',
      name: 'Unicode project',
      visible: true,
      date: '',
      description: '',
      website: { icon: '', link: '', label: '' },
      summary: glyph.repeat(3500),
    },
  ]
  await page.addInitScript((data) => {
    Object.assign(window, { __RESUME_DATA__: { id: 'unicode-fixture', data, isPrint: true } })
  }, data)
  await page.goto('/resume/print')
  await expect(page.locator('#resume-document')).toHaveAttribute('data-ready', 'true')
  const paragraphs = await page
    .getByRole('region', { name: /^Page \d+$/ })
    .locator('p')
    .allTextContents()
  expect(paragraphs.length).toBeGreaterThan(1)
  for (const paragraph of paragraphs) expect(paragraph).toMatch(/^(?:👩‍💻)+$/u)
  expect(paragraphs.join('')).toBe(glyph.repeat(3500))
})
