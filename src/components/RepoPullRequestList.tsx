import { useQueries } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import type { GitPullRequest } from '../lib/adoTypes'
import { formatRelativeShort } from '../lib/formatRelativeShort'
import { isAssignedReviewer } from '../lib/pullRequestReviewerIdentity'
import {
  fetchPullRequestReviewers,
  pullRequestReviewersQueryKey,
  useCurrentAdoReviewerIdentities,
  usePullRequests,
} from '../queries/adoQueries'

const VISIBLE_PR_COUNT = 5

export type PullRequestStatusFilter = 'open' | 'closed' | 'merged' | 'draft'

function getPullRequestStatusFilter(status: string): PullRequestStatusFilter | 'other' {
  const normalizedStatus = status.trim().toLowerCase()

  switch (normalizedStatus) {
    case 'active':
    case 'open':
      return 'open'
    case 'abandoned':
    case 'closed':
      return 'closed'
    case 'completed':
    case 'merged':
      return 'merged'
    case 'draft':
      return 'draft'
    default:
      return 'other'
  }
}

function sortPullRequestsByRecency(items: GitPullRequest[]) {
  return [...items].sort((a, b) => {
    const ta = a.creationDate ? new Date(a.creationDate).getTime() : 0
    const tb = b.creationDate ? new Date(b.creationDate).getTime() : 0
    if (tb !== ta) return tb - ta
    return b.pullRequestId - a.pullRequestId
  })
}

type Props = {
  organization: string
  projectName: string
  repositoryId: string
  expanded: boolean
  statusFilters: readonly PullRequestStatusFilter[]
  selectedPullRequestId: number | null
  onSelectPullRequest: (pullRequestId: number) => void
}

export function RepoPullRequestList({
  organization,
  projectName,
  repositoryId,
  expanded,
  statusFilters,
  selectedPullRequestId,
  onSelectPullRequest,
}: Props) {
  const prs = usePullRequests(organization, projectName, repositoryId, { enabled: expanded })
  const currentReviewerIdentities = useCurrentAdoReviewerIdentities(expanded ? organization : undefined)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    setShowAll(false)
  }, [statusFilters])

  const sorted = useMemo(
    () => sortPullRequestsByRecency(prs.data?.value ?? []),
    [prs.data?.value],
  )

  const filtered = useMemo(() => {
    const selectedStatuses = new Set(statusFilters)
    return sorted.filter((prItem) => {
      const status = getPullRequestStatusFilter(prItem.status)
      return status !== 'other' && selectedStatuses.has(status)
    })
  }, [sorted, statusFilters])

  const visible = useMemo(() => {
    if (showAll || filtered.length <= VISIBLE_PR_COUNT) return filtered
    return filtered.slice(0, VISIBLE_PR_COUNT)
  }, [filtered, showAll])

  const reviewerBackdropQueries = useQueries({
    queries: visible.map((prItem) => ({
      queryKey: pullRequestReviewersQueryKey(organization, projectName, repositoryId, prItem.pullRequestId),
      queryFn: () =>
        fetchPullRequestReviewers(
          organization,
          projectName,
          repositoryId,
          prItem.pullRequestId,
        ),
      enabled:
        expanded &&
        Boolean(organization && projectName && repositoryId) &&
        currentReviewerIdentities.identities.length > 0,
      staleTime: 30_000,
    })),
  })

  const hasMore = filtered.length > VISIBLE_PR_COUNT

  if (!expanded) {
    return null
  }

  return (
    <ul className="ml-5 mt-0.5 space-y-0.5 pb-1">
      {prs.isLoading ? (
        <li className="py-1 text-xs text-slate-500">Loading…</li>
      ) : prs.error ? (
        <li className="py-1 text-xs text-red-600">
          {prs.error instanceof Error ? prs.error.message : 'Failed to load pull requests'}
        </li>
      ) : sorted.length === 0 ? (
        <li className="py-1 text-xs text-slate-500">No pull requests.</li>
      ) : filtered.length === 0 ? (
        <li className="py-1 text-xs text-slate-500">No pull requests matching filter.</li>
      ) : (
        <>
          {visible.map((prItem, index) => {
            const rel = formatRelativeShort(prItem.creationDate)
            const selected = selectedPullRequestId === prItem.pullRequestId
            const fetchResult = reviewerBackdropQueries[index]
            const fetched = fetchResult?.data
            const resolvedReviewers =
              fetched != null && fetched.length > 0 ? fetched : (prItem.reviewers ?? [])
            const showReviewerDot = isAssignedReviewer(
              resolvedReviewers,
              currentReviewerIdentities.identities,
            )
            return (
              <li key={prItem.pullRequestId}>
                <button
                  type="button"
                  className={`app-region-no-drag flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-slate-900/5 ${
                    selected ? 'bg-slate-900/10 text-slate-900' : 'text-slate-700'
                  }`}
                  onClick={() => onSelectPullRequest(prItem.pullRequestId)}
                  aria-label={
                    showReviewerDot
                      ? `Pull request !${prItem.pullRequestId}: ${prItem.title}. Assigned to you for review.`
                      : undefined
                  }
                >
                  <span
                    className="flex w-4 shrink-0 justify-center pt-1"
                    title={showReviewerDot ? 'Assigned to you for review' : undefined}
                  >
                    {showReviewerDot ? (
                      <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-mono text-[10px] text-slate-400">!{prItem.pullRequestId}</span>{' '}
                    <span className="font-medium">{prItem.title}</span>
                  </span>
                  {rel ? (
                    <span className="shrink-0 tabular-nums text-[10px] text-slate-400" title={prItem.creationDate}>
                      {rel}
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
          {hasMore ? (
            <li>
              <button
                type="button"
                className="app-region-no-drag w-full rounded-md px-2 py-1 text-left text-[11px] font-medium text-slate-500 hover:bg-slate-900/5 hover:text-slate-800"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? 'Show less' : `Show more (${filtered.length - VISIBLE_PR_COUNT})`}
              </button>
            </li>
          ) : null}
        </>
      )}
    </ul>
  )
}
