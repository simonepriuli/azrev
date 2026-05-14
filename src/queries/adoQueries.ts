import { useQuery } from '@tanstack/react-query'
import { adoGetJson, adoGetText } from '../lib/ado'
import type {
  GitPullRequest,
  GitPullRequestChangeEntry,
  GitPullRequestDetail,
  GitPullRequestIteration,
  GitRepository,
  PagedResult,
  TeamProjectReference,
} from '../lib/adoTypes'

export function useAuthStatus() {
  return useQuery({
    queryKey: ['auth', 'status'],
    queryFn: async () => {
      if (!window.azrev) {
        return { configured: false as const }
      }
      return window.azrev.auth.getStatus()
    },
    staleTime: 30_000,
  })
}

export function useProjects(organization: string | undefined) {
  return useQuery({
    queryKey: ['ado', 'projects', organization],
    queryFn: () =>
      adoGetJson<PagedResult<TeamProjectReference>>(organization!, `_apis/projects`),
    enabled: Boolean(organization),
  })
}

export function useRepositories(organization: string | undefined, projectName: string | undefined) {
  return useQuery({
    queryKey: ['ado', 'repos', organization, projectName],
    queryFn: () =>
      adoGetJson<PagedResult<GitRepository>>(
        organization!,
        `${projectName!}/_apis/git/repositories`,
      ),
    enabled: Boolean(organization && projectName),
  })
}

export function usePullRequests(
  organization: string | undefined,
  projectName: string | undefined,
  repositoryId: string | undefined,
  options?: { enabled?: boolean },
) {
  const extraEnabled = options?.enabled ?? true
  return useQuery({
    queryKey: ['ado', 'prs', organization, projectName, repositoryId],
    queryFn: () =>
      adoGetJson<PagedResult<GitPullRequest>>(
        organization!,
        `${projectName!}/_apis/git/repositories/${encodeURIComponent(
          repositoryId!,
        )}/pullrequests?searchCriteria.status=all&$top=100`,
      ),
    enabled: extraEnabled && Boolean(organization && projectName && repositoryId),
  })
}

export function usePullRequest(
  organization: string | undefined,
  projectName: string | undefined,
  repositoryId: string | undefined,
  pullRequestId: number | undefined,
) {
  return useQuery({
    queryKey: ['ado', 'pr', organization, projectName, repositoryId, pullRequestId],
    queryFn: () =>
      adoGetJson<GitPullRequestDetail>(
        organization!,
        `${projectName!}/_apis/git/repositories/${repositoryId!}/pullrequests/${pullRequestId!}`,
      ),
    enabled: Boolean(organization && projectName && repositoryId && pullRequestId != null),
  })
}

export function useLatestIterationId(
  organization: string | undefined,
  projectName: string | undefined,
  repositoryId: string | undefined,
  pullRequestId: number | undefined,
) {
  return useQuery({
    queryKey: ['ado', 'prIterations', organization, projectName, repositoryId, pullRequestId],
    queryFn: async () => {
      const data = await adoGetJson<PagedResult<{ id: number }>>(
        organization!,
        `${projectName!}/_apis/git/repositories/${repositoryId!}/pullrequests/${pullRequestId!}/iterations`,
      )
      if (!data.value.length) {
        throw new Error('No iterations returned for this pull request')
      }
      const ids = data.value.map((v) => v.id)
      return Math.max(...ids)
    },
    enabled: Boolean(organization && projectName && repositoryId && pullRequestId != null),
  })
}

export function useIterationDetail(
  organization: string | undefined,
  projectName: string | undefined,
  repositoryId: string | undefined,
  pullRequestId: number | undefined,
  iterationId: number | undefined,
) {
  return useQuery({
    queryKey: [
      'ado',
      'iteration',
      organization,
      projectName,
      repositoryId,
      pullRequestId,
      iterationId,
    ],
    queryFn: () =>
      adoGetJson<GitPullRequestIteration>(
        organization!,
        `${projectName!}/_apis/git/repositories/${repositoryId!}/pullrequests/${pullRequestId!}/iterations/${iterationId!}`,
      ),
    enabled: Boolean(
      organization &&
        projectName &&
        repositoryId &&
        pullRequestId != null &&
        iterationId != null,
    ),
  })
}

