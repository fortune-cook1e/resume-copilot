import type { FormeDocument, FormeNode, FormeStyle } from '@formepdf/react'
import { resumeFontSources } from '../../ResumeDocument/font-sources'

const chineseFamily = 'Noto Sans SC'
const han = /\p{Script=Han}|[\u3000-\u303f\uff00-\uffef]/u
const cache = new Map<string, Promise<string>>()

async function loadFont(source: string) {
  const response = await fetch(new URL(source, self.location.origin))
  if (!response.ok || !response.body) throw new Error('Could not load a PDF font.')
  const bytes = source.endsWith('.gz')
    ? await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
    : await response.arrayBuffer()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      typeof reader.result === 'string' ? resolve(reader.result) : reject(reader.error)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(new Blob([bytes], { type: 'font/ttf' }))
  })
}

function cachedFont(source: string) {
  let font = cache.get(source)
  if (!font) {
    font = loadFont(source).catch((error) => {
      cache.delete(source)
      throw error
    })
    cache.set(source, font)
  }
  return font
}

export async function registerPdfFonts(document: FormeDocument) {
  const styles: FormeStyle[] = document.defaultStyle ? [document.defaultStyle] : []
  let needsChinese = false
  const visit = (block: FormeNode) => {
    styles.push(block.style)
    const { kind } = block
    if (kind.type === 'Text' || kind.type === 'Heading') {
      needsChinese ||= han.test(kind.content)
      for (const run of kind.runs ?? []) {
        needsChinese ||= han.test(run.content)
        if (run.style) styles.push(run.style)
      }
    }
    block.children.forEach(visit)
  }
  document.children.forEach(visit)

  const faces = new Map<string, { family: string; weight: number; italic: boolean }>()
  for (const style of styles) {
    const family = style.fontFamily
    const sources = family && resumeFontSources.get(family)
    if (family && sources) {
      const weight = (style.fontWeight ?? 400) >= 600 ? 700 : 400
      const italic = style.fontStyle === 'Italic' || style.fontStyle === 'Oblique'
      const source = sources[italic ? (`${weight}italic` as const) : weight]
      faces.set(source, { family, weight, italic })
    }
    if (needsChinese && style.fontFamily) style.fontFamily = `${style.fontFamily}, ${chineseFamily}`
  }
  if (needsChinese)
    faces.set('/fonts/NotoSansSC-Regular.ttf.gz', {
      family: chineseFamily,
      weight: 400,
      italic: false,
    })

  if (faces.size) {
    document.fonts = await Promise.all(
      Array.from(faces, async ([source, face]) => ({ ...face, src: await cachedFont(source) })),
    )
  }
}
