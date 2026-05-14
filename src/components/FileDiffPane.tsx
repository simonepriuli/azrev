import { parseDiffFromFile } from '@pierre/diffs'
import { FileDiff } from '@pierre/diffs/react'
import { useMemo } from 'react'

type Props = {
  displayPath: string
  oldText: string
  newText: string
}

export function FileDiffPane({ displayPath, oldText, newText }: Props) {
  const fileDiff = useMemo(() => {
    try {
      return parseDiffFromFile(
        { name: displayPath, contents: oldText },
        { name: displayPath, contents: newText },
      )
    } catch {
      return null
    }
  }, [displayPath, oldText, newText])

  if (!fileDiff) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
        Unable to compute a diff for this file (it may be too large or not text-based).
      </div>
    )
  }

  return (
    <div className="scroll-viewport min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
      <FileDiff
        key={displayPath}
        fileDiff={fileDiff}
        disableWorkerPool
        options={{
          theme: 'pierre-light',
          diffStyle: 'unified',
          overflow: 'wrap',
        }}
      />
    </div>
  )
}
