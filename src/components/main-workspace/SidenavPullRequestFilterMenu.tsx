import {
  FilterMailIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestDraftIcon,
  GitPullRequestIcon,
  Tick01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement } from '@hugeicons/react'
import type { RefObject } from 'react'
import type { PullRequestStatusFilter } from '../RepoPullRequestList'
import {
  iconMuted,
  iconPrimary,
  panelRow,
  popoverSurface,
  rowHover,
  textHeaderLabel,
  textPrimary,
} from './constants'
import { PULL_REQUEST_STATUS_FILTERS } from './pullRequestStatusFilterModel'

type PullRequestStatusFilterOption = {
  value: PullRequestStatusFilter
  label: string
  icon?: IconSvgElement
}

const statusIcons: Record<PullRequestStatusFilter, IconSvgElement> = {
  open: GitPullRequestIcon,
  closed: GitPullRequestClosedIcon,
  merged: GitMergeIcon,
  draft: GitPullRequestDraftIcon,
}

const statusLabels: Record<PullRequestStatusFilter, string> = {
  open: 'Open',
  closed: 'Closed',
  merged: 'Merged',
  draft: 'Draft',
}

const pullRequestStatusFilterOptions: readonly PullRequestStatusFilterOption[] = PULL_REQUEST_STATUS_FILTERS.map(
  (value) => ({
    value,
    label: statusLabels[value],
    icon: statusIcons[value],
  }),
)

type SidenavPullRequestFilterMenuProps = {
  rootRef: RefObject<HTMLDivElement>
  open: boolean
  statusFilters: readonly PullRequestStatusFilter[]
  onToggleOpen: () => void
  onStatusFiltersChange: (statusFilters: PullRequestStatusFilter[]) => void
}

export function SidenavPullRequestFilterMenu({
  rootRef,
  open,
  statusFilters,
  onToggleOpen,
  onStatusFiltersChange,
}: SidenavPullRequestFilterMenuProps) {
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
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-900/5 hover:text-slate-800"
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
