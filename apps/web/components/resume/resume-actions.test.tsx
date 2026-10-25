import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  createResumeSchema,
  defaultResumeData,
  sectionTypes,
  updateResumeSchema,
} from '@resume-copilot/contracts'
import { createEntry } from '@/components/resume/ResumeEditor/sections'
import ModuleHeader from '@/components/resume/ResumeEditor/components/ModuleHeader'
import { useResumeStore } from '@/stores/resume-store'
import type { ResumeData } from '@resume-copilot/contracts'
import { ResumeCard } from '@/components/dashboard/ResumeCard'
import { ResumeDialog } from '@/components/dashboard/ResumeDialog'
import ResumesPage from '@/app/dashboard/resumes/page'
import RichTextEditor from '@/components/resume/ResumeEditor/components/RichTextEditor'
import ResumeEditor from '@/components/resume/ResumeEditor'
import ResumeDocument from '@/components/resume/ResumeDocument'
import type { EditorSelection } from '@/types/resume/editor'
import { resumeDataSchema as editorDataSchema } from '@resume-copilot/contracts'

const api = vi.hoisted(() => ({
  update: vi.fn(),
  remove: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
  userId: 'resume-owner',
}))
vi.mock('@/services/resume', () => ({
  updateResume: api.update,
  deleteResume: api.remove,
  createResume: api.create,
  getResumes: api.list,
}))
vi.mock('@/lib/auth-client', () => ({ useSession: () => ({ data: { user: { id: api.userId } } }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  api.update.mockResolvedValue(undefined)
  api.userId = 'resume-owner'
})

afterEach(() => {
  cleanup()
  useResumeStore.getState().reset()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

it('retains print order through the save contract while accepting documents without ordering metadata', () => {
  const data = {
    ...structuredClone(defaultResumeData),
    sectionOrder: ['experience', 'education', 'skills', 'projects'],
  }
  expect(updateResumeSchema.parse({ data }).data).toEqual(data)
  expect(updateResumeSchema.parse({ data: defaultResumeData }).data).toEqual(defaultResumeData)
  expect(editorDataSchema.parse(data)).toEqual(data)
  expect(editorDataSchema.parse(defaultResumeData)).toEqual(defaultResumeData)
})

it('rejects malformed module data at the shared save boundary', () => {
  const invalidDocuments = [
    { ...structuredClone(defaultResumeData), basics: { ...defaultResumeData.basics, name: 123 } },
    {
      ...structuredClone(defaultResumeData),
      modules: { ...defaultResumeData.modules, languages: 123 },
    },
    {
      ...structuredClone(defaultResumeData),
      modules: {
        ...defaultResumeData.modules,
        skills: {
          ...defaultResumeData.modules.skills,
          items: [{ id: 'skill', visible: true, name: 'Frontend', level: 'unknown', keywords: [] }],
        },
      },
    },
  ]
  for (const data of invalidDocuments) {
    expect(updateResumeSchema.safeParse({ data }).success).toBe(false)
  }
})

it('validates entries against their section type rather than any supported entry shape', () => {
  const profile = {
    id: 'profile',
    visible: true,
    network: 'GitHub',
    username: 'ada',
    website: { icon: '', label: '', link: '' },
  }
  const invalidModules = [
    { languages: { id: 'languages', name: 'Languages', visible: true, items: [profile] } },
    {
      'custom-languages': {
        id: 'custom-languages',
        name: 'Languages',
        visible: true,
        type: 'languages',
        items: [profile],
      },
    },
    { languages: { id: 'profiles', name: 'Languages', visible: true, items: [] } },
    {
      languages: { id: 'languages', name: 'Languages', visible: true, type: 'profiles', items: [] },
    },
    { unsupported: { id: 'unsupported', name: 'Unsupported', visible: true, items: [] } },
  ]
  for (const modules of invalidModules) {
    const data = {
      ...structuredClone(defaultResumeData),
      modules: { ...defaultResumeData.modules, ...modules },
    }
    expect(updateResumeSchema.safeParse({ data }).success).toBe(false)
  }
})

it('retains every editor section, legacy custom fields and unfinished email/URL drafts', () => {
  const data = structuredClone(defaultResumeData) as ResumeData
  data.basics.email = 'ada@'
  data.basics.website.link = 'https://'
  for (const type of sectionTypes) {
    const items = [createEntry(type)]
    Object.assign(data.modules, {
      [type]: {
        id: type,
        name: type,
        visible: true,
        type,
        items,
        ...(type === 'summary' ? { content: '<p>Draft summary</p>' } : {}),
      },
      [`custom-${type}`]: { id: `custom-${type}`, name: type, visible: true, type, items },
    })
  }
  data.modules['custom-legacy'] = {
    id: 'custom-legacy',
    name: 'Legacy',
    visible: true,
    items: [
      {
        id: 'legacy',
        visible: true,
        name: 'Original name',
        description: 'Original description',
        date: '2020',
        location: 'Stockholm',
        website: { icon: '', label: 'Link', link: 'example.' },
        summary: 'Original summary',
      },
    ],
  }
  data.modules.languages!.items = [
    { id: 'language', visible: true, language: 'Swedish', fluency: 'Professional' },
  ]
  expect(createResumeSchema.parse({ data }).data).toEqual(data)
  expect(updateResumeSchema.parse({ data }).data).toEqual(data)
  const withoutLanguages = { ...data, modules: { ...data.modules, languages: undefined } }
  expect(
    updateResumeSchema.parse({ data: withoutLanguages }).data?.modules.languages,
  ).toBeUndefined()
})

it('retains a custom section on cancel and removes it only after an accessible confirmation', async () => {
  const data = structuredClone(defaultResumeData) as ResumeData
  data.modules['custom-volunteer'] = {
    id: 'custom-volunteer',
    name: 'Volunteering',
    visible: true,
    items: [],
  }
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data })
  render(<ModuleHeader moduleId="custom-volunteer" />)
  fireEvent.keyDown(screen.getByRole('button', { name: 'Volunteering section actions' }), {
    key: 'Enter',
  })
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete section' }))
  expect(screen.getByRole('alertdialog', { name: 'Delete section?' })).toBeTruthy()
  expect(useResumeStore.getState().resume?.modules['custom-volunteer']).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(useResumeStore.getState().isDirty).toBe(false)
  fireEvent.keyDown(screen.getByRole('button', { name: 'Volunteering section actions' }), {
    key: 'Enter',
  })
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete section' }))
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Delete section' }))
  })
  expect(useResumeStore.getState().resume?.modules['custom-volunteer']).toBeUndefined()
  expect(useResumeStore.getState().isDirty).toBe(true)
})

