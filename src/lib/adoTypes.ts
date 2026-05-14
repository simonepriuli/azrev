export type TeamProjectReference = {
  id: string
  name: string
}

export type GitRepository = {
  id: string
  name: string
}

export type AdoIdentityRef = {
  id?: string
  displayName?: string
  uniqueName?: string
  descriptor?: string
  subjectDescriptor?: string
  providerDisplayName?: string
  customDisplayName?: string
  mailAddress?: string
  emailAddress?: string
  properties?: Record<
    string,
    | string
    | {
        $value?: string
        value?: string
      }
    | undefined
  >
  isContainer?: boolean
  memberOf?: AdoIdentityRef[]
  members?: AdoIdentityRef[]
  memberIds?: string[]
}

export type GitPullRequestReviewer = AdoIdentityRef & {
  vote?: number
  isRequired?: boolean
  /** Votes rolled up from group/team members (see Azure DevOps IdentityRefWithVote). */
  votedFor?: GitPullRequestReviewer[]
}

export type GitPullRequest = {
  pullRequestId: number
  title: string
  status: string
  creationDate?: string
  sourceRefName?: string
  targetRefName?: string
  reviewers?: GitPullRequestReviewer[]
}

export type GitPullRequestDetail = GitPullRequest & {
  createdBy?: { displayName?: string }
  description?: string
  isDraft?: boolean
  mergeStatus?: string
  lastMergeSourceCommit?: { commitId?: string }
  lastMergeTargetCommit?: { commitId?: string }
}

export type AdoConnectionData = {
  authenticatedUser?: AdoIdentityRef
  authorizedUser?: AdoIdentityRef
}

export type GitPullRequestIteration = {
  id: number
  sourceRefCommit?: { commitId?: string }
  targetRefCommit?: { commitId?: string }
}

export type GitPullRequestChangeEntry = {
  changeType: number | string
  item?: {
    path?: string
    gitObjectType?: string
    objectId?: string
  }
}

export type PagedResult<T> = {
  value: T[]
  count?: number
}
