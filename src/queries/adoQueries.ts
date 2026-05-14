import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { adoGetJson, adoGetText, adoPatchJson, adoPutJson } from '../lib/ado'
import type {
  AdoConnectionData,
  AdoIdentityRef,
  GitPullRequest,
  GitPullRequestChangeEntry,
  GitPullRequestDetail,
  GitPullRequestIteration,
  GitPullRequestReviewer,
  GitRepository,
  PagedResult,
  TeamProjectReference,
} from '../lib/adoTypes'

export const authStatusQueryKey = ['auth', 'status'] as const

const MAX_INLINE_DIFF_CHARS = 1_000_000
const MAX_INLINE_DIFF_LINES = 20_000

type PullRequestReviewersResponse =
  | GitPullRequestReviewer[]
  | PagedResult<GitPullRequestReviewer>

function normalizePullRequestReviewersResponse(
  response: PullRequestReviewersResponse,
): GitPullRequestReviewer[] {
  if (Array.isArray(response)) return response
  return response.value
}

export function pullRequestReviewersQueryKey(
  organization: string | undefined,
  projectName: string | undefined,
  repositoryId: string | undefined,
  pullRequestId: number | undefined,
) {
  return ['ado', 'prReviewers', organization, projectName, repositoryId, pullRequestId] as const
}

export function pullRequestsQueryKey(
  organization: string | undefined,
  projectName: string | undefined,
  repositoryId: string | undefined,
) {
  return ['ado', 'prs', organization, projectName, repositoryId] as const
}

export async function fetchPullRequestReviewers(
  organization: string,
  projectName: string,
  repositoryId: string,
  pullRequestId: number,
): Promise<GitPullRequestReviewer[]> {
  const response = await adoGetJson<PullRequestReviewersResponse>(
    organization,
    `${projectName}/_apis/git/repositories/${encodeURIComponent(repositoryId)}/pullrequests/${pullRequestId}/reviewers`,
  )
  return normalizePullRequestReviewersResponse(response)
}

export function useAuthStatus() {
  return useQuery({
    queryKey: authStatusQueryKey,
    queryFn: async () => {
      if (!window.azrev) {
        return { configured: false as const }
      }
      return window.azrev.auth.getStatus()
    },
    staleTime: 30_000,
  })
}

export function useAdoAuthenticatedUser(organization: string | undefined) {
  return useQuery({
    queryKey: ['ado', 'connectionData', organization],
    queryFn: () =>
      adoGetJson<AdoConnectionData>(
        organization!,
        `_apis/connectionData?api-version=7.2-preview.1`,
      ),
    enabled: Boolean(organization),
    staleTime: 300_000,
  })
}

function identityMembershipLookupPath(identities: readonly AdoIdentityRef[]) {
  const searchParams = new URLSearchParams()
  const identityIds = identities.map((identity) => identity.id).filter((id): id is string => Boolean(id))
  const descriptors = identities
    .map((identity) => identity.descriptor)
    .filter((descriptor): descriptor is string => Boolean(descriptor))
  const subjectDescriptors = identities
    .map((identity) => identity.subjectDescriptor)
    .filter((descriptor): descriptor is string => Boolean(descriptor))

  if (identityIds.length > 0) searchParams.set('identityIds', identityIds.join(','))
  if (descriptors.length > 0) searchParams.set('descriptors', descriptors.join(','))
  if (subjectDescriptors.length > 0) searchParams.set('subjectDescriptors', subjectDescriptors.join(','))
  searchParams.set('queryMembership', 'ExpandedUp')

  return `_apis/identities?${searchParams.toString()}`
}

export function useAdoIdentityMemberships(
  organization: string | undefined,
  identities: readonly AdoIdentityRef[],
) {
  const identityKey = identities
    .map((identity) => identity.id ?? identity.descriptor ?? identity.subjectDescriptor ?? identity.uniqueName)
    .filter((value): value is string => Boolean(value))
    .sort()

  return useQuery({
    queryKey: ['ado', 'identityMemberships', organization, identityKey],
    queryFn: () =>
      adoGetJson<PagedResult<AdoIdentityRef>>(
        organization!,
        identityMembershipLookupPath(identities),
        { service: 'vssps' },
      ),
    enabled: Boolean(organization && identityKey.length > 0),
    staleTime: 300_000,
  })
}

export function useCurrentAdoReviewerIdentities(organization: string | undefined) {
  const connectionUser = useAdoAuthenticatedUser(organization)
  const directUserIdentities = useMemo(
    () =>
      [
        connectionUser.data?.authenticatedUser,
        connectionUser.data?.authorizedUser,
      ].filter((identity): identity is AdoIdentityRef => identity != null),
    [connectionUser.data?.authenticatedUser, connectionUser.data?.authorizedUser],
  )
  const identityMemberships = useAdoIdentityMemberships(organization, directUserIdentities)

  const identities = useMemo(
    () => [
      ...directUserIdentities,
      ...(identityMemberships.data?.value ?? []).flatMap((identity) => identity.memberOf ?? []),
    ],
    [directUserIdentities, identityMemberships.data?.value],
  )

  const membershipLookupPending =
    Boolean(organization && directUserIdentities.length > 0) && identityMemberships.isPending

  return {
    identities,
    isPending: connectionUser.isPending || membershipLookupPending,
    userId: connectionUser.data?.authenticatedUser?.id,
    userUniqueName: connectionUser.data?.authenticatedUser?.uniqueName,
  }
}