it('cancels resume deletion without a request and retains the confirmation after an API failure', async () => {
  const onDeleted = vi.fn()
  api.remove.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined)
  render(
    <ResumeCard
      resume={{
        id: 'resume-one',
        title: 'Frontend resume',
        description: '',
        visibility: 'private',
        createdAt: '2026-10-08',
        updatedAt: '2026-10-08',
      }}
      onDeleted={onDeleted}
    />,
  )
  const openDelete = () => {
    const trigger = screen.getByRole('button', { name: 'Resume actions' })
    fireEvent.keyDown(trigger, { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
  }
  openDelete()
  expect(screen.getByRole('alertdialog', { name: 'Delete resume?' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(api.remove).not.toHaveBeenCalled()
  openDelete()
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Delete resume' }))
  })
  expect(screen.getByRole('alert').textContent).toContain('Could not delete')
  expect(onDeleted).not.toHaveBeenCalled()
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Delete resume' }))
  })
  expect(api.remove).toHaveBeenCalledTimes(2)
  expect(onDeleted).toHaveBeenCalledTimes(1)
})

it('keeps a failed creation visible and lets the user retry without re-entering the draft', async () => {
  api.create
    .mockRejectedValueOnce(new Error('private transport failure'))
    .mockResolvedValueOnce({ id: 'created-resume' })
  function CreateResume() {
    const [open, setOpen] = useState(true)
    return <ResumeDialog open={open} onOpenChange={setOpen} mode="create" />
  }
  render(<CreateResume />)
  const title = screen.getByPlaceholderText('e.g. Frontend Developer Resume')
  fireEvent.change(title, { target: { value: 'Frontend resume' } })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
  })
  expect(screen.getByRole('alert').textContent).toContain('Could not create')
  expect((title as HTMLInputElement).value).toBe('Frontend resume')
  expect(screen.queryByText('private transport failure')).toBeNull()
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
  })
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('keeps a pending creation open and prevents duplicate submissions', async () => {
  let finish!: (value: object) => void
  api.create.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  function CreateResume() {
    const [open, setOpen] = useState(true)
    return <ResumeDialog open={open} onOpenChange={setOpen} mode="create" />
  }
  render(<CreateResume />)
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Pending resume' } })
  const dialog = screen.getByRole('dialog')
  const form = dialog.querySelector('form')!
  await act(async () => {
    fireEvent.submit(form)
    fireEvent.submit(form)
  })
  expect(api.create).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  fireEvent.keyDown(dialog, { key: 'Escape' })
  expect(screen.getByRole('dialog')).toBeTruthy()
  await act(async () => finish({ id: 'created-resume' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('shows a retryable list failure instead of pretending the account has no resumes', async () => {
  vi.useRealTimers()
  api.list.mockRejectedValueOnce(new Error('private server error')).mockResolvedValueOnce([
    {
      id: 'resume-one',
      title: 'Frontend resume',
      description: '',
      visibility: 'private',
      createdAt: '2026-10-08',
      updatedAt: '2026-10-08',
    },
  ])
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  render(
    <QueryClientProvider client={client}>
      <ResumesPage />
    </QueryClientProvider>,
  )
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Could not load'))
  expect(screen.queryByText('No resumes yet')).toBeNull()
  expect(screen.queryByText('private server error')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await waitFor(() => expect(screen.getByText('Frontend resume')).toBeTruthy())
  expect(screen.queryByRole('alert')).toBeNull()
})

it('refreshes the dashboard after creating, renaming and deleting a resume without replacing its content', async () => {
  vi.useRealTimers()
  let records = [
    {
      id: 'existing',
      title: 'Existing resume',
      description: 'Original description',
      visibility: 'private' as const,
      createdAt: '2026-10-08',
      updatedAt: '2026-10-08',
    },
  ]
  api.list.mockImplementation(async () => structuredClone(records))
  api.create.mockImplementation(async (values) => {
    const created = { id: 'created', ...values, createdAt: '2026-10-08', updatedAt: '2026-10-08' }
    records = [...records, created]
    return created
  })
  api.update.mockImplementation(async (id, values) => {
    records = records.map((record) => (record.id === id ? { ...record, ...values } : record))
    return records.find((record) => record.id === id)
  })
  api.remove.mockImplementation(async (id) => {
    records = records.filter((record) => record.id !== id)
    return { id }
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  render(
    <QueryClientProvider client={client}>
      <ResumesPage />
    </QueryClientProvider>,
  )
  await waitFor(() => expect(screen.getByText('Existing resume')).toBeTruthy())
  fireEvent.click(screen.getByRole('button', { name: 'New Resume' }))
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New resume' } })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
  })
  await waitFor(() => expect(screen.getByRole('heading', { name: 'New resume' })).toBeTruthy())

  const card = screen
    .getByRole('heading', { name: 'New resume' })
    .closest('[data-slot="card"]') as HTMLElement
  fireEvent.keyDown(within(card).getByRole('button', { name: 'Resume actions' }), { key: 'Enter' })
  fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Renamed resume' } })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  })
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Renamed resume' })).toBeTruthy())
  expect(api.update).toHaveBeenCalledWith('created', {
    title: 'Renamed resume',
    description: '',
    visibility: 'private',
  })

  fireEvent.keyDown(within(card).getByRole('button', { name: 'Resume actions' }), { key: 'Enter' })
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Delete resume' }))
  })
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Renamed resume' })).toBeNull())
  expect(screen.getByRole('heading', { name: 'Existing resume' })).toBeTruthy()
})

it('does not render the previous account’s cached resume list while a different account loads', async () => {
  vi.useRealTimers()
  const first = {
    id: 'first-resume',
    title: 'First account resume',
    description: '',
    visibility: 'private',
    createdAt: '2026-10-08',
    updatedAt: '2026-10-08',
  }
  let finish!: (value: object[]) => void
  api.list.mockResolvedValueOnce([first]).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const view = render(
    <QueryClientProvider client={client}>
      <ResumesPage />
    </QueryClientProvider>,
  )
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'First account resume' })).toBeTruthy(),
  )
  api.userId = 'another-owner'
  view.rerender(
    <QueryClientProvider client={client}>
      <ResumesPage />
    </QueryClientProvider>,
  )
  expect(screen.queryByRole('heading', { name: 'First account resume' })).toBeNull()
  await act(async () => finish([{ ...first, id: 'second-resume', title: 'Second account resume' }]))
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'Second account resume' })).toBeTruthy(),
  )
  expect(screen.queryByRole('heading', { name: 'First account resume' })).toBeNull()
})

