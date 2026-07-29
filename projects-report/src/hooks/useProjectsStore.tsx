import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Project } from '../data/projects'
import {
  clearSavedProjects,
  getSeedProjects,
  loadProjects,
  saveProjects,
} from '../lib/storage'

type ProjectsStore = {
  projects: Project[]
  dirty: boolean
  savedAt: string | null
  updateProject: (projectId: string, updater: (project: Project) => Project) => void
  updateAndSave: (projectId: string, updater: (project: Project) => Project) => void
  saveAll: () => void
  resetAll: () => void
  resetProject: (projectId: string) => void
  getProject: (id: string | null | undefined) => Project | undefined
}

const ProjectsStoreContext = createContext<ProjectsStore | null>(null)

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects())
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const updateProject = useCallback(
    (projectId: string, updater: (project: Project) => Project) => {
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updater(p) : p)))
      setDirty(true)
    },
    [],
  )

  const saveAll = useCallback(() => {
    setProjects((prev) => {
      saveProjects(prev)
      return prev
    })
    setDirty(false)
    setSavedAt(new Date().toLocaleString('pt-BR'))
  }, [])

  const resetAll = useCallback(() => {
    clearSavedProjects()
    setProjects(getSeedProjects())
    setDirty(false)
    setSavedAt(null)
  }, [])

  const resetProject = useCallback((projectId: string) => {
    const seed = getSeedProjects().find((p) => p.id === projectId)
    if (!seed) return
    setProjects((prev) => {
      const next = prev.map((p) => (p.id === projectId ? structuredClone(seed) : p))
      saveProjects(next)
      return next
    })
    setDirty(false)
    setSavedAt(new Date().toLocaleString('pt-BR'))
  }, [])

  const updateAndSave = useCallback(
    (projectId: string, updater: (project: Project) => Project) => {
      setProjects((prev) => {
        const next = prev.map((p) => (p.id === projectId ? updater(p) : p))
        saveProjects(next)
        return next
      })
      setDirty(false)
      setSavedAt(new Date().toLocaleString('pt-BR'))
    },
    [],
  )

  const getProject = useCallback(
    (id: string | null | undefined) =>
      id ? projects.find((p) => p.id === id) : undefined,
    [projects],
  )

  const value = useMemo(
    () => ({
      projects,
      dirty,
      savedAt,
      updateProject,
      updateAndSave,
      saveAll,
      resetAll,
      resetProject,
      getProject,
    }),
    [
      projects,
      dirty,
      savedAt,
      updateProject,
      updateAndSave,
      saveAll,
      resetAll,
      resetProject,
      getProject,
    ],
  )

  return (
    <ProjectsStoreContext.Provider value={value}>
      {children}
    </ProjectsStoreContext.Provider>
  )
}

export function useProjectsStore(): ProjectsStore {
  const ctx = useContext(ProjectsStoreContext)
  if (!ctx) {
    throw new Error('useProjectsStore deve ser usado dentro de ProjectsProvider')
  }
  return ctx
}
