import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { PullRequestStatusFilter } from '../components/RepoPullRequestList'
import { defaultPullRequestStatusFilters } from '../components/main-workspace/pullRequestStatusFilterModel'

const STORAGE_KEY = 'azrev.pullRequestStatusFilters'

const validFilter = new Set<PullRequestStatusFilter>(defaultPullRequestStatusFilters)

function parsePersistedStatusFilters(raw: unknown): PullRequestStatusFilter[] {
  if (!Array.isArray(raw)) return [...defaultPullRequestStatusFilters]
  const next: PullRequestStatusFilter[] = []
  const seen = new Set<PullRequestStatusFilter>()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    if (!validFilter.has(item as PullRequestStatusFilter)) continue
    const v = item as PullRequestStatusFilter
    if (seen.has(v)) continue
    seen.add(v)
    next.push(v)
  }
  return next
}

export type PullRequestStatusFilterStore = {
  statusFilters: PullRequestStatusFilter[]
  setStatusFilters: (filters: PullRequestStatusFilter[]) => void
}

export const usePullRequestStatusFilterStore = create<PullRequestStatusFilterStore>()(
  persist(
    (set) => ({
      statusFilters: [...defaultPullRequestStatusFilters],
      setStatusFilters: (filters) => set({ statusFilters: [...filters] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ statusFilters: state.statusFilters }),
      merge: (persistedState, currentState) => {
        if (persistedState == null || typeof persistedState !== 'object') {
          return currentState
        }
        const record = persistedState as Record<string, unknown>
        if (!('statusFilters' in record)) return currentState
        return {
          ...currentState,
          statusFilters: parsePersistedStatusFilters(record.statusFilters),
        }
      },
    },
  ),
)
