export type TeamProjectReference = {
  id: string
  name: string
}

export type GitRepository = {
  id: string
  name: string
}

export type GitPullRequest = {
  pullRequestId: number
  title: string
  status: string
  creationDate?: string
  sourceRefName?: string
  targetRefName?: string
}

export type GitPullRequestDetail = GitPullRequest & {
  createdBy?: { displayName?: string }
  description?: string
  lastMergeSourceCommit?: { commitId?: string }
  lastMergeTargetCommit?: { commitId?: string }
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
