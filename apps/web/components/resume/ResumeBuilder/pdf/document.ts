import {
  mapStyle,
  type FormeDocument,
  type FormeNode,
  type FormeStyle,
  type Style,
  type TextRun,
} from '@formepdf/react'
import type { EditorSelection } from '@/types/resume/editor'

export type PreviewTarget = EditorSelection & { label: string }
export type PdfDocument = {
  document: FormeDocument
  targets: PreviewTarget[]
}
export type PreviewBox = { target: number; x: number; y: number; width: number; height: number }
export type PdfResult = { bytes: Uint8Array<ArrayBuffer>; boxes: PreviewBox[][] }

const POINTS_PER_PIXEL = 0.75
const margin = { top: 18, right: 14, bottom: 18, left: 14 }
const a4 = { size: 'A4', margin, wrap: true } as const
const inlineTags = new Set([
  'A',
  'B',
  'BR',
  'CODE',
  'DEL',
  'EM',
  'I',
  'IMG',
  'S',
  'SPAN',
  'STRONG',
  'U',
])
type InlineContent = TextRun | FormeNode

function points(value: string) {
  return (Number.parseFloat(value) || 0) * POINTS_PER_PIXEL
}

function safeHref(element: Element) {
  const value = element.getAttribute('href')?.trim()
  return value && /^(https?:|mailto:|tel:)/i.test(value) ? value : undefined
}

function visibleStyle(element: Element) {
  const css = getComputedStyle(element)
  if (element.hasAttribute('hidden') || css.display === 'none' || css.visibility === 'hidden')
    return
  return css
}

function hasPrintableTarget(block: FormeNode): boolean {
  return (
    (!!block.sourceLocation &&
      (block.kind.type === 'Text' ||
        block.kind.type === 'Image' ||
        (block.kind.type === 'View' && !!block.style.backgroundColor))) ||
    block.children.some(hasPrintableTarget)
  )
}

function node(
  kind: FormeNode['kind'],
  style: FormeStyle,
  children: FormeNode[] = [],
  file?: string,
): FormeNode {
  return {
    kind,
    style,
    children,
    ...(file ? { sourceLocation: { file, line: 1, column: 1 } } : {}),
  }
}

function image(element: HTMLImageElement, href?: string, file?: string): FormeNode {
  const source = element.getAttribute('src')?.trim()
  const url = source && new URL(source, element.baseURI)
  if (
    !url ||
    !(/^(https?:)$/.test(url.protocol) || /^data:image\/(png|jpe?g);base64,/i.test(source ?? ''))
  )
    throw new Error('The PDF could not embed this image.')
  return {
    ...node({ type: 'Image', src: url.href }, {}, [], file),
    alt: element.alt || undefined,
    href,
  }
}

const iconCache = new Map<string, Promise<string>>()

// Forme can misplace segments of compound paths. Draw the trusted contact icons
// with the browser at four pixels per PDF point and reuse them between edits.
export async function embedPdfIcons(block: FormeNode): Promise<void> {
  const { kind } = block
  if (kind.type === 'Svg') {
    const width = Math.ceil(kind.width * 4)
    const height = Math.ceil(kind.height * 4)
    const viewBox = kind.view_box || `0 0 ${kind.width} ${kind.height}`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">${kind.content}</svg>`
    let source = iconCache.get(svg)
    if (!source) {
      source = (async () => {
        const icon = new Image()
        icon.src = `data:image/svg+xml,${encodeURIComponent(svg)}`
        await icon.decode()
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Could not rasterize the PDF icon.')
        context.drawImage(icon, 0, 0)
        return canvas.toDataURL()
      })().catch((error) => {
        iconCache.delete(svg)
        throw error
      })
      iconCache.set(svg, source)
    }
    block.kind = { type: 'Image', src: await source, width: kind.width, height: kind.height }
  }
  await Promise.all(block.children.map(embedPdfIcons))
}

