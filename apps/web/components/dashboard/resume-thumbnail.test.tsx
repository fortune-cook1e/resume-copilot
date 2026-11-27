import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { defaultResumeData } from '@resume-copilot/contracts'
import ResumeDocument from '@/components/resume/ResumeDocument'
import { useResumeStore } from '@/stores/resume-store'
import { enqueueThumbnail } from './resume-thumbnail'

const thumbnailSession = vi.hoisted(() => ({ userId: 'owner' }))
vi.mock('@/lib/auth-client', () => ({
  useSession: () => ({ data: { user: { id: thumbnailSession.userId } } }),
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('renders an independent document without changing the active editor draft', () => {
  const before = useResumeStore.getState()
  render(
    <ResumeDocument
      data={{
        resume: {
          ...structuredClone(defaultResumeData),
          basics: {
            ...defaultResumeData.basics,
            name: 'Thumbnail owner',
          },
        },
        avatar: null,
      }}
    />,
  )
  expect(screen.getByText('Thumbnail owner')).toBeTruthy()
  expect(useResumeStore.getState()).toBe(before)
})

it('serializes thumbnail work and skips cancelled jobs without blocking the next resume', async () => {
  const events: string[] = []
  let release!: () => void
  const first = enqueueThumbnail(async () => {
    events.push('first')
    await new Promise<void>((resolve) => {
      release = resolve
    })
  }, new AbortController().signal)
  const controller = new AbortController()
  const cancelled = enqueueThumbnail(async () => {
    events.push('cancelled')
  }, controller.signal)
  const rejection = expect(cancelled).rejects.toThrow()
  const last = enqueueThumbnail(async () => {
    events.push('last')
  }, new AbortController().signal)
  await Promise.resolve()
  expect(events).toEqual(['first'])
  controller.abort()
  release()
  await Promise.all([first, rejection, last])
  expect(events).toEqual(['first', 'last'])
})

it('never displays another account or saved revision from the thumbnail cache', async () => {
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')
  const { ResumeCover } = await import('./ResumeCover')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const resume = {
    id: 'private-resume',
    title: 'Resume',
    description: '',
    visibility: 'private' as const,
    createdAt: '2026-11-27T00:00:00Z',
    updatedAt: '2026-11-27T00:00:00Z',
  }
  const cachedImage = 'data:image/png;base64,old'
  client.setQueryData(['resume-thumbnail', 'owner', resume.id, resume.updatedAt], cachedImage)
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  const cover = (updatedAt = resume.updatedAt) => (
    <QueryClientProvider client={client}>
      <ResumeCover resume={{ ...resume, updatedAt }} />
    </QueryClientProvider>
  )
  const view = render(cover())
  expect(view.container.querySelector('img')?.src).toBe(cachedImage)
  view.rerender(cover('2026-11-28T00:00:00Z'))
  expect(view.container.querySelector('img')).toBeNull()
  thumbnailSession.userId = 'other-owner'
  view.rerender(cover())
  expect(view.container.querySelector('img')).toBeNull()
  client.clear()
})
