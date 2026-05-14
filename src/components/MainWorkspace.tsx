import {
  AlertCircleIcon,
  FilterMailIcon,
  Folder01Icon,
  FolderOpenIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestDraftIcon,
  GitPullRequestIcon,
  Tick01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement } from '@hugeicons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { readStoredProjectId, writeStoredProjectId } from '../lib/selectedProjectStorage'
import {
  authStatusQueryKey,
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
import { RepoPullRequestList, type PullRequestStatusFilter } from './RepoPullRequestList'
import { SidenavAccountMenu } from './SidenavAccountMenu'

const isMacUA =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent)

const electronMacVibrancy =
  typeof window !== 'undefined' && window.azrev?.nativeVibrancyEnabled === true

const popoverSurface =
  'rounded-2xl border border-[#EEEEEE] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)]'
const textPrimary = 'text-[#1A1A1A]'
const textHeaderLabel = 'text-[#A9A9AA]'
const rowHover = 'rounded-lg hover:bg-slate-900/5'
const panelRow = 'flex h-8 min-h-8 max-h-8 w-full shrink-0 items-center gap-3 px-3'
const iconPrimary = 'text-[#1A1A1A]'
const iconMuted = 'text-[#737373]'

type PullRequestStatusPresentation = {
  icon: IconSvgElement
  label: string
  className: string
}

type PullRequestStatusFilterOption = {
  value: PullRequestStatusFilter
  label: string
  icon?: IconSvgElement
}

const pullRequestStatusFilterOptions: readonly PullRequestStatusFilterOption[] = [
  { value: 'open', label: 'Open', icon: GitPullRequestIcon },
  { value: 'closed', label: 'Closed', icon: GitPullRequestClosedIcon },
  { value: 'merged', label: 'Merged', icon: GitMergeIcon },
  { value: 'draft', label: 'Draft', icon: GitPullRequestDraftIcon },
]
const defaultPullRequestStatusFilters = pullRequestStatusFilterOptions.map((option) => option.value)

type SidenavPullRequestFilterMenuProps = {
  rootRef: RefObject<HTMLDivElement>
  open: boolean
  statusFilters: readonly PullRequestStatusFilter[]
  onToggleOpen: () => void
  onStatusFiltersChange: (statusFilters: PullRequestStatusFilter[]) => void
}

