import { parseDiffFromFile, setLanguageOverride } from '@pierre/diffs'
import type { DiffLineAnnotation, OnDiffLineClickProps } from '@pierre/diffs'
import { FileDiff, Virtualizer } from '@pierre/diffs/react'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'

export type InlineThreadAnnotation = {
  threadId: number
  commentCount: number
  preview: string
}

export type InlineCommentDraft = {
  lineNumber: number
  lineText: string
}

type Props = {
  displayPath: string
  oldText: string
  newText: string
  inlineThreadAnnotations?: DiffLineAnnotation<InlineThreadAnnotation>[]
  inlineCommentPending?: boolean
  onCreateInlineThread?: (draft: InlineCommentDraft, content: string) => Promise<void>
}

function getAdditionLineText(newText: string, lineNumber: number): string {
  return newText.split(/\r?\n/)[lineNumber - 1] ?? ''
}

export function FileDiffPane({
  displayPath,
  oldText,
  newText,
  inlineThreadAnnotations = [],
  inlineCommentPending = false,
  onCreateInlineThread,
}: Props) {
  const [draft, setDraft] = useState<InlineCommentDraft | null>(null)
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fileDiff = useMemo(() => {
    try {
      const oldFile = {
        name: displayPath,
        contents: oldText,
        cacheKey: `${displayPath}:old:${oldText.length}`,
        lang: 'text' as const,
      }
      const newFile = {
        name: displayPath,
        contents: newText,
        cacheKey: `${displayPath}:new:${newText.length}`,
        lang: 'text' as const,
      }

      return setLanguageOverride(
        parseDiffFromFile(oldFile, newFile, { context: 3 }),
        'text',
      )
    } catch {
      return null
    }
  }, [displayPath, newText, oldText])

  const startInlineComment = (line: OnDiffLineClickProps) => {
    if (line.annotationSide !== 'additions') {
      setError('Inline comments can be added by clicking a right-side line number.')
      return
    }
    setError(null)
    setDraft({
      lineNumber: line.lineNumber,
      lineText: getAdditionLineText(newText, line.lineNumber),
    })
  }

  const submitInlineComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft || !content.trim() || inlineCommentPending || !onCreateInlineThread) return

    setError(null)
    try {
      await onCreateInlineThread(draft, content.trim())
      setContent('')
      setDraft(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post inline comment')
    }
  }

  if (!fileDiff) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
        Unable to compute a diff for this file.
      </div>
    )
  }

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      {draft || error ? (
        <div className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
          {draft ? (
            <form className="space-y-2" onSubmit={submitInlineComment}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-700">
                  Comment on line {draft.lineNumber}
                </p>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => {
                    setDraft(null)
                    setContent('')
                    setError(null)
                  }}
                >
                  Cancel
                </button>
              </div>
              <textarea
                className="min-h-20 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                value={content}
                placeholder="Add an inline comment..."
                onChange={(event) => setContent(event.target.value)}
              />
              {error ? <p className="text-xs text-red-600">{error}</p> : null}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg border border-slate-900 bg-slate-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50"
                  disabled={!content.trim() || inlineCommentPending}
                >
                  {inlineCommentPending ? 'Posting...' : 'Comment'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3 text-xs text-amber-800">
              <span>{error}</span>
              <button
                type="button"
                className="rounded px-2 py-1 font-medium hover:bg-amber-50"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      ) : null}
      <Virtualizer
        className="min-h-0 min-w-0 flex-1 overflow-auto bg-white"
        contentClassName="min-h-full min-w-full"
        config={{
          overscrollSize: 300,
        }}
      >
        <FileDiff<InlineThreadAnnotation>
          key={fileDiff.cacheKey ?? displayPath}
          fileDiff={fileDiff}
          lineAnnotations={inlineThreadAnnotations}
          renderAnnotation={(annotation) => (
            <div className="mx-12 my-1 rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-950">
              <span className="font-medium">
                {annotation.metadata.commentCount}{' '}
                {annotation.metadata.commentCount === 1 ? 'comment' : 'comments'}
              </span>
              {annotation.metadata.preview ? (
                <span className="ml-2 text-cyan-800">{annotation.metadata.preview}</span>
              ) : null}
            </div>
          )}
          metrics={{
            hunkLineCount: 50,
            lineHeight: 20,
            diffHeaderHeight: 44,
            hunkSeparatorHeight: 32,
            fileGap: 8,
          }}
          options={{
            diffStyle: 'unified',
            hunkSeparators: 'line-info-basic',
            lineDiffType: 'none',
            maxLineDiffLength: 0,
            tokenizeMaxLineLength: 200,
            overflow: 'wrap',
            lineHoverHighlight: onCreateInlineThread ? 'line' : 'disabled',
            onLineNumberClick: onCreateInlineThread ? startInlineComment : undefined,
          }}
        />
      </Virtualizer>
    </div>
  )
}