export type ApprovePullRequestVariables = {
  organization: string
  projectName: string
  repositoryId: string
  pullRequestId: number
  reviewerId: string
}

export function useApprovePullRequestMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: ApprovePullRequestVariables) => {
      const path = `${vars.projectName}/_apis/git/repositories/${encodeURIComponent(
        vars.repositoryId,
      )}/pullrequests/${vars.pullRequestId}/reviewers/${encodeURIComponent(vars.reviewerId)}`
      return adoPutJson<unknown>(vars.organization, path, {
        id: vars.reviewerId,
        vote: 10,
      })
    },
    onSuccess: async (_, vars) => {
      await Promise.all([
        qc.invalidateQueries({
          queryKey: ['ado', 'pr', vars.organization, vars.projectName, vars.repositoryId, vars.pullRequestId],
        }),
        qc.invalidateQueries({
          queryKey: pullRequestsQueryKey(vars.organization, vars.projectName, vars.repositoryId),
        }),
        qc.invalidateQueries({
          queryKey: ['ado', 'prReviewers', vars.organization, vars.projectName, vars.repositoryId, vars.pullRequestId],
        }),
      ])
    },
  })
}

export type CompletePullRequestVariables = {
  organization: string
  projectName: string
  repositoryId: string
  pullRequestId: number
  sourceCommitId: string
  prTitle: string
}

export function useCompletePullRequestMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: CompletePullRequestVariables) => {
      const path = `${vars.projectName}/_apis/git/repositories/${encodeURIComponent(
        vars.repositoryId,
      )}/pullrequests/${vars.pullRequestId}`
      const body = {
        status: 'completed',
        lastMergeSourceCommit: { commitId: vars.sourceCommitId },
        completionOptions: {
          deleteSourceBranch: false,
          mergeCommitMessage: `Merged PR !${vars.pullRequestId}: ${vars.prTitle}`.trim(),
          mergeStrategy: 'noFastForward',
        },
      }
      return adoPatchJson<GitPullRequestDetail>(vars.organization, path, body)
    },
    onSuccess: async (_, vars) => {
      await Promise.all([
        qc.invalidateQueries({
          queryKey: ['ado', 'pr', vars.organization, vars.projectName, vars.repositoryId, vars.pullRequestId],
        }),
        qc.invalidateQueries({
          queryKey: pullRequestsQueryKey(vars.organization, vars.projectName, vars.repositoryId),
        }),
        qc.invalidateQueries({
          queryKey: ['ado', 'prIterations', vars.organization, vars.projectName, vars.repositoryId, vars.pullRequestId],
        }),
        qc.invalidateQueries({
          queryKey: ['ado', 'prReviewers', vars.organization, vars.projectName, vars.repositoryId, vars.pullRequestId],
        }),
      ])
    },
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
    queryKey: pullRequestsQueryKey(organization, projectName, repositoryId),
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

export function usePullRequestReviewers(
  organization: string | undefined,
  projectName: string | undefined,
  repositoryId: string | undefined,
  pullRequestId: number | undefined,
) {
  return useQuery({
    queryKey: pullRequestReviewersQueryKey(organization, projectName, repositoryId, pullRequestId),
    queryFn: () =>
      fetchPullRequestReviewers(
        organization!,
        projectName!,
        repositoryId!,
        pullRequestId!,
      ),
    enabled: Boolean(organization && projectName && repositoryId && pullRequestId != null),
    staleTime: 30_000,
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

function lineCount(content: string): number {
  if (content.length === 0) return 0
  let count = 1
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) count++
  }
  return count
}

function isTooLargeForInlineDiff(oldText: string, newText: string): boolean {
  const totalChars = oldText.length + newText.length
  if (totalChars > MAX_INLINE_DIFF_CHARS) return true
  return lineCount(oldText) + lineCount(newText) > MAX_INLINE_DIFF_LINES
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
      const [oldText, newText] = await Promise.all([
        fetchFileAtCommit(
          organization,
          projectName,
          repositoryId,
          itemPath,
          targetId,
        ),
        fetchFileAtCommit(
          organization,
          projectName,
          repositoryId,
          itemPath,
          sourceId,
        ),
      ])
      const oldOk = looksLikeText(oldText)
      const newOk = looksLikeText(newText)
      if (!oldOk || !newOk) {
        return { kind: 'binary' as const, displayPath: itemPath }
      }
      if (isTooLargeForInlineDiff(oldText, newText)) {
        return { kind: 'too-large' as const, displayPath: itemPath }
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
