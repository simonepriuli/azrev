import type { AdoIdentityRef, GitPullRequestDetail, GitPullRequestReviewer } from '../../lib/adoTypes'
import { findReviewerEntryForUser } from '../../lib/pullRequestReviewerIdentity'

export type PullRequestHeaderActions = {
  showApprove: boolean
  showMerge: boolean
  onApprove: () => void
  onMerge: () => void
  approvePending: boolean
  mergePending: boolean
  approveDisabled: boolean
  mergeDisabled: boolean
  approveDisabledReason: string | null
  mergeDisabledReason: string | null
}

export type PrActionAuthContext = {
  userId: string | undefined
  userUniqueName: string | undefined
  userIdentities?: readonly AdoIdentityRef[]
  identityLoading: boolean
}

export type PullRequestActionUiState = {
  showApprove: boolean
  showMerge: boolean
  myReviewerId: string | undefined
  approveDisabled: boolean
  approveDisabledReason: string | null
  mergeDisabled: boolean
  mergeDisabledReason: string | null
}

function normStatus(status: string) {
  return status.trim().toLowerCase()
}

function isTerminalStatus(status: string) {
  const n = normStatus(status)
  return n === 'completed' || n === 'merged' || n === 'abandoned' || n === 'closed'
}

function isActiveStatus(status: string) {
  const n = normStatus(status)
  return n === 'active' || n === 'open'
}

function findMyReviewer(
  reviewers: GitPullRequestReviewer[] | undefined,
  ctx: PrActionAuthContext,
): GitPullRequestReviewer | undefined {
  if (ctx.identityLoading) return undefined
  if (ctx.userIdentities && ctx.userIdentities.length > 0) {
    return findReviewerEntryForUser(reviewers, ctx.userIdentities)
  }
  return findReviewerEntryForUser(reviewers, ctx.userId, ctx.userUniqueName)
}

function getApprovalReviewerId(
  reviewer: GitPullRequestReviewer | undefined,
  ctx: PrActionAuthContext,
): string | undefined {
  if (!reviewer) return undefined
  if (reviewer.isContainer !== true) return reviewer.id
  return ctx.userIdentities?.find((identity) => identity.isContainer !== true && identity.id)?.id ?? ctx.userId
}

function mergeStatusBlockReason(mergeStatus: string | undefined): string | null {
  if (mergeStatus == null || mergeStatus === '') return null
  const m = mergeStatus.trim().toLowerCase()
  if (m === 'succeeded') return null
  if (m === 'queued') return 'Merge is already queued.'
  if (m === 'conflicts') return 'Resolve merge conflicts before merging.'
  if (m === 'failure') return 'Merge checks failed; fix issues before merging.'
  if (m === 'rejected') return 'Branch policies rejected the merge.'
  return `Merge unavailable (${mergeStatus}).`
}

const emptyState: PullRequestActionUiState = {
  showApprove: false,
  showMerge: false,
  myReviewerId: undefined,
  approveDisabled: true,
  approveDisabledReason: null,
  mergeDisabled: true,
  mergeDisabledReason: null,
}

export function getPullRequestActionUiState(
  pr: GitPullRequestDetail | undefined,
  ctx: PrActionAuthContext,
): PullRequestActionUiState {
  if (!pr) return emptyState

  if (isTerminalStatus(pr.status) || !isActiveStatus(pr.status)) {
    return emptyState
  }

  const myReviewer = findMyReviewer(pr.reviewers, ctx)
  const myReviewerId = getApprovalReviewerId(myReviewer, ctx)
  const showApprove = Boolean(myReviewerId)
  const myVote = myReviewer?.vote ?? 0
  const alreadyApproved = myVote >= 10

  let approveDisabled = false
  let approveDisabledReason: string | null = null

  if (pr.isDraft === true) {
    approveDisabled = true
    approveDisabledReason = 'Draft pull requests cannot be approved from here.'
  } else if (alreadyApproved) {
    approveDisabled = true
    approveDisabledReason = 'You already approved this pull request.'
  }

  const showMerge = true

  let mergeDisabled = false
  let mergeDisabledReason: string | null = null

  if (pr.isDraft === true) {
    mergeDisabled = true
    mergeDisabledReason = 'Publish the pull request (exit draft) before merging.'
  } else {
    const mergeBlock = mergeStatusBlockReason(pr.mergeStatus)
    if (mergeBlock) {
      mergeDisabled = true
      mergeDisabledReason = mergeBlock
    }
  }

  if (!mergeDisabled) {
    const pendingRequired = (pr.reviewers ?? []).filter(
      (r) => r.isRequired === true && (r.vote ?? 0) < 10,
    )
    if (pendingRequired.length > 0) {
      mergeDisabled = true
      mergeDisabledReason = 'Waiting for all required reviewers to approve.'
    }
  }

  if (!mergeDisabled && !pr.lastMergeSourceCommit?.commitId) {
    mergeDisabled = true
    mergeDisabledReason = 'Merge source commit is not available yet.'
  }

  return {
    showApprove,
    showMerge,
    myReviewerId,
    approveDisabled,
    approveDisabledReason,
    mergeDisabled,
    mergeDisabledReason,
  }
}
