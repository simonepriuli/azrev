const STORAGE_KEY = 'azrev.selectedProjectByOrg'

type Store = Record<string, string>

function readStore(): Store {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Store
  } catch {
    return {}
  }
}

function writeStore(store: Store) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // ignore quota / private mode
  }
}

export function readStoredProjectId(organization: string | undefined): string | null {
  if (!organization) return null
  const id = readStore()[organization]
  return typeof id === 'string' && id.length > 0 ? id : null
}

export function writeStoredProjectId(organization: string | undefined, projectId: string) {
  if (!organization || !projectId) return
  const next = { ...readStore(), [organization]: projectId }
  writeStore(next)
}
