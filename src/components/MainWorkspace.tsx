import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { readStoredProjectId, writeStoredProjectId } from '../lib/selectedProjectStorage'
import {
  authStatusQueryKey,
  useApprovePullRequestMutation,
  useAuthStatus,
  useCompletePullRequestMutation,
  useCreatePullRequestThreadMutation,
  useCurrentAdoReviewerIdentities,
  useIterationChanges,
  useIterationDetail,
  useLatestIterationId,
  useProjects,
  usePullRequest,
  usePullRequestReviewers,
  usePullRequestThreads,
  useRepositories,
  useReplyToPullRequestThreadMutation,
  useSelectedFileDiff,
  filterDiffableChanges,
} from '../queries/adoQueries'
import { useNavStore } from '../store/navStore'
import { usePullRequestStatusFilterStore } from '../store/pullRequestStatusFilterStore'
import type { InlineCommentDraft } from './FileDiffPane'
import { electronMacVibrancy, isMacUA, mainSidebarToggleDelayMs } from './main-workspace/constants'
import { getPullRequestActionUiState, type PullRequestHeaderActions } from './main-workspace/pullRequestActionUiState'
import { getPullRequestStatusPresentation } from './main-workspace/pullRequestStatusPresentation'
import { MainWorkspaceNoPrSelected } from './main-workspace/MainWorkspaceNoPrSelected'
import { MainWorkspaceSidebar } from './main-workspace/MainWorkspaceSidebar'
import { PullRequestCommentsPanel } from './main-workspace/PullRequestCommentsPanel'
import { PullRequestReviewWorkspace } from './main-workspace/PullRequestReviewWorkspace'