it('opens an accessible link editor and leaves the text unchanged when cancelled', () => {
  const onChange = vi.fn()
  render(<RichTextEditor value="Read more" onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: 'Link' }))
  expect(screen.getByRole('dialog', { name: 'Edit link' })).toBeTruthy()
  fireEvent.change(screen.getByRole('textbox', { name: 'URL' }), {
    target: { value: 'https://example.test' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onChange).not.toHaveBeenCalled()
})

it('adds a custom section without overwriting an existing section after a deletion', () => {
  const data = structuredClone(defaultResumeData) as ResumeData
  data.modules['custom-1'] = { id: 'custom-1', name: 'Languages', visible: true, items: [] }
  data.modules['custom-3'] = { id: 'custom-3', name: 'Volunteering', visible: true, items: [] }
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data })
  render(<EditingWorkspace />)
  addCustom('Profiles')
  expect(useResumeStore.getState().resume?.modules['custom-3'].name).toBe('Volunteering')
  expect(
    Object.keys(useResumeStore.getState().resume!.modules).filter((id) => id.startsWith('custom-')),
  ).toHaveLength(3)
})

function addCustom(type: string) {
  fireEvent.keyDown(screen.getByRole('button', { name: 'Add section' }), { key: 'Enter' })
  fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Custom section' }), { key: 'ArrowRight' })
  const menu = screen.getByText('What goes in it?').closest('[role="menu"]') as HTMLElement
  fireEvent.click(within(menu).getByRole('menuitem', { name: type }))
}

