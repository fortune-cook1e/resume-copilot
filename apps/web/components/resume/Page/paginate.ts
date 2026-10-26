type Boundary = { node: Node; offset: number }

// Measure real, styled DOM in the page's fixed A4 content area. Range fragments
// retain ancestor markup (including inline links), even within one text node.
// This derived DOM is owned by Page, outside React's source document tree.
export function paginate(documentElement: HTMLElement, target: HTMLElement) {
  const source = documentElement.cloneNode(true) as HTMLElement
  for (const section of source.querySelectorAll('[data-pagination-section]')) {
    const printable = Array.from(section.querySelectorAll('[data-preview-section]')).some((block) =>
      block.textContent?.trim(),
    )
    if (!printable) section.remove()
  }
  // Explicit item values survive Range splitting an ordered list mid-way.
  // Annotate only the detached snapshot, never React's source DOM.
  for (const list of source.querySelectorAll('ol')) {
    let value = list.hasAttribute('start') ? list.start : list.reversed ? list.children.length : 1
    for (const item of list.children) {
      if (!(item instanceof HTMLLIElement)) continue
      if (item.hasAttribute('value')) value = item.value
      item.value = value
      value += list.reversed ? -1 : 1
    }
  }
  const texts: { node: Text; start: number; end: number }[] = []
  const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT)
  let length = 0
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text
    if (!text.length) continue
    texts.push({ node: text, start: length, end: length + text.length })
    length += text.length
  }
  const boundary = (position: number, end = false): Boundary => {
    if (position === 0) return { node: source, offset: 0 }
    if (position === length) return { node: source, offset: source.childNodes.length }
    const text =
      texts.find((text) => (end ? position <= text.end : position < text.end)) ?? texts.at(-1)!
    return { node: text.node, offset: position - text.start }
  }
  const fragment = (start: number, end: number) => {
    const range = document.createRange()
    const from = boundary(start),
      to = boundary(end, true)
    range.setStart(from.node, from.offset)
    range.setEnd(to.node, to.offset)
    let result: Node = range.cloneContents()
    let ancestor: Node | null = range.commonAncestorContainer
    if (ancestor.nodeType === Node.TEXT_NODE) ancestor = ancestor.parentNode
    while (ancestor && ancestor !== source) {
      const wrapper = ancestor.cloneNode(false)
      wrapper.appendChild(result)
      result = wrapper
      ancestor = ancestor.parentNode
    }
    return result
  }

  target.replaceChildren()
  const breaks = Array.from(source.querySelectorAll('[data-start-on-new-page="true"]'))
    .map((section) => texts.find((text) => section.contains(text.node))?.start)
    .filter((position): position is number => position !== undefined)
  let start = 0
  do {
    const page = document.createElement('section')
    page.className = 'resume-page'
    page.setAttribute('role', 'region')
    page.setAttribute('aria-label', `Page ${target.children.length + 1}`)
    const content = document.createElement('div')
    content.className = 'resume-page-content space-y-4'
    page.appendChild(content)
    target.appendChild(page)
    if (!length) break

    const fits = (end: number) => {
      content.replaceChildren(fragment(start, end))
      return content.scrollHeight <= content.clientHeight
    }
    const limit = breaks.find((position) => position > start) ?? length
    let end = limit
    if (!fits(end)) {
      let low = start,
        high = limit
      while (low < high) {
        const middle = Math.ceil((low + high) / 2)
        if (fits(middle)) low = middle
        else high = middle - 1
      }
      end = low
      // Prefer a word boundary. A long unbroken token can still wrap at a
      // character boundary; never retry an empty page indefinitely.
      const text = texts.find((text) => end > text.start && end <= text.end)
      if (text && end < text.end) {
        const prefix = text.node.data.slice(0, end - text.start)
        const whitespace = prefix.search(/\s+\S*$/u)
        const wordEnd = whitespace >= 0 ? text.start + whitespace + 1 : text.start
        if (wordEnd > start) end = wordEnd
        const cluster = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
          .segment(text.node.data)
          .containing(end - text.start)
        if (cluster) end = text.start + cluster.index
      }
    }
    if (end <= start) throw new Error('Resume content cannot fit within a page')
    fits(end)
    start = end
  } while (start < length)
}
