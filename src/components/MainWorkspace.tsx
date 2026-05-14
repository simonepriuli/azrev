import { Folder01Icon, FolderOpenIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { readStoredProjectId, writeStoredProjectId } from '../lib/selectedProjectStorage'
import {
  useAuthStatus,
  useIterationChanges,
  useIterationDetail,
  useLatestIterationId,
  useProjects,
  usePullRequest,
  useRepositories,
  useSelectedFileDiff,
  filterDiffableChanges,
  normalizeChangeType,
} from '../queries/adoQueries'
import { useNavStore } from '../store/navStore'
import { FileDiffPane } from './FileDiffPane'
import { RepoPullRequestList } from './RepoPullRequestList'
import { SidenavAccountMenu } from './SidenavAccountMenu'

const isMacUA =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent)

const electronMacVibrancy =
  typeof window !== 'undefined' && window.azrev?.platform === 'darwin'

export function MainWorkspace() {
  const qc = useQueryClient()
  const auth = useAuthStatus()
  const organization = auth.data?.organization

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
  const iterationIdQuery = useLatestIterationId(
    organization,
    projectName ?? undefined,
    repositoryId ?? undefined,
    pullRequestId ?? undefined,
  )
  const iterationId = iterationIdQuery.data
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

  const disconnect = useMutation({
    mutationFn: async () => {
      if (!window.azrev) return
      await window.azrev.auth.clearConnection()
    },
    onSuccess: async () => {
      qc.clear()
      await qc.invalidateQueries({ queryKey: ['auth'] })
    },
  })

  const entries = filterDiffableChanges(changes.data?.changeEntries)

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
        <aside
          className={`flex w-[280px] shrink-0 flex-col border-r border-slate-200/90 ${
            electronMacVibrancy
              ? 'sidebar-translucent'
              : 'bg-white/55 backdrop-blur-xl backdrop-saturate-150'
          }`}
        >
          <div
            className={`app-region-drag flex h-11 shrink-0 items-center border-b border-slate-200/60 px-3 ${
              isMac ? 'pl-[76px]' : ''
            }`}
          >
            <span className="truncate text-xs font-semibold tracking-tight text-slate-500">AzRev</span>
          </div>

          <div className="app-region-no-drag scroll-viewport min-h-0 flex-1 overflow-y-auto px-2 py-2">
            <div className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Repositories</div>
            {!projectName ? (
              <p className="mt-2 px-1 text-xs text-slate-500">Choose a project in Settings below.</p>
            ) : repos.isLoading ? (
              <p className="mt-2 px-1 text-xs text-slate-500">Loading repositories…</p>
            ) : repos.error ? (
              <p className="mt-2 px-1 text-xs text-red-600">
                {repos.error instanceof Error ? repos.error.message : 'Failed to load repositories'}
              </p>
            ) : (
              <ul className="mt-1 space-y-0.5">
                {(repos.data?.value ?? []).map((r) => {
                  const expanded = expandedRepoIds.has(r.id)
                  const isRepoActive = repositoryId === r.id
                  return (
                    <li key={r.id} className="rounded-lg">
                      <div
                        className={`rounded-lg ${
                          isRepoActive && pullRequestId != null ? 'bg-slate-900/[0.04]' : ''
                        }`}
                      >
                        <button
                          type="button"
                          aria-expanded={expanded}
                          className="app-region-no-drag flex w-full items-center gap-2 rounded-lg px-1.5 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-900/5"
                          onClick={() => toggleRepoExpanded(r.id)}
                        >
                          <HugeiconsIcon
                            icon={expanded ? FolderOpenIcon : Folder01Icon}
                            size={14}
                            strokeWidth={1.5}
                            className="shrink-0 text-slate-500"
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate">{r.name}</span>
                        </button>
                      </div>
                      {organization && projectName ? (
                        <RepoPullRequestList
                          key={r.id}
                          organization={organization}
                          projectName={projectName}
                          repositoryId={r.id}
                          expanded={expanded}
                          selectedPullRequestId={repositoryId === r.id ? pullRequestId : null}
                          onSelectPullRequest={(id) => selectPullRequestInRepository(r.id, r.name, id)}
                        />
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <SidenavAccountMenu
            organization={organization}
            projects={projects.data?.value ?? []}
            projectsLoading={projects.isLoading}
            projectsError={projects.error instanceof Error ? projects.error : null}
            projectId={projectId}
            setProject={setProject}
            onSignOut={() => disconnect.mutate()}
            signOutPending={disconnect.isPending}
          />
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
          {!pullRequestId ? (
            <div className="app-region-drag flex flex-1 items-center justify-center p-8">
              <p className="app-region-no-drag text-sm text-slate-500">Select a pull request to review.</p>
            </div>
          ) : (
            <>
              <div className="app-region-drag shrink-0 border-b border-slate-200 px-5 py-3">
                {pr.isLoading ? (
                  <p className="text-sm text-slate-500">Loading pull request…</p>
                ) : pr.data ? (
                  <div>
                    <h2 className="text-lg font-medium text-slate-900">
                      <span className="font-mono text-cyan-700">!{pr.data.pullRequestId}</span> {pr.data.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {pr.data.status}
                      {pr.data.createdBy?.displayName ? ` · ${pr.data.createdBy.displayName}` : ''}
                      {iterationId != null ? ` · iteration ${iterationId}` : ''}
                    </p>
                    {repositoryName ? (
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {repositoryName}: {pr.data.sourceRefName ?? ''} → {pr.data.targetRefName ?? ''}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex min-h-0 flex-1">
                <div className="app-region-drag flex w-72 shrink-0 min-h-0 flex-col border-r border-slate-200 bg-slate-50/80 p-2">
                  <div className="app-region-no-drag scroll-viewport min-h-0 flex-1 overflow-y-auto">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Files</div>
                    {changes.isLoading ? (
                      <p className="text-sm text-slate-500">Loading changes…</p>
                    ) : entries.length === 0 ? (
                      <p className="text-sm text-slate-500">No file changes in this iteration.</p>
                    ) : (
                      <ul className="space-y-0.5">
                        {entries.map((e) => {
                          const path = e.item?.path ?? ''
                          const t = normalizeChangeType(e.changeType)
                          return (
                            <li key={`${path}-${String(e.changeType)}`}>
                              <button
                                type="button"
                                className={`block w-full rounded-md px-2 py-1.5 text-left font-mono text-xs hover:bg-white ${
                                  selectedChangePath === path
                                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-700'
                                }`}
                                onClick={() => setSelectedChangePath(path)}
                              >
                                <span className="mr-2 text-slate-400">{t}</span>
                                {path.replace(/^\//, '')}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="app-region-drag flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50/50 p-3">
                  <div className="app-region-no-drag flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
                    {!selectedChangePath ? (
                      <p className="text-sm text-slate-500">Select a file to view its diff.</p>
                    ) : fileDiff.isLoading ? (
                      <p className="text-sm text-slate-500">Loading file contents…</p>
                    ) : fileDiff.error ? (
                      <p className="text-sm text-red-600">
                        {fileDiff.error instanceof Error ? fileDiff.error.message : 'Failed to load diff'}
                      </p>
                    ) : fileDiff.data?.kind === 'binary' ? (
                      <p className="text-sm text-slate-600">
                        Binary or non-text file — diff view is only available for text files.
                      </p>
                    ) : fileDiff.data?.kind === 'text' ? (
                      <FileDiffPane
                        displayPath={fileDiff.data.displayPath}
                        oldText={fileDiff.data.oldText}
                        newText={fileDiff.data.newText}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