// The existing resume template determines section order, visibility, rich text and labels.
// Convert its supported elements to PDF primitives without measuring DOM page boundaries.
export function createPdfDocument(source: HTMLElement): PdfDocument {
  const targets: PreviewTarget[] = []
  const colors = new Map<string, FormeStyle['color']>()
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  const color = (css: string) => {
    if (context && !colors.has(css)) {
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = css
      context.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
      colors.set(css, { r: r / 255, g: g / 255, b: b / 255, a: a / 255 })
    }
    return colors.get(css)
  }
  const textStyle = (css: CSSStyleDeclaration): FormeStyle => ({
    ...mapStyle({
      fontFamily: css.getPropertyValue('--resume-pdf-font').trim() || undefined,
      fontSize: points(css.fontSize),
      fontWeight: Number(css.fontWeight) || 400,
      fontStyle: css.fontStyle as Style['fontStyle'],
      lineHeight: Number.parseFloat(css.lineHeight) / Number.parseFloat(css.fontSize) || 1.35,
      textAlign: (css.textAlign === 'start' ? 'left' : css.textAlign) as Style['textAlign'],
      textDecoration: css.textDecorationLine as Style['textDecoration'],
    }),
    color: color(css.color),
  })

  const runs = (
    children: NodeListOf<ChildNode>,
    href?: string,
    style?: FormeStyle,
    file?: string,
  ): InlineContent[] =>
    Array.from(children).flatMap((child): InlineContent[] => {
      if (child.nodeType === Node.TEXT_NODE)
        return [{ content: child.textContent ?? '', href, style }]
      if (!(child instanceof HTMLElement)) return []
      const css = visibleStyle(child)
      if (!css) return []
      if (child.tagName === 'BR') return [{ content: '\n', href, style }]
      if (child instanceof HTMLImageElement) return [image(child, href, file)]
      return runs(child.childNodes, safeHref(child) ?? href, textStyle(css), file)
    })

  const convert = (element: Element, target?: number): FormeNode[] => {
    const css = visibleStyle(element)
    if (!css) return []
    if (element instanceof HTMLElement && element.dataset.previewSection) {
      const { previewSection, previewItem, previewLabel } = element.dataset
      target =
        targets.push({
          sectionId: previewSection as EditorSelection['sectionId'],
          itemId: previewItem,
          label: previewLabel ?? previewSection,
        }) - 1
    }
    const file = target === undefined ? undefined : `target:${target}`
    const spacing = {
      margin: {
        top: points(css.marginTop),
        right: points(css.marginRight),
        bottom: points(css.marginBottom),
        left: points(css.marginLeft),
      },
      padding: {
        top: points(css.paddingTop),
        right: points(css.paddingRight),
        bottom: points(css.paddingBottom),
        left: points(css.paddingLeft),
      },
    }
    const flexSizing: FormeStyle = Number(css.flexGrow)
      ? { flexGrow: Number(css.flexGrow), width: { Pt: points(css.width) } }
      : {}
    if (element instanceof SVGSVGElement) {
      const width = points(css.width)
      const height = points(css.height)
      if (!width || !height) return []
      // SVG in a PDF has no inherited currentColor or CSS color space context.
      const stroke = color(css.color)
      const ink = stroke
        ? `rgb(${Math.round(stroke.r * 255)},${Math.round(stroke.g * 255)},${Math.round(stroke.b * 255)})`
        : '#404040'
      const content = element.innerHTML.replaceAll('currentColor', ink)
      return [
        node(
          {
            type: 'Svg',
            width,
            height,
            view_box: element.getAttribute('viewBox') ?? undefined,
            content: `<g fill="${(element.getAttribute('fill') || 'none').replace('currentColor', ink)}" stroke="${ink}" stroke-width="${element.getAttribute('stroke-width') || '2'}" stroke-linecap="${element.getAttribute('stroke-linecap') || 'round'}" stroke-linejoin="${element.getAttribute('stroke-linejoin') || 'round'}">${content}</g>`,
          },
          { flexShrink: 0 },
          [],
          file,
        ),
      ]
    }
    if (!(element instanceof HTMLElement)) return []
    const children = Array.from(element.children)
    const tag = element.tagName
    const text = (segments: TextRun[], style: FormeStyle): FormeNode[] => {
      if (!segments.some((run) => run.content.trim())) return []
      const plain = segments.length === 1 && !segments[0].href && !segments[0].style
      return [
        node(
          {
            type: 'Text',
            content: plain ? segments[0].content : '',
            runs: plain ? undefined : segments,
          },
          style,
          [],
          file,
        ),
      ]
    }
    const inlineNodes = (content: InlineContent[], style: FormeStyle) => {
      const result: FormeNode[] = []
      let segments: TextRun[] = []
      for (const item of content) {
        if ('kind' in item) {
          result.push(...text(segments, style), item)
          segments = []
        } else {
          segments.push(item)
        }
      }
      return [...result, ...text(segments, style)]
    }
    const convertChildren = () => {
      const result: FormeNode[] = []
      let inline: InlineContent[] = []
      for (const child of element.childNodes) {
        if (child instanceof Element && !inlineTags.has(child.tagName)) {
          result.push(...inlineNodes(inline, textStyle(css)), ...convert(child, target))
          inline = []
        } else if (child.nodeType === Node.TEXT_NODE) {
          inline.push({ content: child.textContent ?? '' })
        } else if (child instanceof HTMLElement) {
          const inlineStyle = visibleStyle(child)
          if (!inlineStyle) continue
          if (child instanceof HTMLImageElement) inline.push(image(child, undefined, file))
          else if (child.tagName === 'BR') inline.push({ content: '\n' })
          else inline.push(...runs(child.childNodes, safeHref(child), textStyle(inlineStyle), file))
        }
      }
      return [...result, ...inlineNodes(inline, textStyle(css))]
    }
    if (element instanceof HTMLImageElement) return [image(element, undefined, file)]
    if (tag === 'HR')
      return [
        node(
          { type: 'View' },
          {
            ...spacing,
            height: { Pt: 0.75 },
            backgroundColor: { r: 0.7, g: 0.7, b: 0.7, a: 1 },
          },
          [],
          file,
        ),
      ]
    if (element instanceof HTMLTableElement) {
      const rows = Array.from(element.rows).filter(
        (row) => visibleStyle(row) && visibleStyle(row.parentElement!),
      )
      const columnCount = Math.max(
        0,
        ...rows.map((row) =>
          Array.from(row.cells).reduce((count, cell) => count + cell.colSpan, 0),
        ),
      )
      if (!columnCount) return []
      const tableRows = rows.map((row) =>
        node(
          { type: 'TableRow', is_header: row.parentElement?.tagName === 'THEAD' },
          {},
          Array.from(row.cells)
            .filter(visibleStyle)
            .map((cell) =>
              node(
                { type: 'TableCell', col_span: cell.colSpan, row_span: cell.rowSpan || 1 },
                { padding: { top: 3, right: 4, bottom: 3, left: 4 } },
                convert(cell, target),
              ),
            ),
        ),
      )
      return [
        node(
          {
            type: 'Table',
            columns: Array.from({ length: columnCount }, () => ({
              width: { Fraction: 1 / columnCount },
            })),
          },
          spacing,
          tableRows,
          file,
        ),
      ]
    }
    if (tag === 'UL' || tag === 'OL') {
      const items = children.filter(
        (child): child is HTMLLIElement => child instanceof HTMLLIElement && !!visibleStyle(child),
      )
      const ordered = element instanceof HTMLOListElement
      const step = ordered && element.reversed ? -1 : 1
      let number =
        ordered && element.hasAttribute('start') ? element.start : step < 0 ? items.length : 1
      const rows = items.flatMap((item) => {
        if (ordered && item.hasAttribute('value')) number = item.value
        const start = number
        number += step
        const [content] = convert(item, target)
        if (!content?.children.length) return []
        const listStyle = textStyle(css)
        // Forme 0.28 subtracts the marker gutter when drawing, but its
        // generic ListItem height measurement only subtracts padding.
        const markerLength = ordered ? `${start}.`.length : 1
        const { top = 0, right = 0, bottom = 0 } = content.style.padding ?? {}
        content.style.padding = {
          top,
          right,
          bottom,
          left: markerLength * (listStyle.fontSize ?? 10.5) * 0.6 + 6,
        }
        // Forme can paginate a native list marker separately from its text.
        // Give each item a whole-row boundary, while allowing very tall rows to flow.
        const list = node(
          { type: 'List', ordered, marker_type: ordered ? 'decimal' : 'disc', start },
          listStyle,
          [content],
        )
        return [node({ type: 'View' }, { wrap: false }, [list])]
      })
      return rows.length
        ? [
            node(
              { type: 'View' },
              {
                ...spacing,
                padding: { ...spacing.padding, left: 0 },
              },
              rows,
            ),
          ]
        : []
    }
    if (tag === 'LI') {
      return [
        node({ type: 'ListItem' }, { ...textStyle(css), ...spacing }, convertChildren(), file),
      ]
    }
    if (children.every((child) => inlineTags.has(child.tagName))) {
      return inlineNodes(runs(element.childNodes, safeHref(element), undefined, file), {
        ...textStyle(css),
        ...spacing,
        ...flexSizing,
        ...(css.flexShrink === '0' ? { flexShrink: 0 } : {}),
      })
    }
    const nested = convertChildren()
    if (!nested.length) return []
    const style: FormeStyle = { ...spacing, ...flexSizing }
    if (css.display === 'flex') {
      Object.assign(
        style,
        mapStyle({
          display: 'flex',
          flexDirection: css.flexDirection as Style['flexDirection'],
          justifyContent: css.justifyContent as Style['justifyContent'],
          alignItems: css.alignItems as Style['alignItems'],
          flexWrap: css.flexWrap as Style['flexWrap'],
          rowGap: points(css.rowGap),
          columnGap: points(css.columnGap),
        }),
      )
      // Keep the main field readable when an imported date, location, or link label is long.
      if (
        css.flexDirection === 'row' &&
        css.justifyContent === 'space-between' &&
        nested.length === 2
      ) {
        const rowWidth = 595.28 - margin.left - margin.right - points(css.columnGap)
        const secondaryWidth = Math.floor(rowWidth * 0.4)
        nested[0].style.width = { Pt: rowWidth - secondaryWidth }
        nested[1].style.width = { Pt: secondaryWidth }
      }
    }
    if (css.flexShrink === '0') style.flexShrink = 0
    if (css.borderBottomStyle !== 'none' && points(css.borderBottomWidth)) {
      style.borderWidth = { top: 0, right: 0, bottom: points(css.borderBottomWidth), left: 0 }
      const stroke = color(css.borderBottomColor)
      if (stroke) style.borderColor = { top: stroke, right: stroke, bottom: stroke, left: stroke }
    }
    return [node({ type: 'View' }, style, nested)]
  }

  const children: FormeNode[] = []
  for (const section of Array.from(source.children)) {
    if (!(section instanceof HTMLElement)) continue
    const isSection = section.hasAttribute('data-pagination-section')
    const blocks = convert(section)
    if (!blocks.length || (isSection && !blocks.some(hasPrintableTarget))) continue
    children.push(
      node(
        { type: 'View' },
        {
          breakBefore: children.length > 0 && section.hasAttribute('data-start-on-new-page'),
          wrap: section.hasAttribute('data-keep-together') ? false : undefined,
        },
        blocks,
        `section:${children.length}`,
      ),
    )
  }

  // Forme discards a completely empty page. Give a blank resume one paint-free box.
  if (!children.length) children.push(node({ type: 'View' }, { height: { Pt: 1 } }))

  return {
    document: {
      children: [node({ type: 'Page', config: a4 }, {}, children)],
      defaultPage: a4,
      defaultStyle: { fontFamily: 'Helvetica', fontSize: 10.5, lineHeight: 1.4 },
      metadata: {},
    },
    targets,
  }
}
