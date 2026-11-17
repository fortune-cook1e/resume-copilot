import type { ResumeData, ResumeEntry, ResumeListPreview } from '@resume-copilot/contracts'

function text(value: string, max: number) {
  const plain = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|\u00a0/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain
}

function entryPreview(entry: ResumeEntry) {
  const titleFields = [
    'company',
    'university',
    'name',
    'title',
    'organization',
    'network',
    'language',
  ]
  const detailFields = [
    'position',
    'major',
    'description',
    'awarder',
    'issuer',
    'publisher',
    'username',
    'fluency',
    'summary',
  ]
  const fields = Object.entries(entry)
  const firstText = (keys: string[], max: number) => {
    for (const key of keys) {
      const field = fields.find(([name]) => name === key)?.[1]
      if (typeof field !== 'string') continue
      const result = text(field, max)
      if (result) return result
    }
    return ''
  }
  return {
    title: firstText(titleFields, 96),
    detail:
      firstText(detailFields, 160) ||
      ('keywords' in entry ? text(entry.keywords.join(', '), 160) : ''),
  }
}

export function resumeListPreview(data: ResumeData): ResumeListPreview {
  const { name, headline, location } = data.basics
  const sections: ResumeListPreview['sections'] = []
  const order = data.sectionOrder ?? ['education', 'projects', 'skills', 'experience']
  for (const id of new Set([...order, ...Object.keys(data.modules)])) {
    const section = data.modules[id as keyof ResumeData['modules']]
    if (!section?.visible) continue
    const entries = []
    for (const item of section.items) {
      if (!item.visible) continue
      const entry = entryPreview(item)
      if (entry.title || entry.detail) entries.push(entry)
      if (entries.length === 2) break
    }
    if (!entries.length && 'content' in section && section.content) {
      const detail = text(section.content, 160)
      if (detail) entries.push({ title: '', detail })
    }
    if (!entries.length) continue
    if (section.startOnNewPage) break
    sections.push({ name: text(section.name, 64), entries })
    if (sections.length === 3) break
  }

  return {
    name: text(name, 96),
    headline: text(headline, 96),
    location: text(location, 96),
    themeColor: data.design?.themeColor,
    sections,
  }
}
