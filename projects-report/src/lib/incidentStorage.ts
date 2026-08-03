import { seedIncidents, type Incident } from '../data/incidents'

const STORAGE_KEY = 'projects-report:incidents:v1'

export function loadIncidents(): Incident[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(seedIncidents)
    const parsed = JSON.parse(raw) as Incident[]
    if (!Array.isArray(parsed)) return structuredClone(seedIncidents)
    return mergeWithSeed(parsed)
  } catch {
    return structuredClone(seedIncidents)
  }
}

function mergeWithSeed(saved: Incident[]): Incident[] {
  const byId = new Map(saved.map((item) => [item.id, item]))
  const seedIds = new Set(seedIncidents.map((s) => s.id))
  const result: Incident[] = []

  for (const seed of seedIncidents) {
    const existing = byId.get(seed.id)
    byId.delete(seed.id)
    // Retros Jira: seed é a fonte da verdade (lista gerenciada no JSON).
    if (seed.jiraKey) {
      result.push(structuredClone(seed))
      continue
    }
    result.push(
      existing ? { ...seed, ...existing, id: seed.id } : structuredClone(seed),
    )
  }

  for (const extra of byId.values()) {
    // Descarta retros Jira que saíram da limpeza.
    if (extra.jiraKey && !seedIds.has(extra.id)) continue
    result.push(extra)
  }

  return result.sort(byDateDesc)
}

function byDateDesc(a: Incident, b: Incident): number {
  const [da, ma, ya] = a.date.split('/').map(Number)
  const [db, mb, yb] = b.date.split('/').map(Number)
  return yb * 10000 + mb * 100 + db - (ya * 10000 + ma * 100 + da)
}

export function saveIncidents(items: Incident[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}