function EditingWorkspace() {
  const [selection, onSelect] = useState<EditorSelection | null>({ sectionId: 'basics' })
  return (
    <>
      <ResumeEditor selection={selection} onSelect={onSelect} />
      <div data-testid="preview">
        <ResumeDocument selection={selection} onSelect={onSelect} />
      </div>
    </>
  )
}

it('adds an immediately editable Basics field and saves plain text in the shared preview draft', async () => {
  useResumeStore.getState().initializeResume({
    id: 'draft',
    title: 'Resume',
    data: structuredClone(defaultResumeData) as ResumeData,
  })
  render(<EditingWorkspace />)
  fireEvent.click(screen.getByRole('button', { name: 'Add field' }))
  const text = screen.getByRole('textbox', { name: 'Field 1 text' })
  expect(document.activeElement).toBe(text)
  const preview = screen.getByTestId('preview')
  expect(within(preview).queryByText('Link')).toBeNull()
  fireEvent.change(text, { target: { value: 'Work authorization: EU' } })
  expect(within(preview).getByText('Work authorization: EU')).toBeTruthy()
  expect(within(preview).queryByRole('link', { name: 'Work authorization: EU' })).toBeNull()
  await act(async () => vi.advanceTimersByTimeAsync(500))
  expect(api.update).toHaveBeenLastCalledWith(
    'draft',
    expect.objectContaining({
      data: expect.objectContaining({
        basics: expect.objectContaining({
          customFields: [{ icon: 'Link', label: 'Work authorization: EU', link: '' }],
        }),
      }),
    }),
  )
})

