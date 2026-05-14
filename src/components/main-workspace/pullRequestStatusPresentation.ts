import {
  AlertCircleIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestDraftIcon,
  GitPullRequestIcon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'

export type PullRequestStatusPresentation = {
  icon: IconSvgElement
  label: string
  className: string
}

function formatPullRequestStatus(status: string) {
  return status
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function getPullRequestStatusPresentation(status: string): PullRequestStatusPresentation {
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

export function formatBranchRef(refName: string | null | undefined) {
  return refName?.replace(/^refs\/heads\//, '').replace(/^refs\/tags\//, '') ?? 'Unknown branch'
}
