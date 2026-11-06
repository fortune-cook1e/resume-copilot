import { init, renderSerializedDocWithLayout, type ElementInfo } from '@formepdf/core/worker'
import type { FormeDocument } from '@formepdf/react'
import type { PdfResult, PreviewBox } from './document'
import { registerPdfFonts } from './fonts'

// Turbopack's Worker bootstrap uses a blob URL. Resolve the hashed asset
// against the app origin so the Worker can fetch it.
const wasm = new URL('@formepdf/core/pkg-web/forme_bg.wasm', import.meta.url)
const wasmUrl = new URL(wasm.toString(), self.location.origin)

function visit(elements: ElementInfo[], apply: (element: ElementInfo) => void) {
  for (const element of elements) {
    apply(element)
    visit(element.children, apply)
  }
}

self.onmessage = async ({ data }: MessageEvent<{ id: number; document: FormeDocument }>) => {
  try {
    const document = data.document
    await Promise.all([init(wasmUrl), registerPdfFonts(document)])
    const render = () => renderSerializedDocWithLayout({ ...document })
    let result = await render()
    const oversized = new Set<number>()
    for (const page of result.layout.pages) {
      visit(page.elements, (element) => {
        const name = element.sourceLocation?.file
        if (
          name?.startsWith('section:') &&
          element.height > page.contentHeight &&
          element.height < 100000
        )
          oversized.add(Number(name.slice('section:'.length)))
      })
    }
    const sections = document.children[0].children
    const restoredFlow = sections.filter(
      (section, index) => oversized.has(index) && section.style.wrap === false,
    )
    if (restoredFlow.length) {
      for (const section of restoredFlow) delete section.style.wrap
      result = await render()
    }

    if (
      !result.layout.pages.length ||
      result.warnings.some((warning) => /did not render|was rendered as "\?"/i.test(warning))
    )
      throw new Error('The PDF font could not render some of the text.')

    const boxes = result.layout.pages.map((page) => {
      const targets = new Map<number, PreviewBox>()
      visit(page.elements, (element) => {
        const { x, y, width, height } = element
        if (
          element.nodeType === 'TextLine' &&
          element.textContent?.trim() &&
          (!Number.isFinite(x + y + width + height) ||
            x < -0.5 ||
            y < -0.5 ||
            x + width > page.width + 0.5 ||
            y + height > page.height + 0.5)
        )
          throw new Error('PDF text falls outside the page.')
        const name = element.sourceLocation?.file
        if (!name?.startsWith('target:')) return
        if (x < 0 || y < 0 || x >= page.width || y >= page.height || width <= 0 || height <= 0)
          return
        const target = Number(name.slice('target:'.length))
        const box = targets.get(target)
        const left = Math.min(x, box?.x ?? x)
        const top = Math.min(y, box?.y ?? y)
        targets.set(target, {
          target,
          x: left,
          y: top,
          width: Math.min(page.width, Math.max(x + width, box ? box.x + box.width : 0)) - left,
          height: Math.min(page.height, Math.max(y + height, box ? box.y + box.height : 0)) - top,
        })
      })
      return Array.from(targets.values())
    })
    const bytes = Uint8Array.from(result.pdf)
    const response: PdfResult & { id: number } = { id: data.id, bytes, boxes }
    self.postMessage(response, { transfer: [bytes.buffer] })
  } catch {
    self.postMessage({ id: data.id, failed: true })
  }
}