it('keeps Basics field icons, optional links and text together when moving and deleting fields', async () => {
  const data = structuredClone(defaultResumeData) as ResumeData
  data.basics.customFields = [
    { icon: 'LegacyIcon', label: 'Legacy portfolio', link: 'https://legacy.example.com' },
    { icon: 'Mail', label: 'Contact', link: '' },
  ]
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data })
  const view = render(<EditingWorkspace />)
  const preview = screen.getByTestId('preview')
  expect(screen.getByRole('button', { name: 'Move field 1 up' }).hasAttribute('disabled')).toBe(
    true,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Choose icon for field 2' }))
  const search = screen.getByRole('textbox', { name: 'Search for an icon' })
  fireEvent.change(search, { target: { value: 'no-such-icon' } })
  expect(screen.getByText('No icons found')).toBeTruthy()
  expect(useResumeStore.getState().isDirty).toBe(false)
  fireEvent.change(search, { target: { value: 'git' } })
  expect(screen.queryByRole('button', { name: 'Mail icon' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Github icon' }))
  expect(screen.queryByRole('textbox', { name: 'Search for an icon' })).toBeNull()
  fireEvent.change(screen.getByRole('textbox', { name: 'Field 2 text' }), {
    target: { value: 'GitHub profile' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Edit link for field 2' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Field 2 URL' }), {
    target: { value: 'https://github.com/ada' },
  })
  expect(within(preview).getByRole('link', { name: 'GitHub profile' }).getAttribute('href')).toBe(
    'https://github.com/ada',
  )
  await act(async () => {
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Field 2 URL' }), { key: 'Escape' })
  })
  fireEvent.click(screen.getByRole('button', { name: 'Move field 2 up' }))
  expect((screen.getByRole('textbox', { name: 'Field 1 text' }) as HTMLInputElement).value).toBe(
    'GitHub profile',
  )
  expect(
    within(preview)
      .getAllByRole('link')
      .map((link) => link.textContent),
  ).toEqual(['GitHub profile', 'Legacy portfolio'])
  fireEvent.click(screen.getByRole('button', { name: 'Edit link for field 1' }))
  expect((screen.getByRole('textbox', { name: 'Field 1 URL' }) as HTMLInputElement).value).toBe(
    'https://github.com/ada',
  )
  fireEvent.change(screen.getByRole('textbox', { name: 'Field 1 URL' }), { target: { value: '' } })
  expect(within(preview).queryByRole('link', { name: 'GitHub profile' })).toBeNull()
  expect(within(preview).getByText('GitHub profile')).toBeTruthy()
  await act(async () => {
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Field 1 URL' }), { key: 'Escape' })
  })
  fireEvent.click(screen.getByRole('button', { name: 'Remove field 2' }))
  expect(within(preview).queryByText('Legacy portfolio')).toBeNull()
  await act(async () => vi.advanceTimersByTimeAsync(500))
  const saved = updateResumeSchema.parse(api.update.mock.lastCall![1]).data!
  expect(saved.basics.customFields).toEqual([{ icon: 'Github', label: 'GitHub profile', link: '' }])
  view.unmount()
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data: saved })
  render(<ResumeDocument />)
  expect(screen.getByText('GitHub profile')).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'GitHub profile' })).toBeNull()
})

