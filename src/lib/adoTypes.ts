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

export type AdoCommentType = 'unknown' | 'text' | 'codeChange' | 'system' | number

export type AdoComment = {
  id: number
  parentCommentId?: number
  author?: AdoIdentityRef
  content?: string
  publishedDate?: string
  lastUpdatedDate?: string
  lastContentUpdatedDate?: string
  commentType?: AdoCommentType
  isDeleted?: boolean
  usersLiked?: AdoIdentityRef[]
}

export type CommentThreadStatus =
  | 'unknown'
  | 'active'
  | 'fixed'
  | 'wontFix'
  | 'closed'
  | 'byDesign'
  | 'pending'
  | number

export type CommentPosition = {
  line: number
  offset: number
}

export type CommentThreadContext = {
  filePath?: string
  leftFileStart?: CommentPosition | null
  leftFileEnd?: CommentPosition | null
  rightFileStart?: CommentPosition | null
  rightFileEnd?: CommentPosition | null
}

export type CommentIterationContext = {
  firstComparingIteration: number
  secondComparingIteration: number
}

export type GitPullRequestCommentThreadContext = {
  changeTrackingId?: number
  iterationContext?: CommentIterationContext
  trackingCriteria?: {
    firstComparingIteration?: number
    secondComparingIteration?: number
    origFilePath?: string
    origLeftFileStart?: CommentPosition
    origLeftFileEnd?: CommentPosition
    origRightFileStart?: CommentPosition
    origRightFileEnd?: CommentPosition
  }
}

export type GitPullRequestCommentThread = {
  id: number
  comments?: AdoComment[]
  status?: CommentThreadStatus
  threadContext?: CommentThreadContext | null
  pullRequestThreadContext?: GitPullRequestCommentThreadContext | null
  identities?: Record<string, AdoIdentityRef>
  publishedDate?: string
  lastUpdatedDate?: string
  isDeleted?: boolean
  properties?: Record<string, unknown>
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
  isDraft?: boolean
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
  changeTrackingId?: number
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
