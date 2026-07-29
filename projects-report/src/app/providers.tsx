import type { ReactNode } from 'react'
import { ProjectsProvider } from '../hooks/useProjectsStore'

export function AppProviders({ children }: { children: ReactNode }) {
  return <ProjectsProvider>{children}</ProjectsProvider>
}