it('offers the complete section catalog and saves a new language in the same draft used by preview and print', async () => {
  useResumeStore.getState().initializeResume({
    id: 'draft',
    title: 'Resume',
    data: structuredClone(defaultResumeData) as ResumeData,
  })
  render(<EditingWorkspace />)
  fireEvent.keyDown(screen.getByRole('button', { name: 'Add section' }), { key: 'Enter' })
  for (const title of [
    'Summary',
    'Profiles',
    'Experience',
    'Education',
    'Projects',
    'Skills',
    'Languages',
    'Interests',
    'Awards',
    'Certifications',
    'Publications',
    'Volunteer',
    'References',
  ]) {
    expect(screen.getByRole('menuitem', { name: title })).toBeTruthy()
  }
  fireEvent.click(screen.getByRole('menuitem', { name: 'Languages' }))
  fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'Swedish' } })
  fireEvent.change(screen.getByLabelText('Fluency'), { target: { value: 'Professional' } })
  expect(
    within(screen.getByTestId('preview')).getByRole('button', { name: 'Edit Swedish' }).textContent,
  ).toContain('Professional')
  await act(async () => {
    await vi.advanceTimersByTimeAsync(600)
  })
  const saved = updateResumeSchema.parse(api.update.mock.calls[0][1])
  expect(saved.data?.modules.languages).toMatchObject({
    items: [{ language: 'Swedish', fluency: 'Professional' }],
  })
})

it('keeps an unnamed entry editable but out of preview and print until content is entered', () => {
  useResumeStore.getState().initializeResume({
    id: 'draft',
    title: 'Resume',
    data: structuredClone(defaultResumeData) as ResumeData,
  })
  render(<EditingWorkspace />)
  fireEvent.keyDown(screen.getByRole('button', { name: 'Add section' }), { key: 'Enter' })
  fireEvent.click(screen.getByRole('menuitem', { name: 'Education' }))
  expect(screen.getByLabelText('School')).toBeTruthy()
  expect(within(screen.getByTestId('preview')).queryByText('Education')).toBeNull()
  fireEvent.change(screen.getByLabelText('School'), { target: { value: 'Example University' } })
  expect(within(screen.getByTestId('preview')).getByText('Education')).toBeTruthy()
})

it.each([
  ['Profiles', 'Network', 'GitHub', 'Username', 'example-dev', 'profiles'],
  ['Awards', 'Title', 'Design award', 'Awarder', 'Example Association', 'awards'],
  ['Certifications', 'Title', 'Cloud certification', 'Issuer', 'Example Academy', 'certifications'],
  ['Publications', 'Title', 'Example paper', 'Publisher', 'Example Journal', 'publications'],
  ['Volunteer', 'Organization', 'Example Foundation', 'Location', 'Stockholm', 'volunteer'],
  ['References', 'Name', 'Alex Example', 'Position', 'Engineering Manager', 'references'],
])(
  'persists %s fields and renders the saved section in the print document',
  async (title, primary, value, secondary, detail, id) => {
    useResumeStore.getState().initializeResume({
      id: 'draft',
      title: 'Resume',
      data: structuredClone(defaultResumeData) as ResumeData,
    })
    const editor = render(<EditingWorkspace />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Add section' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: title }))
    fireEvent.change(screen.getByLabelText(primary), { target: { value } })
    fireEvent.change(screen.getByLabelText(secondary), { target: { value: detail } })
    fireEvent.change(screen.getByLabelText('Website'), {
      target: { value: 'https://example.test' },
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    const saved = updateResumeSchema.parse(api.update.mock.calls[0][1]).data as ResumeData
    expect(saved.modules[id as keyof ResumeData['modules']]?.items).toHaveLength(1)
    editor.unmount()
    useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data: saved })
    const print = render(<ResumeDocument />)
    expect(within(print.container).getByText(value)).toBeTruthy()
    expect(within(print.container).getByText(detail)).toBeTruthy()
    expect(within(print.container).getByRole('link', { name: 'Link' }).getAttribute('href')).toBe(
      'https://example.test',
    )
  },
)

it('edits keyword-based custom content without changing the built-in Skills section', async () => {
  const data = structuredClone(defaultResumeData) as ResumeData
  data.modules.skills.items = [
    { id: 'skill', visible: true, name: 'Frontend', level: 'Advanced', keywords: ['React'] },
  ]
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data })
  const editor = render(<EditingWorkspace />)
  addCustom('Interests')
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Photography' } })
  fireEvent.change(screen.getByLabelText('Keywords'), { target: { value: 'Nature, Travel' } })
  fireEvent.keyDown(screen.getByLabelText('Keywords'), { key: 'Enter' })
  expect(useResumeStore.getState().resume?.modules.skills.items[0].keywords).toEqual(['React'])
  await act(async () => {
    await vi.advanceTimersByTimeAsync(600)
  })
  const saved = updateResumeSchema.parse(api.update.mock.calls[0][1]).data as ResumeData
  editor.unmount()
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data: saved })
  const print = render(<ResumeDocument />)
  expect(within(print.container).getByText('Photography')).toBeTruthy()
  expect(within(print.container).getByText('Nature · Travel')).toBeTruthy()
})

