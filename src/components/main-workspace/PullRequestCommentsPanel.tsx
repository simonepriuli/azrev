import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import type { AdoComment, GitPullRequestCommentThread } from '../../lib/adoTypes'
import { formatRelativeShort } from '../../lib/formatRelativeShort'

type PullRequestCommentsPanelProps = {
  threads: GitPullRequestCommentThread[]
  loading: boolean
  error: unknown
  creatingThread: boolean
  replyingThread: boolean
  selectedFilePath: string | null
  onCreateGeneralComment: (content: string) => Promise<void>
  onReplyToThread: (threadId: number, parentCommentId: number, content: string) => Promise<void>
  onSelectThreadFile: (path: string) => void
}

type CommentFormProps = {
  label: string
  placeholder: string
  submitLabel: string
  disabled?: boolean
  onSubmit: (content: string) => Promise<void>
}

function errorMessage(error: unknown): string | null {
  if (!error) return null
  return error instanceof Error ? error.message : 'Could not load comments'
}

function activeComments(thread: GitPullRequestCommentThread): AdoComment[] {
  return (thread.comments ?? []).filter((comment) => !comment.isDeleted)
}

function threadAnchorCommentId(thread: GitPullRequestCommentThread): number | null {
  return activeComments(thread)[0]?.id ?? null
}

function threadLocation(thread: GitPullRequestCommentThread): string {
  const context = thread.threadContext
  const path = context?.filePath
  const line = context?.rightFileStart?.line ?? context?.leftFileStart?.line
  if (!path) return 'General'
  return line != null ? `${path}:${line}` : path
}

function threadFilePath(thread: GitPullRequestCommentThread): string | null {
  return thread.threadContext?.filePath ?? null
}

function compareThreads(a: GitPullRequestCommentThread, b: GitPullRequestCommentThread): number {
  const aTime = new Date(a.lastUpdatedDate ?? a.publishedDate ?? 0).getTime()
  const bTime = new Date(b.lastUpdatedDate ?? b.publishedDate ?? 0).getTime()
  return bTime - aTime
}

function CommentForm({ label, placeholder, submitLabel, disabled, onSubmit }: CommentFormProps) {
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const trimmed = content.trim()

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!trimmed || disabled) return
    setError(null)
    try {
      await onSubmit(trimmed)
      setContent('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post comment')
    }
  }

  return (
    <form className="space-y-2" onSubmit={submit}>
      <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </label>
      <textarea
        className="min-h-20 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        value={content}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => setContent(event.target.value)}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-lg border border-slate-900 bg-slate-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50"
          disabled={!trimmed || disabled}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

function Comment({ comment }: { comment: AdoComment }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-slate-800">
          {comment.author?.displayName ?? 'Unknown author'}
        </span>
        <span className="shrink-0 text-[11px] text-slate-400">
          {formatRelativeShort(comment.publishedDate)}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-5 text-slate-700">{comment.content}</p>
    </div>
  )
}

function ThreadCard({
  thread,
  replying,
  selectedFilePath,
  onReplyToThread,
  onSelectThreadFile,
}: {
  thread: GitPullRequestCommentThread
  replying: boolean
  selectedFilePath: string | null
  onReplyToThread: PullRequestCommentsPanelProps['onReplyToThread']
  onSelectThreadFile: (path: string) => void
}) {
  const comments = activeComments(thread)
  const anchorCommentId = threadAnchorCommentId(thread)
  const filePath = threadFilePath(thread)
  const isSelectedFileThread = filePath != null && filePath === selectedFilePath

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
        {filePath ? (
          <button
            type="button"
            className={`min-w-0 truncate rounded-md px-1.5 py-0.5 text-left font-mono text-[11px] ${
              isSelectedFileThread
                ? 'bg-cyan-50 text-cyan-700'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
            title={threadLocation(thread)}
            onClick={() => onSelectThreadFile(filePath)}
          >
            {threadLocation(thread)}
          </button>
        ) : (
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
            General
          </span>
        )}
        <span className="shrink-0 text-[11px] text-slate-400">
          {formatRelativeShort(thread.lastUpdatedDate ?? thread.publishedDate)}
        </span>
      </div>

      <div className="space-y-2">
        {comments.length > 0 ? (
          comments.map((comment) => <Comment key={comment.id} comment={comment} />)
        ) : (
          <p className="text-sm text-slate-500">No visible comments in this thread.</p>
        )}
      </div>

      {anchorCommentId != null ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <CommentForm
            label="Reply"
            placeholder="Write a reply..."
            submitLabel={replying ? 'Replying...' : 'Reply'}
            disabled={replying}
            onSubmit={(content) => onReplyToThread(thread.id, anchorCommentId, content)}
          />
        </div>
      ) : null}
    </article>
  )
}

export function PullRequestCommentsPanel({
  threads,
  loading,
  error,
  creatingThread,
  replyingThread,
  selectedFilePath,
  onCreateGeneralComment,
  onReplyToThread,
  onSelectThreadFile,
}: PullRequestCommentsPanelProps) {
  const visibleThreads = useMemo(
    () => threads.filter((thread) => !thread.isDeleted).sort(compareThreads),
    [threads],
  )
  const loadError = errorMessage(error)

  return (
    <div className="app-region-drag flex h-full min-h-0 w-full min-w-0 flex-col bg-white">
      <div className="app-region-no-drag min-h-0 flex-1 overflow-y-auto bg-white px-3 py-3">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Comments
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <CommentForm
            label="General comment"
            placeholder="Add a comment to this pull request..."
            submitLabel={creatingThread ? 'Posting...' : 'Comment'}
            disabled={creatingThread}
            onSubmit={onCreateGeneralComment}
          />
        </div>

        <div className="mt-4 space-y-3">
          {loading ? <p className="text-sm text-slate-500">Loading comments...</p> : null}
          {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
          {!loading && !loadError && visibleThreads.length === 0 ? (
            <p className="text-sm text-slate-500">No comments yet.</p>
          ) : null}
          {visibleThreads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              replying={replyingThread}
              selectedFilePath={selectedFilePath}
              onReplyToThread={onReplyToThread}
              onSelectThreadFile={onSelectThreadFile}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
