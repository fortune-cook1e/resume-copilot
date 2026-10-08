import { createId } from '@paralleldrive/cuid2';
import type { Modules, ResumeData, ResumeEntry, SectionType } from '@/types/resume';
import { defaultEducation } from '@/types/resume/modules/education';
import { defaultExperience } from '@/types/resume/modules/experience';
import { defaultProjects } from '@/types/resume/modules/projects';
import { defaultSkills } from '@/types/resume/modules/skills';
import { defaultCustom } from '@/types/resume/modules/custom';

export const sectionCatalog: Record<SectionType, { title: string; singular: string; primary: string; fields: { key: string; label: string }[] }> = {
  summary: { title: 'Summary', singular: 'text', primary: 'summary', fields: [] },
  profiles: { title: 'Profiles', singular: 'profile', primary: 'network', fields: [{ key: 'network', label: 'Network' }, { key: 'username', label: 'Username' }] },
  experience: { title: 'Experience', singular: 'experience', primary: 'company', fields: [{ key: 'company', label: 'Company' }, { key: 'position', label: 'Position' }] },
  education: { title: 'Education', singular: 'education', primary: 'university', fields: [{ key: 'university', label: 'School' }, { key: 'major', label: 'Degree / Area of study' }] },
  projects: { title: 'Projects', singular: 'project', primary: 'name', fields: [{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }] },
  skills: { title: 'Skills', singular: 'skill', primary: 'name', fields: [{ key: 'name', label: 'Name' }] },
  languages: { title: 'Languages', singular: 'language', primary: 'language', fields: [{ key: 'language', label: 'Language' }, { key: 'fluency', label: 'Fluency' }] },
  interests: { title: 'Interests', singular: 'interest', primary: 'name', fields: [{ key: 'name', label: 'Name' }] },
  awards: { title: 'Awards', singular: 'award', primary: 'title', fields: [{ key: 'title', label: 'Title' }, { key: 'awarder', label: 'Awarder' }] },
  certifications: { title: 'Certifications', singular: 'certification', primary: 'title', fields: [{ key: 'title', label: 'Title' }, { key: 'issuer', label: 'Issuer' }] },
  publications: { title: 'Publications', singular: 'publication', primary: 'title', fields: [{ key: 'title', label: 'Title' }, { key: 'publisher', label: 'Publisher' }] },
  volunteer: { title: 'Volunteer', singular: 'volunteering', primary: 'organization', fields: [{ key: 'organization', label: 'Organization' }] },
  references: { title: 'References', singular: 'reference', primary: 'name', fields: [{ key: 'name', label: 'Name' }, { key: 'position', label: 'Position' }, { key: 'phone', label: 'Phone' }] },
};
export type SectionId = keyof Modules;
export const legacyOrder: SectionId[] = ['education', 'projects', 'skills', 'experience'];

export function getSectionOrder(resume: ResumeData): SectionId[] {
  const ids = [...(resume.sectionOrder ?? legacyOrder), ...Object.keys(resume.modules)];
  return [...new Set(ids)].filter((id): id is SectionId => !!resume.modules[id as SectionId]);
}
export function getSectionType(id: SectionId, section: NonNullable<Modules[SectionId]>): SectionType | 'custom' {
  return 'type' in section && section.type ? section.type : id in sectionCatalog ? id as SectionType : 'custom';
}
export function entryText(item: ResumeEntry, key: string): string {
  const value = (item as unknown as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}
export function entryTitle(item: ResumeEntry, type: SectionType | 'custom') {
  const title = entryText(item, type === 'custom' ? 'name' : sectionCatalog[type].primary);
  return title || `Untitled ${type === 'custom' ? 'entry' : sectionCatalog[type].singular}`;
}
export function entrySubtitle(item: ResumeEntry, type: SectionType | 'custom') {
  const fields = type === 'custom' ? ['description'] : sectionCatalog[type].fields.slice(1).map(field => field.key);
  return [...fields, 'location', 'date'].map(key => entryText(item, key)).filter(Boolean).join(' · ') || ('keywords' in item ? item.keywords.join(', ') : '');
}
export function createEntry(type: SectionType | 'custom'): ResumeEntry {
  const base = { id: createId(), visible: true };
  const website = { icon: '', label: '', link: '' };
  switch (type) {
    case 'education': return { ...structuredClone(defaultEducation), ...base };
    case 'experience': return { ...structuredClone(defaultExperience), ...base };
    case 'projects': return { ...structuredClone(defaultProjects), ...base };
    case 'skills': return { ...structuredClone(defaultSkills), ...base };
    case 'profiles': return { ...base, network: '', username: '', website };
    case 'languages': return { ...base, language: '', fluency: '', rating: 0 };
    case 'interests': return { ...base, name: '', keywords: [] };
    case 'awards': return { ...base, title: '', awarder: '', date: '', website, summary: '' };
    case 'certifications': return { ...base, title: '', issuer: '', date: '', website, summary: '' };
    case 'publications': return { ...base, title: '', publisher: '', date: '', website, summary: '' };
    case 'volunteer': return { ...base, organization: '', location: '', date: '', website, summary: '' };
    case 'references': return { ...base, name: '', position: '', phone: '', website, summary: '' };
    case 'summary': return { ...base, summary: '' };
    default: return { ...structuredClone(defaultCustom), ...base };
  }
}
