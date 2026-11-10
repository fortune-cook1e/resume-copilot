import { defaultItem, defaultUrl } from '../common'
import { defaultCustom } from './custom'
import { defaultEducation } from './education'
import { defaultExperience } from './experience'
import { defaultProjects } from './projects'
import { defaultSkills } from './skills'

export const defaultResumeEntries = {
  education: defaultEducation,
  experience: defaultExperience,
  projects: defaultProjects,
  skills: defaultSkills,
  custom: defaultCustom,
  profiles: { ...defaultItem, network: '', username: '', website: defaultUrl },
  languages: { ...defaultItem, language: '', fluency: '', rating: 0 },
  interests: { ...defaultItem, name: '', keywords: [] },
  awards: { ...defaultItem, title: '', awarder: '', date: '', website: defaultUrl, summary: '' },
  certifications: {
    ...defaultItem,
    title: '',
    issuer: '',
    date: '',
    website: defaultUrl,
    summary: '',
  },
  publications: {
    ...defaultItem,
    title: '',
    publisher: '',
    date: '',
    website: defaultUrl,
    summary: '',
  },
  volunteer: {
    ...defaultItem,
    organization: '',
    location: '',
    date: '',
    website: defaultUrl,
    summary: '',
  },
  references: {
    ...defaultItem,
    name: '',
    position: '',
    phone: '',
    website: defaultUrl,
    summary: '',
  },
  summary: { ...defaultItem, summary: '' },
}
