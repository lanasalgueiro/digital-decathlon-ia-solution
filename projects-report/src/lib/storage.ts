import { projects as seedProjects, type Project } from '../data/projects'

const STORAGE_KEY = 'projects-report:v1'

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(seedProjects)
    const parsed = JSON.parse(raw) as Project[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return structuredClone(seedProjects)
    }
    return mergeWithSeed(parsed)
  } catch {
    return structuredClone(seedProjects)
  }
}

/** Keep seed projects that were never saved; prefer local overrides by id. */
function mergeWithSeed(saved: Project[]): Project[] {
  const byId = new Map(saved.map((p) => [p.id, p]))
  const result: Project[] = []

  for (const seed of seedProjects) {
    const existing = byId.get(seed.id)
    byId.delete(seed.id)

    if (!existing) {
      result.push(structuredClone(seed))
      continue
    }

    // Substitui placeholder antigo do Blog pela versão concluída do seed
    if (
      seed.id === 'blog-decathlon' &&
      (existing.subtitle.includes('placeholder') ||
        existing.status === 'planejamento' ||
        existing.phases.length < 3)
    ) {
      result.push(structuredClone(seed))
      continue
    }

    // Garante campos novos do seed (ex.: demoUrl) sem apagar edições locais
    result.push({
      ...existing,
      demoUrl: existing.demoUrl ?? seed.demoUrl,
      kind: existing.kind ?? seed.kind,
    })
  }

  for (const extra of byId.values()) {
    result.push(extra)
  }

  return result
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export function clearSavedProjects(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function getSeedProjects(): Project[] {
  return structuredClone(seedProjects)
}