export function useIterationChanges(
  organization: string | undefined,
  projectName: string | undefined,
  repositoryId: string | undefined,
  pullRequestId: number | undefined,
  iterationId: number | undefined,
) {
  return useQuery({
    queryKey: [
      'ado',
      'iterationChanges',
      organization,
      projectName,
      repositoryId,
      pullRequestId,
      iterationId,
    ],
    queryFn: () =>
      adoGetJson<{ changeEntries?: GitPullRequestChangeEntry[] }>(
        organization!,
        `${projectName!}/_apis/git/repositories/${repositoryId!}/pullrequests/${pullRequestId!}/iterations/${iterationId!}/changes`,
      ),
    enabled: Boolean(
      organization &&
        projectName &&
        repositoryId &&
        pullRequestId != null &&
        iterationId != null,
    ),
  })
}

function normalizeChangeType(t: number | string): 'add' | 'edit' | 'delete' | 'other' {
  if (typeof t === 'string') {
    const s = t.toLowerCase()
    if (s === 'add') return 'add'
    if (s === 'edit') return 'edit'
    if (s === 'delete') return 'delete'
    if (s === 'rename') return 'edit'
    const n = Number.parseInt(t, 10)
    if (!Number.isNaN(n)) {
      return normalizeChangeType(n)
    }
    return 'other'
  }
  if (t === 1) return 'add'
  if (t === 2) return 'edit'
  if (t === 16) return 'delete'
  if (t === 32768) return 'edit'
  return 'other'
}

async function fetchFileAtCommit(
  organization: string,
  projectName: string,
  repositoryId: string,
  itemPath: string,
  commitId: string | undefined,
): Promise<string> {
  if (!commitId) return ''
  const normalizedPath = itemPath.startsWith('/') ? itemPath : `/${itemPath}`
  const sp = new URLSearchParams({
    path: normalizedPath,
    'versionDescriptor.version': commitId,
    'versionDescriptor.versionType': 'commit',
    resolveLfs: 'true',
  })
  const pathAfterOrg = `${projectName}/_apis/git/repositories/${repositoryId}/items?${sp.toString()}`
  return adoGetText(organization, pathAfterOrg)
}

function looksLikeText(content: string): boolean {
  if (content.includes('\u0000')) return false
  const sample = content.slice(0, 8000)
  let control = 0
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i)
    if (c === 9 || c === 10 || c === 13) continue
    if (c < 32) control++
  }
  return control / Math.max(sample.length, 1) < 0.02
}

export type CommitPair = {
  sourceRefCommit?: { commitId?: string }
  targetRefCommit?: { commitId?: string }
}

export function useSelectedFileDiff(
  organization: string | undefined,
  projectName: string | undefined,
  repositoryId: string | undefined,
  pullRequestId: number | undefined,
  iterationId: number | undefined,
  itemPath: string | null,
  iteration: CommitPair | undefined,
) {
  return useQuery({
    queryKey: [
      'ado',
      'filePair',
      organization,
      projectName,
      repositoryId,
      pullRequestId,
      iterationId,
      itemPath,
      iteration?.sourceRefCommit?.commitId,
      iteration?.targetRefCommit?.commitId,
    ],
    queryFn: async () => {
      const sourceId = iteration?.sourceRefCommit?.commitId
      const targetId = iteration?.targetRefCommit?.commitId
      if (!organization || !projectName || !repositoryId || !itemPath || !sourceId || !targetId) {
        throw new Error('Missing iteration commits or path')
      }
      const oldText = await fetchFileAtCommit(
        organization,
        projectName,
        repositoryId,
        itemPath,
        targetId,
      )
      const newText = await fetchFileAtCommit(
        organization,
        projectName,
        repositoryId,
        itemPath,
        sourceId,
      )
      const oldOk = looksLikeText(oldText)
      const newOk = looksLikeText(newText)
      if (!oldOk || !newOk) {
        return { kind: 'binary' as const, displayPath: itemPath }
      }
      return {
        kind: 'text' as const,
        displayPath: itemPath,
        oldText,
        newText,
      }
    },
    enabled: Boolean(
      organization &&
        projectName &&
        repositoryId &&
        itemPath &&
        iteration?.sourceRefCommit?.commitId &&
        iteration?.targetRefCommit?.commitId,
    ),
  })
}

export function filterDiffableChanges(entries: GitPullRequestChangeEntry[] | undefined) {
  if (!entries) return []
  return entries.filter((e) => {
    const p = e.item?.path
    if (!p) return false
    if (e.item?.gitObjectType && e.item.gitObjectType !== 'blob') return false
    const t = normalizeChangeType(e.changeType)
    return t === 'add' || t === 'edit' || t === 'delete'
  })
}

export { normalizeChangeType }
