import type { UseQueryResult } from '@tanstack/react-query'
import type { GitPullRequestChangeEntry, GitPullRequestDetail } from '../../lib/adoTypes'
import { normalizeChangeType } from '../../queries/adoQueries'
import { FileDiffPane } from '../FileDiffPane'
import { ApplicationHeader } from './ApplicationHeader'
import type { PullRequestHeaderActions } from './pullRequestActionUiState'
import type { PullRequestStatusPresentation } from './pullRequestStatusPresentation'
import { formatBranchRef } from './pullRequestStatusPresentation'
import { SidebarToggleButton } from './SidebarToggleButton'

type SelectedFileDiffData =
  | { kind: 'binary'; displayPath: string }
  | { kind: 'too-large'; displayPath: string }
  | { kind: 'text'; displayPath: string; oldText: string; newText: string }

type PullRequestReviewWorkspaceProps = {
  showMainSidebarToggle: boolean
  isMac: boolean
  sidebarOpen: boolean
  onToggleSidebar: () => void
  prLoading: boolean
  prDetail: GitPullRequestDetail | undefined
  pullRequestStatus: PullRequestStatusPresentation | null
  iterationId: number | undefined
  repositoryName: string | null
  changesLoading: boolean
  changeEntries: GitPullRequestChangeEntry[]
  selectedChangePath: string | null
  onSelectChangePath: (path: string) => void
  fileDiff: UseQueryResult<SelectedFileDiffData>
  pullRequestActions?: PullRequestHeaderActions
  pullRequestMutationError: string | null
  onDismissPullRequestMutationError: () => void
}

export function PullRequestReviewWorkspace({
  showMainSidebarToggle,
  isMac,
  sidebarOpen,
  onToggleSidebar,
  prLoading,
  prDetail,
  pullRequestStatus,
  iterationId,
  repositoryName,
  changesLoading,
  changeEntries,
  selectedChangePath,
  onSelectChangePath,
  fileDiff,
  pullRequestActions,
  pullRequestMutationError,
  onDismissPullRequestMutationError,
}: PullRequestReviewWorkspaceProps) {
  return (
    <>
      <div className="app-region-drag shrink-0 border-b border-slate-200 px-5 pb-3 pt-2">
        {prLoading ? (
          <div className="flex items-start gap-3">
            {showMainSidebarToggle ? (
              <SidebarToggleButton
                expanded={false}
                className={`shrink-0 transition-opacity duration-200 ${isMac ? 'ml-14' : ''}`}
                onClick={onToggleSidebar}
              />
            ) : null}
            <p className="text-sm text-slate-500">Loading pull request…</p>
          </div>
        ) : prDetail && pullRequestStatus ? (
          <div className="min-w-0 w-full">
            <ApplicationHeader
              reserveSidebarToggleSpace={!sidebarOpen}
              showSidebarToggle={showMainSidebarToggle}
              sidebarToggleClassName={isMac ? 'w-24 pl-14' : 'w-10'}
              pullRequestId={prDetail.pullRequestId}
              title={prDetail.title}
              status={pullRequestStatus}
              onToggleSidebar={onToggleSidebar}
              pullRequestActions={pullRequestActions}
            />
            {pullRequestMutationError ? (
              <div className="app-region-no-drag mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-950">
                <span className="min-w-0 flex-1">{pullRequestMutationError}</span>
                <button
                  type="button"
                  className="shrink-0 rounded px-1.5 py-0.5 font-medium text-amber-900 hover:bg-amber-100"
                  onClick={onDismissPullRequestMutationError}
                >
                  Dismiss
                </button>
              </div>
            ) : null}
            <p className="mt-1 text-xs text-slate-500">
              {pullRequestStatus.label}
              {prDetail.createdBy?.displayName ? ` · ${prDetail.createdBy.displayName}` : ''}
              {iterationId != null ? ` · iteration ${iterationId}` : ''}
            </p>
            {repositoryName ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono text-slate-400">{repositoryName}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">from</span>
                  <span className="font-mono text-slate-700" title={prDetail.sourceRefName ?? undefined}>
                    {formatBranchRef(prDetail.sourceRefName)}
                  </span>
                </span>
                <span className="text-slate-300" aria-hidden>
                  →
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">into</span>
                  <span className="font-mono text-slate-700" title={prDetail.targetRefName ?? undefined}>
                    {formatBranchRef(prDetail.targetRefName)}
                  </span>
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="app-region-drag flex w-96 shrink-0 min-h-0 flex-col border-r border-slate-200 bg-white">
          <div className="app-region-no-drag scroll-viewport min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Files</div>
            {changesLoading ? (
              <p className="text-sm text-slate-500">Loading changes…</p>
            ) : changeEntries.length === 0 ? (
              <p className="text-sm text-slate-500">No file changes in this iteration.</p>
            ) : (
              <ul className="space-y-px">
                {changeEntries.map((e) => {
                  const path = e.item?.path ?? ''
                  const t = normalizeChangeType(e.changeType)
                  const isSelected = selectedChangePath === path
                  const displayPath = path.replace(/^\//, '')
                  return (
                    <li key={`${path}-${String(e.changeType)}`}>
                      <button
                        type="button"
                        title={displayPath}
                        className={`group flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-left font-mono text-xs transition-colors ${
                          isSelected
                            ? 'bg-slate-100 text-slate-950'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                        }`}
                        onClick={() => onSelectChangePath(path)}
                      >
                        <span
                          className={`w-9 shrink-0 text-[11px] ${
                            isSelected ? 'text-cyan-700' : 'text-slate-400 group-hover:text-slate-500'
                          }`}
                        >
                          {t}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{displayPath}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
        <div className="app-region-drag flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50/50">
          <div className="app-region-no-drag flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {!selectedChangePath ? (
              <p className="flex flex-1 items-center justify-center text-sm text-slate-500">
                Select a file to view its diff.
              </p>
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
            ) : fileDiff.data?.kind === 'too-large' ? (
              <p className="text-sm text-slate-600">
                This file is too large to display safely in the inline diff viewer.
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
  )
}
