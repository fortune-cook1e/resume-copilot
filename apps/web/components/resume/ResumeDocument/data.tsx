import { createContext, useContext, type ReactNode } from 'react'
import type { ResumeData } from '@resume-copilot/contracts'
import { useResumeStore } from '@/stores/resume-store'

export type DocumentData = { resume: ResumeData | null; avatar: string | null }
const DocumentContext = createContext<DocumentData | undefined>(undefined)

export function DocumentDataProvider({
  value,
  children,
}: {
  value?: DocumentData
  children: ReactNode
}) {
  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>
}

// Independent documents never read or mutate the editor's active draft.
export function useDocumentData(): DocumentData {
  const provided = useContext(DocumentContext)
  const resume = useResumeStore((state) => (provided ? null : state.resume))
  const avatar = useResumeStore((state) => (provided ? null : state.avatar))
  return provided ?? { resume, avatar }
}
