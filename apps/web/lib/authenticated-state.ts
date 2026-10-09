import type { QueryClient } from '@tanstack/react-query'
import { useResumeStore } from '@/stores/resume-store'

export const SESSION_CHANGE_KEY = 'resume-copilot.session-change'

/** Invalidate the current browser identity before mounting another user's workspace. */
export async function clearAuthenticatedState(queryClient: QueryClient) {
  useResumeStore.getState().reset()
  await queryClient.cancelQueries()
  queryClient.clear()
}
