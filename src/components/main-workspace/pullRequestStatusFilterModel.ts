import type { PullRequestStatusFilter } from '../RepoPullRequestList'

/** Display order for sidenav status filters and default “all selected” set. */
export const PULL_REQUEST_STATUS_FILTERS: readonly PullRequestStatusFilter[] = [
  'open',
  'closed',
  'merged',
  'draft',
]

export const defaultPullRequestStatusFilters: PullRequestStatusFilter[] = [...PULL_REQUEST_STATUS_FILTERS]