it('reorders sections and entries by keyboard, then restores their print order from the saved document', async () => {
  const data = structuredClone(defaultResumeData) as ResumeData
  data.modules.education.items = [
    {
      id: 'school',
      visible: true,
      university: 'Example University',
      major: '',
      location: '',
      date: '',
      summary: '',
    },
  ]
  data.modules.experience.items = ['First Studio', 'Second Studio'].map((company, index) => ({
    id: 'job-' + index,
    visible: true,
    company,
    position: '',
    location: '',
    date: '',
    summary: '',
  }))
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data })
  const editor = render(<EditingWorkspace />)
  fireEvent.keyDown(screen.getByRole('button', { name: 'Experience', expanded: false }), {
    key: 'ArrowUp',
    altKey: true,
  })
  expect(
    within(screen.getByTestId('preview'))
      .getAllByRole('heading', { level: 2 })
      .map((node) => node.textContent),
  ).toEqual(['Experience', 'Education'])
  fireEvent.click(screen.getByRole('button', { name: 'Toggle Experience' }))
  fireEvent.keyDown(screen.getByRole('button', { name: 'Second Studio', expanded: false }), {
    key: 'ArrowUp',
    altKey: true,
  })
  expect(
    within(screen.getByTestId('preview'))
      .getAllByRole('button')
      .map((node) => node.getAttribute('aria-label')),
  ).toEqual(['Edit basics', 'Edit Second Studio', 'Edit First Studio', 'Edit Example University'])
  await act(async () => {
    await vi.advanceTimersByTimeAsync(600)
  })
  const saved = updateResumeSchema.parse(api.update.mock.calls[0][1]).data as ResumeData
  editor.unmount()
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data: saved })
  const print = render(<ResumeDocument />)
  expect(
    within(print.container)
      .getAllByRole('heading', { level: 2 })
      .map((node) => node.textContent),
  ).toEqual(['Experience', 'Education'])
  expect(print.container.textContent!.indexOf('Second Studio')).toBeLessThan(
    print.container.textContent!.indexOf('First Studio'),
  )
  expect(print.container.querySelector('[role="button"]')).toBeNull()
})

