import { execFileSync } from 'node:child_process'
import { createHmac, randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { test, expect } from '../../apps/web/node_modules/@playwright/test'
import {
  defaultResumeData,
  updateResumeSchema,
  type ResumeData,
} from '../../packages/contracts/src/resume'

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

function readPdfPages(
  path: string,
  expectedLinks?: string[],
  expectedStyles?: { text: string; font: string; size: number }[],
  imageCount?: number,
  expectedRows?: { left: string; right: string }[],
): string[] {
  const pages: {
    text: string
    width: number
    height: number
    origins: [number, number][]
    layoutText: string
    links: string[]
    styles: { text: string; font: string; size: number }[]
    images: number
  }[] = JSON.parse(
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
    styles = []
    # Read the actual PDF text-paint operators. Aggregated text callbacks
    # can report a reset matrix after a marked-content list item.
    def visitor(operator, args, cm, tm):
        if operator in (b'Tj', b'TJ') and args:
            origins.append([tm[4]*cm[0]+tm[5]*cm[2]+cm[4], tm[4]*cm[1]+tm[5]*cm[3]+cm[5]])
    def styled_text(text, cm, tm, font, size):
        if text.strip() and font:
            styles.append(dict(text=text, font=font.get('/BaseFont', ''), size=size))
    text = page.extract_text(visitor_operand_before=visitor, visitor_text=styled_text)
    links = [ref.get_object().get('/A', {}).get('/URI') for ref in page.get('/Annots', [])]
    layout_text = page.extract_text(extraction_mode='layout') if sys.argv[2] == 'true' else ''
    pages.append(dict(text=text, width=float(page.mediabox.width), height=float(page.mediabox.height), origins=origins, layoutText=layout_text, links=[url for url in links if url], styles=styles, images=len(page.images)))
print(json.dumps(pages))
`,
        path,
        String(!!expectedRows),
      ],
      { encoding: 'utf8' },
    ),
  )
  // PDF text origins must stay inside the 14pt horizontal and 18pt vertical margins.
  // The browser check additionally measures full glyph rectangles.
  for (const page of pages) {
    expect(page.width).toBeGreaterThan(594)
    expect(page.width).toBeLessThan(597)
    expect(page.height).toBeGreaterThan(840)
    expect(page.height).toBeLessThan(843)
    for (const [x, y] of page.origins) {
      expect(x).toBeGreaterThanOrEqual(13)
      expect(x).toBeLessThanOrEqual(page.width - 13)
      expect(y).toBeGreaterThanOrEqual(17)
      expect(y).toBeLessThanOrEqual(page.height - 17)
    }
  }
  if (expectedLinks) expect(pages.flatMap((page) => page.links)).toEqual(expectedLinks)
  if (imageCount !== undefined)
    expect(pages.reduce((total, page) => total + page.images, 0)).toBe(imageCount)
  for (const expected of expectedStyles ?? []) {
    expect(
      pages
        .flatMap((page) => page.styles)
        .some(
          (actual) =>
            actual.text.includes(expected.text) &&
            actual.font.includes(expected.font) &&
            Math.abs(actual.size - expected.size) < 0.1,
        ),
    ).toBe(true)
  }
  for (const row of expectedRows ?? []) {
    expect(
      pages.some((page) =>
        page.layoutText.split('\n').some((line) => {
          const left = line.indexOf(row.left)
          const right = line.indexOf(row.right)
          return left >= 0 && right > left + row.left.length + 8
        }),
      ),
    ).toBe(true)
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
  await page.locator('#resume-pdf-source').waitFor({ state: 'attached' })
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
  })
  await page.getByRole('button', { name: 'Page', exact: true }).click()
  await expect(
    page.getByRole('region', { name: 'Page 1', exact: true }).locator('canvas'),
  ).toBeAttached()
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
  await expect(
    page.getByRole('region', { name: 'Page 1', exact: true }).locator('canvas'),
  ).toBeAttached()
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
  await expect(
    page.getByRole('region', { name: 'Page 1', exact: true }).locator('canvas'),
  ).toBeAttached()
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
  await expect(
    page.getByRole('region', { name: 'Page 1', exact: true }).locator('canvas'),
  ).toBeAttached()
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
  await expect(
    page.getByRole('region', { name: 'Page 1', exact: true }).locator('canvas'),
  ).toBeAttached()
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
  await expect(
    page.getByRole('region', { name: 'Page 1', exact: true }).locator('canvas'),
  ).toBeAttached()
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
  await expect(
    page.getByRole('region', { name: 'Page 1', exact: true }).locator('canvas'),
  ).toBeAttached()
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

test('scrolls the preview with the wheel and changes zoom only through its controls', async ({
  page,
  context,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  let data: ResumeData = structuredClone(defaultResumeData)
  const achievementCount = 130
  data.basics.name = 'Scroll Preview Author'
  data.basics.headline = 'Software Engineer'
  data.basics.location = 'Stockholm'
  data.basics.email = 'candidate@example.test'
  data.basics.phone = '5551234567'
  data.basics.website = { icon: '', label: 'Portfolio', link: 'https://example.test/site' }
  data.basics.customFields = [{ icon: 'GitHub', label: 'GitHub', link: 'https://example.test/git' }]
  const contactLinks = [
    'mailto:candidate@example.test',
    'tel:5551234567',
    'https://example.test/site',
    'https://example.test/git',
  ]
  data.sectionOrder = ['experience', 'skills', 'projects']
  data.modules.experience.items = [
    {
      id: 'experience',
      visible: true,
      company: 'Sample Studio',
      position: 'Frontend Engineer',
      location: 'Stockholm, Sweden',
      date: '2023 - Present',
      summary: '',
    },
  ]
  data.modules.skills.items = [
    {
      id: 'web',
      visible: true,
      name: 'Web development',
      level: 'Advanced',
      keywords: ['TypeScript', 'React'],
    },
    { id: 'testing', visible: true, name: 'Testing', level: 'Advanced', keywords: ['Playwright'] },
  ]
  data.modules.projects.items = [
    {
      id: 'project',
      name: 'Scrollable project',
      visible: true,
      date: '',
      description: '',
      website: { icon: '', label: '', link: '' },
      summary:
        Array.from(
          { length: achievementCount },
          (_, i) => `Achievement${i} A project result worth reading.`,
        ).join('\n\n') +
        '\n\n**Résumé details** with a [portfolio link](https://example.test/portfolio).\n\n1. First numbered item\n2. Second numbered item',
    },
  ]
  let resumeId = 'viewport-fixture'
  const user = {
    id: 'viewport-user',
    name: 'Preview Author',
    email: 'preview@example.test',
    emailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  // Exercise the shared validation and reload boundary with synthetic data when
  // a database is unavailable.
  const fixture = app
    ? undefined
    : createServer(async (request, response) => {
        response.setHeader('Content-Type', 'application/json')
        if (request.method === 'PATCH' && request.url === '/api/resumes/viewport-fixture') {
          try {
            let body = ''
            for await (const chunk of request) body += chunk
            const parsed = updateResumeSchema.parse(JSON.parse(body))
            if (parsed.data) data = parsed.data
          } catch {
            response.writeHead(400).end()
            return
          }
        } else if (request.method !== 'GET') {
          response.writeHead(405).end()
          return
        }
        const now = new Date().toISOString()
        if (request.url?.startsWith('/api/auth/get-session')) {
          response.end(
            JSON.stringify({
              user,
              session: {
                id: 'viewport-session',
                userId: user.id,
                token: 'test-only-token',
                expiresAt: new Date(Date.now() + 3600000).toISOString(),
                createdAt: now,
                updatedAt: now,
              },
            }),
          )
        } else if (request.url === '/api/me') {
          response.end(
            JSON.stringify({
              data: { id: user.id, name: user.name, email: user.email },
              error: null,
            }),
          )
        } else if (request.url === '/api/resumes/viewport-fixture') {
          response.end(
            JSON.stringify({
              data: {
                id: resumeId,
                title: 'Viewport journey',
                data,
                description: '',
                visibility: 'private',
                createdAt: now,
                updatedAt: now,
              },
              error: null,
            }),
          )
        } else {
          response.writeHead(404).end()
        }
      })
  if (fixture)
    await new Promise<void>((resolve, reject) => {
      fixture.once('error', reject)
      fixture.listen(3101, '127.0.0.1', resolve)
    })
  try {
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: cookie || 'viewport-test-session',
        url: 'http://127.0.0.1:3100',
      },
    ])
    if (app) {
      const created = await page.request.post('/api/resumes', {
        headers: { origin: 'http://127.0.0.1:3100' },
        data: { title: 'Viewport journey', data },
      })
      expect(created.status()).toBe(201)
      resumeId = (await created.json()).data.id
    }
    const fontWarnings: string[] = []
    page.on('console', (message) => {
      if (/Math\.sumPrecise|Cannot load system font: EBGaramond/.test(message.text()))
        fontWarnings.push(message.text())
    })
    await page.goto(`/builder/${resumeId}`)
    const preview = page.getByRole('region', { name: 'Resume preview', exact: true })
    const pages = preview.getByRole('region', { name: /^Page \d+$/ })
    await expect(pages.first().locator('canvas')).toBeVisible()
    await expect.poll(() => pages.count()).toBeGreaterThan(2)
    const canvasWidth = (index: number) =>
      pages
        .nth(index)
        .locator('canvas')
        .evaluate((canvas: HTMLCanvasElement) => canvas.width)
    await expect.poll(() => canvasWidth(0)).toBeGreaterThan(0)
    await expect.poll(() => canvasWidth(2)).toBe(0)
    const previewText = await pages.allInnerTexts()
    const serverExports: string[] = []
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/export-pdf') serverExports.push(request.url())
    })
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download PDF' }).click()
    const downloadedPath = testInfo.outputPath('browser-generated.pdf')
    await (await download).saveAs(downloadedPath)
    const downloadedPages = readPdfPages(
      downloadedPath,
      [...contactLinks, 'https://example.test/portfolio'],
      [
        { text: 'Scroll Preview Author', font: 'EBGaramond', size: 21 },
        { text: 'Sample Studio', font: 'EBGaramond', size: 10 },
      ],
      5,
      [
        { left: 'Sample Studio', right: 'Stockholm, Sweden' },
        { left: 'Frontend Engineer', right: '2023 - Present' },
      ],
    )
    expect(serverExports).toEqual([])
    expect(downloadedPages).toHaveLength(previewText.length)
    for (let index = 0; index < achievementCount; index++) {
      const marker = new RegExp(`\\bAchievement${index}\\b`)
      expect(previewText.findIndex((text) => marker.test(text))).toBeGreaterThanOrEqual(0)
      expect(downloadedPages.findIndex((text) => marker.test(text))).toBe(
        previewText.findIndex((text) => marker.test(text)),
      )
    }
    expect(downloadedPages.join(' ')).toContain('Résumé details with a portfolio link')
    expect(downloadedPages.join(' ')).toMatch(
      /1\.\s*First numbered item\s+2\.\s*Second numbered item/,
    )
    const paper = preview.getByRole('region', { name: 'Page 1', exact: true })
    const before = (await paper.boundingBox())!
    let area = (await preview.boundingBox())!
    await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2)
    await page.mouse.wheel(0, 400)
    await expect.poll(async () => (await paper.boundingBox())!.y).toBeLessThan(before.y - 100)
    expect((await paper.boundingBox())?.width ?? 0).toBeCloseTo(before.width, 1)
    expect(
      await page
        .getByRole('complementary', { name: 'Resume content' })
        .evaluate((node) => node.scrollTop),
    ).toBe(0)
    const zoom = page.getByRole('group', { name: 'Preview zoom' })
    await expect(zoom.getByRole('button')).toHaveCount(3)
    const percentage = zoom.getByText(/^\d+%$/)
    const initialPercentage = await percentage.innerText()
    await expect(page.getByText('A4 · Live preview', { exact: true })).toHaveCount(0)
    await zoom.getByRole('button', { name: 'Zoom in' }).click()
    await expect
      .poll(async () => (await paper.boundingBox())?.width ?? 0)
      .toBeGreaterThan(before.width + 20)
    await zoom.getByRole('button', { name: 'Zoom out' }).click()
    await expect
      .poll(async () => (await paper.boundingBox())?.width ?? 0)
      .toBeCloseTo(before.width, 1)
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect
      .poll(async () => (await paper.boundingBox())?.width ?? 0)
      .toBeCloseTo(before.width, 1)
    area = (await preview.boundingBox())!
    const priorDrag = (await paper.boundingBox())!
    await page.mouse.move(area.x + 12, area.y + 150)
    await page.mouse.down()
    await page.mouse.move(area.x + 112, area.y + 250, { steps: 10 })
    await page.mouse.up()
    const afterDrag = (await paper.boundingBox())!
    expect(afterDrag.x).toBeCloseTo(priorDrag.x, 1)
    expect(afterDrag.y).toBeCloseTo(priorDrag.y, 1)
    await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2)
    await page.mouse.wheel(0, -1000)
    await expect.poll(async () => (await paper.boundingBox())!.y).toBeGreaterThan(priorDrag.y + 100)
    await zoom.getByRole('button', { name: 'Zoom in' }).click()
    await expect(percentage).not.toHaveText(initialPercentage)
    await zoom.getByRole('button', { name: 'Fit page' }).click()
    await expect(percentage).toHaveText(initialPercentage)
    await expect
      .poll(async () => (await paper.boundingBox())?.width ?? 0)
      .toBeCloseTo(before.width, 1)
    await page.mouse.move(area.x + 12, area.y + 12)
    await page.screenshot({ path: testInfo.outputPath('fixed-scroll-preview.png') })
    expect(fontWarnings).toEqual([])
    const design = page.getByRole('tab', { name: 'Design' })
    await design.click()
    const typography = page.getByRole('tabpanel', { name: 'Design' })
    await expect(typography.getByRole('group', { name: 'Heading' })).toBeVisible()
    await expect(typography.getByRole('group', { name: 'Body' })).toBeVisible()
    await expect(percentage).toHaveText(initialPercentage)
    await page.getByRole('tab', { name: 'Write' }).click()
    await pages.nth(1).getByRole('button', { name: 'Edit Scrollable project' }).press('Enter')
    await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
      'Scrollable project',
    )
    const actions = page.getByRole('button', { name: 'Projects section actions' })
    await actions.click()
    await page.getByRole('menuitemcheckbox', { name: 'Keep on one page' }).click()
    await expect(pages.first()).toContainText('Achievement0')
    await actions.click()
    await page.getByRole('menuitemcheckbox', { name: 'Start on a new page' }).click()
    await expect(pages.first()).not.toContainText('Achievement0')
    await expect(pages.nth(1)).toContainText('Achievement0')
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(preview.locator('canvas')).toHaveCount(0)
    await page.getByRole('button', { name: 'Page', exact: true }).click()
    await pages.first().locator('canvas').scrollIntoViewIfNeeded()
    await expect.poll(() => canvasWidth(0)).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Write', exact: true }).click()
    await expect(preview.locator('canvas')).toHaveCount(0)

    if (fixture) {
      const png =
        'iVBORw0KGgoAAAANSUhEUgAAAAwAAAAICAIAAABChommAAAAEUlEQVR4nGPgyttCEDGMKgIAzyhwgacy0uYAAAAASUVORK5CYII='
      data.modules.projects.startOnNewPage = false
      data.modules.projects.keepTogether = false
      data.modules.projects.items[0].summary = [
        'Résumé 与职业经历',
        '---',
        '| 技能 | Level |\n| --- | --- |\n| TypeScript | Advanced |',
        `<a href="https://example.test/chart"><img src="data:image/png;base64,${png}" alt="Chart"></a>`,
      ].join('\n\n')
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.reload()
      await design.click()
      const heading = typography.getByRole('group', { name: 'Heading' })
      const body = typography.getByRole('group', { name: 'Body' })
      const headingFont = heading.getByRole('combobox', { name: 'Font family' })
      const bodyFont = body.getByRole('combobox', { name: 'Font family' })
      await expect(headingFont).toHaveText('EB Garamond')
      await headingFont.press('Enter')
      await page.getByRole('option', { name: 'Helvetica', exact: true }).click()
      await heading.getByLabel('Font size (pt)').fill('16')
      await heading.getByLabel('Line height').fill('1.25')
      await bodyFont.click()
      await page.getByRole('option', { name: 'Courier', exact: true }).click()
      await body.getByLabel('Font size (pt)').fill('11')
      await body.getByLabel('Line height').fill('1.6')
      await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible()
      await page.reload()
      await design.click()
      await expect(headingFont).toHaveText('Helvetica')
      await expect(heading.getByLabel('Font size (pt)')).toHaveValue('16')
      await expect(heading.getByLabel('Line height')).toHaveValue('1.25')
      await expect(bodyFont).toHaveText('Courier')
      await expect(body.getByLabel('Font size (pt)')).toHaveValue('11')
      await expect(body.getByLabel('Line height')).toHaveValue('1.6')
      await expect(pages.first().locator('canvas')).toBeVisible()
      await expect(pages.first()).toContainText('职业经历')
      const styledDownload = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Download PDF' }).click()
      const styledPath = testInfo.outputPath('typography-and-rich-text.pdf')
      await (await styledDownload).saveAs(styledPath)
      const styledText = readPdfPages(
        styledPath,
        [...contactLinks, 'https://example.test/chart'],
        [
          { text: 'Scroll Preview Author', font: 'Helvetica', size: 24 },
          { text: 'Projects', font: 'Helvetica', size: 16 },
          { text: 'Scrollable project', font: 'Courier', size: 11 },
        ],
        6,
      ).join(' ')
      expect(styledText).toContain('职业经历')
      expect(styledText).toContain('技能')
      expect(styledText).toContain('TypeScript')
      expect(serverExports).toEqual([])

      data.modules.projects.items[0].summary = 'Font coverage fixture 🧑‍🚀'
      await page.reload()
      const popupPromise = page.waitForEvent('popup')
      await page.getByRole('button', { name: 'Print preview' }).click()
      const popup = await popupPromise
      await expect(popup).toHaveURL(/\/resume\/print\?id=viewport-fixture$/)
      await expect(popup.getByRole('region', { name: 'Page 1', exact: true })).toContainText(
        'Font coverage fixture 🧑‍🚀',
      )
      expect(serverExports).toEqual([])
      await popup.close()
    }
  } finally {
    if (fixture)
      await new Promise<void>((resolve, reject) => {
        fixture.close((error) => (error ? reject(error) : resolve()))
        fixture.closeAllConnections()
      })
    else if (resumeId !== 'viewport-fixture') {
      const cleanup = await page.request.delete(`/api/resumes/${resumeId}`, {
        headers: { origin: 'http://127.0.0.1:3100' },
      })
      expect(cleanup.status()).toBe(200)
    }
  }
})
