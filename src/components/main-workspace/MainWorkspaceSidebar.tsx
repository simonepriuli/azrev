import { Folder01Icon, FolderOpenIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { RefObject } from 'react'
import type { GitRepository } from '../../lib/adoTypes'
import { RepoPullRequestList, type PullRequestStatusFilter } from '../RepoPullRequestList'
import { SidenavAccountMenu } from '../SidenavAccountMenu'
import { electronMacVibrancy } from './constants'
import { SidenavPullRequestFilterMenu } from './SidenavPullRequestFilterMenu'
import { SidebarToggleButton } from './SidebarToggleButton'

type ReposState = {
  isLoading: boolean
  error: unknown
  data?: { value: GitRepository[] }
}

type ProjectsState = {
  isLoading: boolean
  error: unknown
  data?: { value: { id: string; name: string }[] }
}

type MainWorkspaceSidebarProps = {
  sidebarRef: RefObject<HTMLElement>
  sidebarOpen: boolean
  isMac: boolean
  onToggleSidebar: () => void
  statusFilterRef: RefObject<HTMLDivElement>
  statusFilterOpen: boolean
  onToggleStatusFilterOpen: () => void
  pullRequestStatusFilters: PullRequestStatusFilter[]
  onPullRequestStatusFiltersChange: (filters: PullRequestStatusFilter[]) => void
  projectName: string | null
  organization: string | undefined
  repos: ReposState
  expandedRepoIds: ReadonlySet<string>
  onToggleRepoExpanded: (repositoryId: string) => void
  repositoryId: string | null
  pullRequestId: number | null
  onSelectPullRequestInRepository: (repositoryId: string, repositoryName: string, pullRequestId: number) => void
  projects: ProjectsState
  projectId: string | null
  onSetProject: (projectId: string, projectName: string) => void
  onSignOut: () => void
  signOutPending: boolean
}

export function MainWorkspaceSidebar({
  sidebarRef,
  sidebarOpen,
  isMac,
  onToggleSidebar,
  statusFilterRef,
  statusFilterOpen,
  onToggleStatusFilterOpen,
  pullRequestStatusFilters,
  onPullRequestStatusFiltersChange,
  projectName,
  organization,
  repos,
  expandedRepoIds,
  onToggleRepoExpanded,
  repositoryId,
  pullRequestId,
  onSelectPullRequestInRepository,
  projects,
  projectId,
  onSetProject,
  onSignOut,
  signOutPending,
}: MainWorkspaceSidebarProps) {
  return (
    <aside
      ref={sidebarRef}
      aria-hidden={!sidebarOpen}
      className={`flex shrink-0 overflow-hidden border-r transition-[width,border-color] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width] ${
        sidebarOpen ? 'w-[280px] border-slate-200/90' : 'w-0 border-transparent'
      } ${
        electronMacVibrancy
          ? 'sidebar-translucent'
          : 'bg-white/55 backdrop-blur-xl backdrop-saturate-150'
      }`}
    >
      <div
        className={`flex w-[280px] shrink-0 flex-col transition-[opacity,transform] duration-200 ease-out ${
          sidebarOpen
            ? 'translate-x-0 opacity-100 delay-100'
            : 'pointer-events-none -translate-x-4 opacity-0'
        }`}
      >
        <div className={`app-region-drag flex h-11 shrink-0 items-center px-3 ${isMac ? 'pl-[76px]' : ''}`}>
          <SidebarToggleButton expanded={true} onClick={onToggleSidebar} />
        </div>

        <div className="app-region-no-drag scroll-viewport min-h-0 flex-1 overflow-y-auto px-2 py-2">
          <div className="relative mb-1 flex items-center justify-between px-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Repositories</div>
            <SidenavPullRequestFilterMenu
              rootRef={statusFilterRef}
              open={statusFilterOpen}
              statusFilters={pullRequestStatusFilters}
              onToggleOpen={onToggleStatusFilterOpen}
              onStatusFiltersChange={onPullRequestStatusFiltersChange}
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
                return (
                  <li key={r.id} className="rounded-lg">
                    <div className="rounded-lg">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        className="app-region-no-drag flex w-full items-center gap-2 rounded-lg px-1.5 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-900/5"
                        onClick={() => onToggleRepoExpanded(r.id)}
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
                        onSelectPullRequest={(id) => onSelectPullRequestInRepository(r.id, r.name, id)}
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
          setProject={onSetProject}
          onSignOut={onSignOut}
          signOutPending={signOutPending}
        />
      </div>
    </aside>
  )
}