it('selects an entry from the preview, edits the authoritative draft inline, and retains edits when switching sections', async () => {
  const data = structuredClone(defaultResumeData) as ResumeData
  data.modules.experience.items = [
    {
      id: 'job',
      visible: true,
      company: 'Example Studio',
      position: 'Engineer',
      location: '',
      date: '',
      summary: '',
    },
  ]
  data.modules.skills.items = [
    { id: 'skill', visible: true, name: 'Frontend', level: 'Advanced', keywords: ['React'] },
  ]
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data })
  render(<EditingWorkspace />)
  expect(screen.queryByLabelText('Company')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Edit Example Studio' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Updated Studio' } })
  expect(useResumeStore.getState().resume?.modules.experience.items[0].company).toBe(
    'Updated Studio',
  )
  expect(
    screen.getByRole('button', { name: 'Edit Updated Studio' }).getAttribute('aria-pressed'),
  ).toBe('true')
  fireEvent.keyDown(screen.getByRole('button', { name: 'Edit Frontend' }), { key: 'Enter' })
  expect(screen.queryByLabelText('Company')).toBeNull()
  fireEvent.change(screen.getByLabelText('Keywords'), { target: { value: 'TypeScript' } })
  fireEvent.keyDown(screen.getByLabelText('Keywords'), { key: 'Enter' })
  expect(useResumeStore.getState().resume?.modules.skills.items[0].keywords).toEqual([
    'React',
    'TypeScript',
  ])
  fireEvent.click(screen.getByRole('button', { name: 'Edit Updated Studio' }))
  expect((screen.getByLabelText('Company') as HTMLInputElement).value).toBe('Updated Studio')
  await act(async () => {
    await vi.advanceTimersByTimeAsync(600)
  })
  expect(api.update).toHaveBeenCalledTimes(1)
  expect(api.update.mock.calls[0][1].data.modules.experience.items[0].company).toBe(
    'Updated Studio',
  )
})

it('adds typed entries directly to each section and keeps their inline values in the shared draft', () => {
  useResumeStore.getState().initializeResume({
    id: 'draft',
    title: 'Resume',
    data: structuredClone(defaultResumeData) as ResumeData,
  })
  render(<EditingWorkspace />)
  for (const [section, label, value] of [
    ['Education', 'School', 'Example University'],
    ['Projects', 'Name', 'Example Project'],
    ['Skills', 'Name', 'Languages'],
    ['Experience', 'Company', 'Example Studio'],
  ]) {
    fireEvent.keyDown(screen.getByRole('button', { name: 'Add section' }), { key: 'Enter' })
    fireEvent.click(screen.getByRole('menuitem', { name: section }))
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
    expect(
      within(screen.getByTestId('preview')).getByRole('button', { name: `Edit ${value}` }),
    ).toBeTruthy()
  }
  addCustom('Volunteer')
  fireEvent.change(screen.getByLabelText('Organization'), { target: { value: 'Volunteer work' } })
  fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'https://example.test' } })
  expect(
    within(screen.getByTestId('preview')).getByRole('button', { name: 'Edit Volunteer work' }),
  ).toBeTruthy()
  expect(
    within(screen.getByTestId('preview')).getByRole('link', { name: 'Link' }).getAttribute('href'),
  ).toBe('https://example.test')
})

it('keeps selection controls out of the print document and hides entries without losing saved content', () => {
  const data = structuredClone(defaultResumeData) as ResumeData
  data.modules.experience.items = [
    {
      id: 'job',
      visible: true,
      company: 'Example Studio',
      position: 'Engineer',
      location: '',
      date: '',
      summary: '',
    },
  ]
  useResumeStore.getState().initializeResume({ id: 'draft', title: 'Resume', data })
  const print = render(<ResumeDocument />)
  expect(print.container.querySelector('[role="button"]')).toBeNull()
  expect(print.container.querySelector('.resume-preview-block')).toBeNull()
  print.unmount()
  render(<EditingWorkspace />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit Example Studio' }))
  fireEvent.keyDown(screen.getByRole('button', { name: 'Open menu' }), { key: 'Enter' })
  fireEvent.click(screen.getByRole('menuitem', { name: 'Hide' }))
  expect(within(screen.getByTestId('preview')).queryByText('Example Studio')).toBeNull()
  expect(useResumeStore.getState().resume?.modules.experience.items[0].company).toBe(
    'Example Studio',
  )
  expect(useResumeStore.getState().resume?.modules.experience.items[0].visible).toBe(false)
})
