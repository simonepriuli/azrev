import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  useAuthStatus,
  useIterationChanges,
  useIterationDetail,
  useLatestIterationId,
  useProjects,
  usePullRequest,
  usePullRequests,
  useRepositories,
  useSelectedFileDiff,
  filterDiffableChanges,
  normalizeChangeType,
} from '../queries/adoQueries'
import { useNavStore } from '../store/navStore'
import { FileDiffPane } from './FileDiffPane'

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
    setRepository,
    setPullRequest,
    setSelectedChangePath,
  } = useNavStore()

  const projects = useProjects(organization)
  const repos = useRepositories(organization, projectName ?? undefined)
  const prs = usePullRequests(organization, projectName ?? undefined, repositoryId ?? undefined)
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

  return (
    <div className="flex h-screen min-h-0 flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-semibold tracking-tight text-white">AzRev</span>
          <span className="text-sm text-slate-400">
            {organization ? (
              <>
                Org <span className="text-slate-200">{organization}</span>
              </>
            ) : (
              'Not connected'
            )}
          </span>
        </div>
        <button
          type="button"
          className="text-sm text-slate-400 hover:text-white"
          onClick={() => disconnect.mutate()}
          disabled={disconnect.isPending}
        >
          Sign out
        </button>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-80 shrink-0 flex-col border-r border-slate-800 bg-slate-900/40">
          <div className="border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Projects
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {projects.isLoading ? (
              <p className="p-3 text-sm text-slate-500">Loading projects…</p>
            ) : projects.error ? (
              <p className="p-3 text-sm text-red-400">
                {projects.error instanceof Error ? projects.error.message : 'Failed to load projects'}
              </p>
            ) : (
              <ul className="py-1">
                {(projects.data?.value ?? []).map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-800/80 ${
                        projectId === p.id ? 'bg-slate-800 text-white' : 'text-slate-300'
                      }`}
                      onClick={() => setProject(p.id, p.name)}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {projectName ? (
            <>
              <div className="border-b border-t border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Repositories
              </div>
              <div className="max-h-48 overflow-y-auto">
                {repos.isLoading ? (
                  <p className="p-3 text-sm text-slate-500">Loading…</p>
                ) : repos.error ? (
                  <p className="p-3 text-sm text-red-400">
                    {repos.error instanceof Error ? repos.error.message : 'Failed to load repositories'}
                  </p>
                ) : (
                  <ul className="py-1">
                    {(repos.data?.value ?? []).map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-800/80 ${
                            repositoryId === r.id ? 'bg-slate-800 text-white' : 'text-slate-300'
                          }`}
                          onClick={() => setRepository(r.id, r.name)}
                        >
                          {r.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
          {repositoryId ? (
            <>
              <div className="border-b border-t border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Pull requests
              </div>
              <div className="max-h-56 overflow-y-auto">
                {prs.isLoading ? (
                  <p className="p-3 text-sm text-slate-500">Loading…</p>
                ) : prs.error ? (
                  <p className="p-3 text-sm text-red-400">
                    {prs.error instanceof Error ? prs.error.message : 'Failed to load pull requests'}
                  </p>
                ) : (prs.data?.value ?? []).length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">
                    No pull requests returned for this repository (showing up to 100, all statuses).
                  </p>
                ) : (
                  <ul className="py-1">
                    {(prs.data?.value ?? []).map((prItem) => (
                      <li key={prItem.pullRequestId}>
                        <button
                          type="button"
                          className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-800/80 ${
                            pullRequestId === prItem.pullRequestId
                              ? 'bg-slate-800 text-white'
                              : 'text-slate-300'
                          }`}
                          onClick={() => setPullRequest(prItem.pullRequestId)}
                        >
                          <span className="font-mono text-xs text-slate-500">!{prItem.pullRequestId}</span>{' '}
                          {prItem.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </aside>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {!pullRequestId ? (
            <div className="flex flex-1 items-center justify-center p-8 text-slate-500">
              Select a pull request to review.
            </div>
          ) : (
            <>
              <div className="border-b border-slate-800 px-4 py-3">
                {pr.isLoading ? (
                  <p className="text-sm text-slate-500">Loading pull request…</p>
                ) : pr.data ? (
                  <div>
                    <h2 className="text-lg font-medium text-white">
                      <span className="font-mono text-cyan-400">!{pr.data.pullRequestId}</span> {pr.data.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {pr.data.status}
                      {pr.data.createdBy?.displayName ? ` · ${pr.data.createdBy.displayName}` : ''}
                      {iterationId != null ? ` · iteration ${iterationId}` : ''}
                    </p>
                    {repositoryName ? (
                      <p className="mt-1 font-mono text-xs text-slate-400">
                        {repositoryName}: {pr.data.sourceRefName ?? ''} → {pr.data.targetRefName ?? ''}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex min-h-0 flex-1">
                <div className="w-72 shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-900/30 p-2">
                  <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Files</div>
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
                              className={`block w-full rounded px-2 py-1.5 text-left font-mono text-xs hover:bg-slate-800/80 ${
                                selectedChangePath === path ? 'bg-slate-800 text-white' : 'text-slate-300'
                              }`}
                              onClick={() => setSelectedChangePath(path)}
                            >
                              <span className="mr-2 text-slate-500">{t}</span>
                              {path.replace(/^\//, '')}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-3">
                  {!selectedChangePath ? (
                    <p className="text-sm text-slate-500">Select a file to view its diff.</p>
                  ) : fileDiff.isLoading ? (
                    <p className="text-sm text-slate-500">Loading file contents…</p>
                  ) : fileDiff.error ? (
                    <p className="text-sm text-red-400">
                      {fileDiff.error instanceof Error ? fileDiff.error.message : 'Failed to load diff'}
                    </p>
                  ) : fileDiff.data?.kind === 'binary' ? (
                    <p className="text-sm text-slate-400">
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
            </>
          )}
        </main>
      </div>
    </div>
  )
}
