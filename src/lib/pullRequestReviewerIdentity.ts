import type { AdoIdentityRef, GitPullRequestReviewer } from './adoTypes'

type UserIdentityInput = AdoIdentityRef | undefined

function normalizeIdentityValue(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase()
  return normalized === '' ? undefined : normalized
}

function addIdentityValue(values: Set<string>, value: string | undefined) {
  const normalized = normalizeIdentityValue(value)
  if (!normalized) return

  values.add(normalized)

  const semicolonTail = normalized.split(';').at(-1)
  if (semicolonTail && semicolonTail !== normalized) {
    values.add(semicolonTail)
  }
}

function getIdentityValues(identity: UserIdentityInput): Set<string> {
  const values = new Set<string>()
  if (!identity) return values

  addIdentityValue(values, identity.id)
  addIdentityValue(values, identity.uniqueName)
  addIdentityValue(values, identity.displayName)
  addIdentityValue(values, identity.descriptor)
  addIdentityValue(values, identity.subjectDescriptor)
  addIdentityValue(values, identity.providerDisplayName)
  addIdentityValue(values, identity.customDisplayName)
  addIdentityValue(values, identity.mailAddress)
  addIdentityValue(values, identity.emailAddress)

  for (const [key, rawValue] of Object.entries(identity.properties ?? {})) {
    const keyLower = key.toLowerCase()
    if (
      !keyLower.includes('account') &&
      !keyLower.includes('display') &&
      !keyLower.includes('email') &&
      !keyLower.includes('mail') &&
      !keyLower.includes('name')
    ) {
      continue
    }

    if (typeof rawValue === 'string') {
      addIdentityValue(values, rawValue)
    } else {
      addIdentityValue(values, rawValue?.$value)
      addIdentityValue(values, rawValue?.value)
    }
  }

  return values
}

function identityMatchesReviewer(
  reviewer: GitPullRequestReviewer,
  users: readonly UserIdentityInput[],
): boolean {
  const reviewerValues = getIdentityValues(reviewer)

  if (reviewerValues.size === 0) return false

  return users.some((user) => {
    for (const value of getIdentityValues(user)) {
      if (reviewerValues.has(value)) return true
    }
    return false
  })
}

/**
 * Locates the reviewer row (or nested `votedFor` entry for group reviewers)
 * that corresponds to the signed-in user.
 */
export function findReviewerEntryForUser(
  reviewers: GitPullRequestReviewer[] | undefined,
  userIdOrIdentities: string | readonly UserIdentityInput[] | undefined,
  userUniqueName?: string | undefined,
): GitPullRequestReviewer | undefined {
  const users =
    typeof userIdOrIdentities === 'string' || userIdOrIdentities == null
      ? [{ id: userIdOrIdentities, uniqueName: userUniqueName }]
      : userIdOrIdentities

  if (
    !users.some((user) => getIdentityValues(user).size > 0)
  ) {
    return undefined
  }

  for (const r of reviewers ?? []) {
    if (identityMatchesReviewer(r, users)) return r
    for (const vf of r.votedFor ?? []) {
      if (identityMatchesReviewer(vf, users)) return vf
    }
  }
  return undefined
}

/** True when the user is a reviewer and has not cast a vote yet (ADO vote 0 = no response). */
export function isAwaitingMyReview(
  reviewers: GitPullRequestReviewer[] | undefined,
  userIdOrIdentities: string | readonly UserIdentityInput[] | undefined,
  userUniqueName?: string | undefined,
): boolean {
  const entry = findReviewerEntryForUser(reviewers, userIdOrIdentities, userUniqueName)
  if (!entry) return false
  return (entry.vote ?? 0) === 0
}

/** True when the signed-in user is assigned as a required or optional PR reviewer. */
export function isAssignedReviewer(
  reviewers: GitPullRequestReviewer[] | undefined,
  userIdOrIdentities: string | readonly UserIdentityInput[] | undefined,
  userUniqueName?: string | undefined,
): boolean {
  return findReviewerEntryForUser(reviewers, userIdOrIdentities, userUniqueName) != null
}
