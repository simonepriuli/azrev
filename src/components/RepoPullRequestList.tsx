import { useMemo, useState } from 'react'
import type { GitPullRequest } from '../lib/adoTypes'
import { formatRelativeShort } from '../lib/formatRelativeShort'
import { usePullRequests } from '../queries/adoQueries'

const VISIBLE_PR_COUNT = 5

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
  selectedPullRequestId: number | null
  onSelectPullRequest: (pullRequestId: number) => void
}

export function RepoPullRequestList({
  organization,
  projectName,
  repositoryId,
  expanded,
  selectedPullRequestId,
  onSelectPullRequest,
}: Props) {
  const prs = usePullRequests(organization, projectName, repositoryId, { enabled: expanded })
  const [showAll, setShowAll] = useState(false)

  const sorted = useMemo(
    () => sortPullRequestsByRecency(prs.data?.value ?? []),
    [prs.data?.value],
  )

  const visible = useMemo(() => {
    if (showAll || sorted.length <= VISIBLE_PR_COUNT) return sorted
    return sorted.slice(0, VISIBLE_PR_COUNT)
  }, [showAll, sorted])

  const hasMore = sorted.length > VISIBLE_PR_COUNT

  if (!expanded) {
    return null
  }

  return (
    <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-slate-200/80 pl-2 pb-1">
      {prs.isLoading ? (
        <li className="py-1 text-xs text-slate-500">Loading…</li>
      ) : prs.error ? (
        <li className="py-1 text-xs text-red-600">
          {prs.error instanceof Error ? prs.error.message : 'Failed to load pull requests'}
        </li>
      ) : sorted.length === 0 ? (
        <li className="py-1 text-xs text-slate-500">No pull requests.</li>
      ) : (
        <>
          {visible.map((prItem) => {
            const rel = formatRelativeShort(prItem.creationDate)
            const selected = selectedPullRequestId === prItem.pullRequestId
            return (
              <li key={prItem.pullRequestId}>
                <button
                  type="button"
                  className={`app-region-no-drag flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-slate-900/5 ${
                    selected ? 'bg-slate-900/10 text-slate-900' : 'text-slate-700'
                  }`}
                  onClick={() => onSelectPullRequest(prItem.pullRequestId)}
                >
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
                {showAll ? 'Show less' : `Show more (${sorted.length - VISIBLE_PR_COUNT})`}
              </button>
            </li>
          ) : null}
        </>
      )}
    </ul>
  )
}
