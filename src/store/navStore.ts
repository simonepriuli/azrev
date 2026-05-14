import { create } from 'zustand'

export type NavStore = {
  projectId: string | null
  projectName: string | null
  repositoryId: string | null
  repositoryName: string | null
  pullRequestId: number | null
  selectedChangePath: string | null
  setProject: (id: string, name: string) => void
  setRepository: (id: string, name: string) => void
  setPullRequest: (id: number | null) => void
  setSelectedChangePath: (path: string | null) => void
  resetBelowProject: () => void
  resetBelowRepository: () => void
}

export const useNavStore = create<NavStore>((set) => ({
  projectId: null,
  projectName: null,
  repositoryId: null,
  repositoryName: null,
  pullRequestId: null,
  selectedChangePath: null,
  setProject: (id, name) =>
    set({
      projectId: id,
      projectName: name,
      repositoryId: null,
      repositoryName: null,
      pullRequestId: null,
      selectedChangePath: null,
    }),
  setRepository: (id, name) =>
    set({
      repositoryId: id,
      repositoryName: name,
      pullRequestId: null,
      selectedChangePath: null,
    }),
  setPullRequest: (id) =>
    set({
      pullRequestId: id,
      selectedChangePath: null,
    }),
  setSelectedChangePath: (path) => set({ selectedChangePath: path }),
  resetBelowProject: () =>
    set({
      repositoryId: null,
      repositoryName: null,
      pullRequestId: null,
      selectedChangePath: null,
    }),
  resetBelowRepository: () =>
    set({
      pullRequestId: null,
      selectedChangePath: null,
    }),
}))