function SidenavPullRequestFilterMenu({
  rootRef,
  open,
  statusFilters,
  onToggleOpen,
  onStatusFiltersChange,
}: SidenavPullRequestFilterMenuProps) {
  const isDefaultStatusSelection = statusFilters.length === defaultPullRequestStatusFilters.length

  const toggleStatusFilter = (statusFilter: PullRequestStatusFilter) => {
    if (statusFilters.includes(statusFilter)) {
      onStatusFiltersChange(statusFilters.filter((value) => value !== statusFilter))
      return
    }
    onStatusFiltersChange([...statusFilters, statusFilter])
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Filter pull requests"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-900/5 hover:text-slate-800 ${
          open || !isDefaultStatusSelection ? 'bg-slate-900/5 text-slate-800' : ''
        }`}
        onClick={onToggleOpen}
      >
        <HugeiconsIcon icon={FilterMailIcon} size={15} strokeWidth={1.6} aria-hidden />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Pull request filters"
          className={`absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden ${popoverSurface}`}
        >
          <div className="flex flex-col px-2 pb-2 pt-2">
            <div className={`${panelRow} text-xs font-medium ${textHeaderLabel}`}>
              <span className="min-w-0 truncate">Status</span>
            </div>

            <div role="menu" aria-label="Status filters">
              {pullRequestStatusFilterOptions.map((option) => {
                const selected = statusFilters.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={selected}
                    className={`${panelRow} rounded-lg text-left text-xs font-normal ${textPrimary} ${rowHover}`}
                    onClick={() => toggleStatusFilter(option.value)}
                  >
                    {option.icon ? (
                      <HugeiconsIcon
                        icon={option.icon}
                        size={15}
                        strokeWidth={1.5}
                        className={`shrink-0 ${iconMuted}`}
                        aria-hidden
                      />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
                      {selected ? (
                        <HugeiconsIcon
                          icon={Tick01Icon}
                          size={14}
                          strokeWidth={1.75}
                          className={iconPrimary}
                          aria-hidden
                        />
                      ) : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function formatPullRequestStatus(status: string) {
  return status
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getPullRequestStatusPresentation(status: string): PullRequestStatusPresentation {
  const normalizedStatus = status.trim().toLowerCase()

  switch (normalizedStatus) {
    case 'active':
    case 'open':
      return {
        icon: GitPullRequestIcon,
        label: 'Open',
        className: 'text-cyan-700',
      }
    case 'abandoned':
    case 'closed':
      return {
        icon: GitPullRequestClosedIcon,
        label: 'Closed',
        className: 'text-slate-500',
      }
    case 'completed':
    case 'merged':
      return {
        icon: GitMergeIcon,
        label: 'Merged',
        className: 'text-emerald-700',
      }
    case 'draft':
      return {
        icon: GitPullRequestDraftIcon,
        label: 'Draft',
        className: 'text-violet-700',
      }
    default:
      return {
        icon: AlertCircleIcon,
        label: formatPullRequestStatus(status) || 'Unknown',
        className: 'text-amber-700',
      }
  }
}

export function MainWorkspace() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const auth = useAuthStatus()
  const organization = auth.data?.organization
  const statusFilterRef = useRef<HTMLDivElement>(null)

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
  const [pullRequestStatusFilters, setPullRequestStatusFilters] = useState<PullRequestStatusFilter[]>(
    () => [...defaultPullRequestStatusFilters],
  )
  const [statusFilterOpen, setStatusFilterOpen] = useState(false)

  const closeStatusFilter = useCallback(() => setStatusFilterOpen(false), [])

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
      qc.removeQueries({ queryKey: ['ado'] })
      qc.setQueryData(authStatusQueryKey, { configured: false })
      navigate('/login', { replace: true })
    },
  })

  const entries = filterDiffableChanges(changes.data?.changeEntries)
  const pullRequestStatus = pr.data
    ? getPullRequestStatusPresentation(pr.data.status)
    : null

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
          <div className={`app-region-drag flex h-11 shrink-0 items-center px-3 ${isMac ? 'pl-[76px]' : ''}`}>
            <span className="truncate text-xs font-semibold tracking-tight text-slate-500">AzRev</span>
          </div>

          <div className="app-region-no-drag scroll-viewport min-h-0 flex-1 overflow-y-auto px-2 py-2">
            <div className="relative mb-1 flex items-center justify-between px-1">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Repositories</div>
              <SidenavPullRequestFilterMenu
                rootRef={statusFilterRef}
                open={statusFilterOpen}
                statusFilters={pullRequestStatusFilters}
                onToggleOpen={() => setStatusFilterOpen((v) => !v)}
                onStatusFiltersChange={setPullRequestStatusFilters}
              />
            </div>
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
                          statusFilters={pullRequestStatusFilters}
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
                ) : pr.data && pullRequestStatus ? (
                  <div>
                    <h2 className="text-lg font-medium text-slate-900">
                      <span
                        className={`inline-flex items-center gap-1.5 align-middle font-mono ${pullRequestStatus.className}`}
                        title={`Pull request status: ${pullRequestStatus.label}`}
                      >
                        <HugeiconsIcon
                          icon={pullRequestStatus.icon}
                          size={18}
                          strokeWidth={1.7}
                          aria-label={`Pull request ${pullRequestStatus.label}`}
                        />
                        !{pr.data.pullRequestId}
                      </span>{' '}
                      {pr.data.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {pullRequestStatus.label}
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
                <div className="app-region-drag flex w-96 shrink-0 min-h-0 flex-col border-r border-slate-200 bg-white">
                  <div className="app-region-no-drag scroll-viewport min-h-0 flex-1 overflow-y-auto px-3 py-3">
                    <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Files</div>
                    {changes.isLoading ? (
                      <p className="text-sm text-slate-500">Loading changes…</p>
                    ) : entries.length === 0 ? (
                      <p className="text-sm text-slate-500">No file changes in this iteration.</p>
                    ) : (
                      <ul className="space-y-px">
                        {entries.map((e) => {
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
                                onClick={() => setSelectedChangePath(path)}
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
          )}
        </main>
      </div>
    </div>
  )
}
