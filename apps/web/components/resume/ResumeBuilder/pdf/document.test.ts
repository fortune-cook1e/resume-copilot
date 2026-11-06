import { renderSerializedDocWithLayout, type ElementInfo } from '@formepdf/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPdfDocument } from './document'

let source: HTMLElement

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  source = document.createElement('div')
  source.innerHTML = '<style>* { font-size: 14px; line-height: 20px; }</style>'
  document.body.append(source)
})

afterEach(() => {
  source.remove()
  vi.restoreAllMocks()
})

function section(content: string) {
  source.insertAdjacentHTML(
    'beforeend',
    `<div data-pagination-section="summary"><div data-preview-section="summary">${content}</div></div>`,
  )
}

function render() {
  return renderSerializedDocWithLayout({ ...createPdfDocument(source).document })
}

function textLines(elements: ElementInfo[]): ElementInfo[] {
  return elements.flatMap((element) =>
    element.nodeType === 'TextLine' ? [element] : textLines(element.children),
  )
}

describe('PDF content from the resume template', () => {
  it('lays out one A4 page for a blank resume', async () => {
    source.insertAdjacentHTML('beforeend', '<div data-preview-section="basics"><div></div></div>')
    const { layout } = await render()
    expect(layout.pages).toHaveLength(1)
    expect(layout.pages[0].width).toBeCloseTo(595.28)
    expect(layout.pages[0].height).toBeCloseTo(841.89)
  })

  it('omits hidden inline text and empty sections', async () => {
    section(
      '<p>Visible <span style="display:none">PrivateMarker</span><strong hidden>AnotherMarker</strong> content</p>',
    )
    section('<p><span hidden>HiddenSection</span></p>')
    const { layout } = await render()
    const text = layout.pages
      .flatMap((page) => textLines(page.elements))
      .map((line) => line.textContent)
      .join(' ')
    expect(text).toContain('Visible')
    expect(text).toContain('content')
    expect(text).not.toMatch(/PrivateMarker|AnotherMarker|HiddenSection/)
  })

  it('keeps images nested in a link and retains the surrounding text', () => {
    section(
      '<p>Before <a href="https://example.test"><img src="https://example.test/image.png" alt="Chart"></a> after</p>',
    )
    const { document } = createPdfDocument(source)
    const item = document.children[0].children[0].children[0].children[0]
    expect(item.children.map((child) => child.kind.type)).toEqual(['Text', 'Image', 'Text'])
    expect(item.children[1]).toMatchObject({
      kind: { type: 'Image', src: 'https://example.test/image.png' },
      alt: 'Chart',
      href: 'https://example.test',
    })
  })

  it('lays out table text and a horizontal rule', async () => {
    section(
      '<p>BeforeRule</p><hr><table><thead><tr><th>Skill</th><th>Level</th></tr></thead><tbody><tr><td>TypeScript</td><td>Advanced</td></tr></tbody></table>',
    )
    const { layout, warnings } = await render()
    expect(warnings).toEqual([])
    const page = layout.pages[0]
    const text = textLines(page.elements).map((line) => line.textContent)
    expect(text).toEqual(
      expect.arrayContaining(['BeforeRule', 'Skill', 'Level', 'TypeScript', 'Advanced']),
    )
    expect(
      page.elements.flatMap(function descendants(element): ElementInfo[] {
        return [element, ...element.children.flatMap(descendants)]
      }),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ nodeType: 'View', height: 0.75 })]))
  })

  it.each([
    ['ul', '•'],
    ['ol', '12.'],
  ])('keeps the %s marker with its text at a page boundary', async (tag, marker) => {
    const before = Array.from(
      { length: 31 },
      (_, index) => `<p style="margin:0">Before ${index}</p>`,
    ).join('')
    const items = Array.from(
      { length: 12 },
      (_, index) =>
        `<li style="margin:0">Entry ${index} ${'Detailed example of a result in this role. '.repeat(3)}</li>`,
    ).join('')
    section(
      `${before}<${tag} style="margin:0;padding:0 0 0 20px">${items}</${tag}><p style="margin:0">After all items</p>`,
    )
    const { layout } = await render()
    const pages = layout.pages.map((page) =>
      textLines(page.elements)
        .map((line) => line.textContent?.trim())
        .filter(Boolean),
    )
    expect(pages).toHaveLength(2)
    const continuation = pages[1]
    expect(continuation.some((line) => line?.startsWith('Entry 11'))).toBe(true)
    expect(continuation).toContain(marker)
    expect(continuation).toContain('After all items')
  })

  it('wraps long secondary fields within a two-column row', async () => {
    section(`<div style="display:flex;flex-direction:row;justify-content:space-between">
      <div>Senior Engineer</div>
      <div style="flex-shrink:0">${'LongLocation '.repeat(18)}LastLocation</div>
    </div>`)
    const { layout } = await render()
    const lines = layout.pages.flatMap((page) => textLines(page.elements))
    const text = lines
      .map((line) => line.textContent)
      .join(' ')
      .replace(/\s+/g, ' ')
    expect(text).toContain('Senior Engineer')
    expect(text).toContain('LastLocation')
    for (const line of lines) {
      expect(line.x).toBeGreaterThanOrEqual(13.5)
      expect(line.x + line.width).toBeLessThanOrEqual(582)
    }
  })
})