export function MainWorkspace() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const auth = useAuthStatus()
  const organization = auth.data?.organization
  const statusFilterRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)

  const {
    projectId,
    projectName,
    repositoryId,
    repositoryName,
    pullRequestId,
    selectedChangePath,
    setProject,
    selectPullRequestInRepository,
    setSelectedChangePath,
  } = useNavStore()

  const [expandedRepoIds, setExpandedRepoIds] = useState(() => new Set<string>())
  const pullRequestStatusFilters = usePullRequestStatusFilterStore((s) => s.statusFilters)
  const assignedToMeOnly = usePullRequestStatusFilterStore((s) => s.assignedToMeOnly)
  const setPullRequestStatusFilters = usePullRequestStatusFilterStore((s) => s.setStatusFilters)
  const setAssignedToMeOnly = usePullRequestStatusFilterStore((s) => s.setAssignedToMeOnly)
  const [statusFilterOpen, setStatusFilterOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showMainSidebarToggle, setShowMainSidebarToggle] = useState(false)
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false)

  const closeStatusFilter = useCallback(() => setStatusFilterOpen(false), [])
  const toggleSidebar = useCallback(() => setSidebarOpen((open) => !open), [])

  const projects = useProjects(organization)
  const repos = useRepositories(organization, projectName ?? undefined)

  const repoIdsFingerprint = useMemo(() => {
    const v = repos.data?.value ?? []
    if (v.length === 0) return ''
    return [...v].map((r) => r.id).sort().join('\0')
  }, [repos.data?.value])

  const defaultExpandedRepoIds = useMemo(() => {
    if (!projectName || repoIdsFingerprint === '') return null
    return new Set(repoIdsFingerprint.split('\0'))
  }, [projectName, repoIdsFingerprint])

  useEffect(() => {
    if (defaultExpandedRepoIds == null) {
      setExpandedRepoIds(new Set())
      return
    }
    setExpandedRepoIds(new Set(defaultExpandedRepoIds))
  }, [defaultExpandedRepoIds])

  useEffect(() => {
    if (!repositoryId) return
    setExpandedRepoIds((prev) => {
      if (prev.has(repositoryId)) return prev
      const next = new Set(prev)
      next.add(repositoryId)
      return next
    })
  }, [repositoryId])

  useEffect(() => {
    if (!statusFilterOpen) return
    const onDocMouseDown = (e: MouseEvent) => {
      const el = statusFilterRef.current
      if (!el || el.contains(e.target as Node)) return
      closeStatusFilter()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeStatusFilter()
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [statusFilterOpen, closeStatusFilter])

  useEffect(() => {
    const sidebar = sidebarRef.current as (HTMLElement & { inert?: boolean }) | null
    if (!sidebar) return
    sidebar.inert = !sidebarOpen
  }, [sidebarOpen])

  useEffect(() => {
    if (sidebarOpen) {
      setShowMainSidebarToggle(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShowMainSidebarToggle(true)
    }, mainSidebarToggleDelayMs)

    return () => window.clearTimeout(timeoutId)
  }, [sidebarOpen])

  useEffect(() => {
    if (!organization || projects.isLoading || projects.error) return
    const list = projects.data?.value ?? []
    if (list.length === 0) return

    const byId = new Map(list.map((p) => [p.id, p] as const))

    if (projectId && byId.has(projectId)) {
      writeStoredProjectId(organization, projectId)
      return
    }

    const stored = readStoredProjectId(organization)
    if (stored && byId.has(stored)) {
      const p = byId.get(stored)!
      setProject(p.id, p.name)
      return
    }

    const first = list[0]!
    setProject(first.id, first.name)
  }, [organization, projects.isLoading, projects.error, projects.data?.value, projectId, setProject])
  const pr = usePullRequest(organization, projectName ?? undefined, repositoryId ?? undefined, pullRequestId ?? undefined)
  const prReviewers = usePullRequestReviewers(
    organization,
    projectName ?? undefined,
    repositoryId ?? undefined,
    pullRequestId ?? undefined,
  )
  const currentReviewerIdentities = useCurrentAdoReviewerIdentities(organization)
  const approvePr = useApprovePullRequestMutation()
  const completePr = useCompletePullRequestMutation()
  const [prMutationError, setPrMutationError] = useState<string | null>(null)

  useEffect(() => {
    setPrMutationError(null)
    setCommentsPanelOpen(false)
  }, [repositoryId, pullRequestId])

  const prActionCtx = useMemo(
    () => ({
      userId: currentReviewerIdentities.userId,
      userUniqueName: currentReviewerIdentities.userUniqueName,
      userIdentities: currentReviewerIdentities.identities,
      identityLoading: currentReviewerIdentities.isPending,
    }),
    [
      currentReviewerIdentities.identities,
      currentReviewerIdentities.isPending,
      currentReviewerIdentities.userId,
      currentReviewerIdentities.userUniqueName,
    ],
  )

  const prActionState = useMemo(
    () =>
      getPullRequestActionUiState(
        pr.data
          ? {
              ...pr.data,
              reviewers: prReviewers.data ?? pr.data.reviewers,
            }
          : undefined,
        prActionCtx,
      ),
    [pr.data, prActionCtx, prReviewers.data],
  )

  const onApprovePr = useCallback(() => {
    if (!organization || !projectName || !repositoryId || pullRequestId == null || !pr.data) return
    const st = getPullRequestActionUiState(
      {
        ...pr.data,
        reviewers: prReviewers.data ?? pr.data.reviewers,
      },
      prActionCtx,
    )
    if (!st.myReviewerId) return
    setPrMutationError(null)
    approvePr.mutate(
      {
        organization,
        projectName,
        repositoryId,
        pullRequestId,
        reviewerId: st.myReviewerId,
      },
      {
        onError: (e: unknown) =>
          setPrMutationError(e instanceof Error ? e.message : 'Approve failed'),
      },
    )
  }, [organization, projectName, repositoryId, pullRequestId, pr.data, prReviewers.data, prActionCtx, approvePr])

  const onMergePr = useCallback(() => {
    if (!organization || !projectName || !repositoryId || pullRequestId == null || !pr.data) return
    const commitId = pr.data.lastMergeSourceCommit?.commitId
    if (!commitId) return
    setPrMutationError(null)
    completePr.mutate(
      {
        organization,
        projectName,
        repositoryId,
        pullRequestId,
        sourceCommitId: commitId,
        prTitle: pr.data.title,
      },
      {
        onError: (e: unknown) =>
          setPrMutationError(e instanceof Error ? e.message : 'Merge failed'),
      },
    )
  }, [organization, projectName, repositoryId, pullRequestId, pr.data, completePr])

  const pullRequestActions = useMemo((): PullRequestHeaderActions | undefined => {
    if (!organization || !projectName || !repositoryId || pullRequestId == null || !pr.data) {
      return undefined
    }
    return {
      showApprove: prActionState.showApprove,
      showMerge: prActionState.showMerge,
      approveDisabled: prActionState.approveDisabled,
      mergeDisabled: prActionState.mergeDisabled,
      approveDisabledReason: prActionState.approveDisabledReason,
      mergeDisabledReason: prActionState.mergeDisabledReason,
      approvePending: approvePr.isPending,
      mergePending: completePr.isPending,
      onApprove: onApprovePr,
      onMerge: onMergePr,
    }
  }, [
    organization,
    projectName,
    repositoryId,
    pullRequestId,
    pr.data,
    prActionState,
    approvePr.isPending,
    completePr.isPending,
    onApprovePr,
    onMergePr,
  ])

  const dismissPrMutationError = useCallback(() => setPrMutationError(null), [])
  const iterationIdQuery = useLatestIterationId(
    organization,
    projectName ?? undefined,
    repositoryId ?? undefined,
    pullRequestId ?? undefined,
  )
  const iterationId = iterationIdQuery.data
  const baseIterationId = iterationId != null && iterationId > 1 ? iterationId - 1 : undefined
  const iteration = useIterationDetail(
    organization,
    projectName ?? undefined,
    repositoryId ?? undefined,
    pullRequestId ?? undefined,
    iterationId,
  )
  const changes = useIterationChanges(
    organization,
    projectName ?? undefined,
    repositoryId ?? undefined,
    pullRequestId ?? undefined,
    iterationId,
  )
  const pullRequestThreads = usePullRequestThreads(
    organization,
    projectName ?? undefined,
    repositoryId ?? undefined,
    pullRequestId ?? undefined,
    baseIterationId,
    iterationId,
  )
  const createPullRequestThread = useCreatePullRequestThreadMutation()
  const replyToPullRequestThread = useReplyToPullRequestThreadMutation()

  const mergedCommits = useMemo(
    () => ({
      sourceRefCommit:
        iteration.data?.sourceRefCommit ?? pr.data?.lastMergeSourceCommit,
      targetRefCommit:
        iteration.data?.targetRefCommit ?? pr.data?.lastMergeTargetCommit,
    }),
    [iteration.data, pr.data],
  )

  const fileDiff = useSelectedFileDiff(
    organization,
    projectName ?? undefined,
    repositoryId ?? undefined,
    pullRequestId ?? undefined,
    iterationId,
    selectedChangePath,
    mergedCommits,
  )

  const changeEntries = useMemo(
    () => filterDiffableChanges(changes.data?.changeEntries),
    [changes.data?.changeEntries],
  )
  const selectedChangeEntry = useMemo(
    () => changeEntries.find((entry) => entry.item?.path === selectedChangePath),
    [changeEntries, selectedChangePath],
  )

  const createGeneralComment = useCallback(
    async (content: string) => {
      if (!organization || !projectName || !repositoryId || pullRequestId == null) {
        throw new Error('Select a pull request before commenting.')
      }

      await createPullRequestThread.mutateAsync({
        organization,
        projectName,
        repositoryId,
        pullRequestId,
        content,
      })
    },
    [organization, projectName, repositoryId, pullRequestId, createPullRequestThread],
  )

  const replyToThread = useCallback(
    async (threadId: number, parentCommentId: number, content: string) => {
      if (!organization || !projectName || !repositoryId || pullRequestId == null) {
        throw new Error('Select a pull request before replying.')
      }

      await replyToPullRequestThread.mutateAsync({
        organization,
        projectName,
        repositoryId,
        pullRequestId,
        threadId,
        parentCommentId,
        content,
      })
    },
    [organization, projectName, repositoryId, pullRequestId, replyToPullRequestThread],
  )

  const createInlineComment = useCallback(
    async (draft: InlineCommentDraft, content: string) => {
      if (!organization || !projectName || !repositoryId || pullRequestId == null || !selectedChangePath) {
        throw new Error('Select a file before adding an inline comment.')
      }
      if (baseIterationId == null || iterationId == null) {
        throw new Error('Inline comments require a tracked pull request iteration.')
      }

      const changeTrackingId = selectedChangeEntry?.changeTrackingId
      if (changeTrackingId == null) {
        throw new Error('Azure DevOps did not return a change tracking id for this file.')
      }

      const endOffset = Math.max(draft.lineText.length, 1)
      await createPullRequestThread.mutateAsync({
        organization,
        projectName,
        repositoryId,
        pullRequestId,
        content,
        changeTrackingId,
        baseIterationId,
        iterationId,
        threadContext: {
          filePath: selectedChangePath,
          leftFileStart: null,
          leftFileEnd: null,
          rightFileStart: {
            line: draft.lineNumber,
            offset: 1,
          },
          rightFileEnd: {
            line: draft.lineNumber,
            offset: endOffset,
          },
        },
      })
    },
    [
      organization,
      projectName,
      repositoryId,
      pullRequestId,
      selectedChangePath,
      baseIterationId,
      iterationId,
      selectedChangeEntry?.changeTrackingId,
      createPullRequestThread,
    ],
  )

  const commentActions = useMemo(
    () => ({
      threads: pullRequestThreads.data?.value ?? [],
      threadsLoading: pullRequestThreads.isLoading,
      threadsError: pullRequestThreads.error,
      creatingThread: createPullRequestThread.isPending,
      replyingThread: replyToPullRequestThread.isPending,
      onCreateGeneralComment: createGeneralComment,
      onReplyToThread: replyToThread,
      onCreateInlineThread: createInlineComment,
    }),
    [
      pullRequestThreads.data?.value,
      pullRequestThreads.isLoading,
      pullRequestThreads.error,
      createPullRequestThread.isPending,
      replyToPullRequestThread.isPending,
      createGeneralComment,
      replyToThread,
      createInlineComment,
    ],
  )

  const commentsPanelCount = useMemo(
    () => commentActions.threads.filter((thread) => !thread.isDeleted).length,
    [commentActions.threads],
  )

  const disconnect = useMutation({
    mutationFn: async () => {
      if (!window.azrev) return
      await window.azrev.auth.clearConnection()
    },
    onSuccess: async () => {
      qc.removeQueries({ queryKey: ['ado'] })
      qc.setQueryData(authStatusQueryKey, { configured: false })
      navigate('/login', { replace: true })
    },
  })

  const pullRequestStatus = pr.data ? getPullRequestStatusPresentation(pr.data.status) : null

  const toggleRepoExpanded = (id: string) => {
    setExpandedRepoIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isMac = isMacUA && Boolean(window.azrev)

  return (
    <div
      className={`flex h-screen min-h-0 flex-col text-slate-900 ${
        electronMacVibrancy ? 'bg-transparent' : 'bg-slate-50'
      }`}
    >
      <div className="flex min-h-0 flex-1">
        <MainWorkspaceSidebar
          sidebarRef={sidebarRef}
          sidebarOpen={sidebarOpen}
          isMac={isMac}
          onToggleSidebar={toggleSidebar}
          statusFilterRef={statusFilterRef}
          statusFilterOpen={statusFilterOpen}
          onToggleStatusFilterOpen={() => setStatusFilterOpen((v) => !v)}
          pullRequestStatusFilters={pullRequestStatusFilters}
          assignedToMeOnly={assignedToMeOnly}
          onPullRequestStatusFiltersChange={setPullRequestStatusFilters}
          onAssignedToMeOnlyChange={setAssignedToMeOnly}
          projectName={projectName}
          organization={organization}
          repos={repos}
          expandedRepoIds={expandedRepoIds}
          onToggleRepoExpanded={toggleRepoExpanded}
          repositoryId={repositoryId}
          pullRequestId={pullRequestId}
          onSelectPullRequestInRepository={selectPullRequestInRepository}
          projects={projects}
          projectId={projectId}
          onSetProject={setProject}
          onSignOut={() => disconnect.mutate()}
          signOutPending={disconnect.isPending}
        />

        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-white">
          {!pullRequestId ? (
            <MainWorkspaceNoPrSelected
              showMainSidebarToggle={showMainSidebarToggle}
              isMac={isMac}
              onToggleSidebar={toggleSidebar}
            />
          ) : (
            <PullRequestReviewWorkspace
              showMainSidebarToggle={showMainSidebarToggle}
              isMac={isMac}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={toggleSidebar}
              prLoading={pr.isLoading}
              prDetail={pr.data}
              pullRequestStatus={pullRequestStatus}
              iterationId={iterationId}
              repositoryName={repositoryName}
              changesLoading={changes.isLoading}
              changeEntries={changeEntries}
              selectedChangePath={selectedChangePath}
              onSelectChangePath={setSelectedChangePath}
              fileDiff={fileDiff}
              pullRequestActions={pullRequestActions}
              pullRequestMutationError={prMutationError}
              onDismissPullRequestMutationError={dismissPrMutationError}
              commentActions={commentActions}
              commentsPanelOpen={commentsPanelOpen}
              commentsPanelCount={commentsPanelCount}
              onToggleCommentsPanel={() => setCommentsPanelOpen((open) => !open)}
            />
          )}
        </main>

        {pullRequestId ? (
          <aside
            aria-hidden={!commentsPanelOpen}
            className={`flex shrink-0 overflow-hidden border-l transition-[width,border-color] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width] bg-white ${
              commentsPanelOpen ? 'border-slate-200 w-96' : 'w-0 border-transparent'
            }`}
          >
            <div
              className={`flex h-full min-h-0 w-96 shrink-0 flex-col transition-[opacity,transform] duration-200 ease-out ${
                commentsPanelOpen
                  ? 'translate-x-0 opacity-100 delay-100'
                  : 'pointer-events-none translate-x-4 opacity-0'
              }`}
            >
              <PullRequestCommentsPanel
                threads={commentActions.threads}
                loading={commentActions.threadsLoading}
                error={commentActions.threadsError}
                creatingThread={commentActions.creatingThread}
                replyingThread={commentActions.replyingThread}
                selectedFilePath={selectedChangePath}
                onCreateGeneralComment={commentActions.onCreateGeneralComment}
                onReplyToThread={commentActions.onReplyToThread}
                onSelectThreadFile={setSelectedChangePath}
              />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}
