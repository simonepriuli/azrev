import { useMemo } from 'react'
import { parseDiffFromFile } from '@pierre/diffs'
import { FileDiff } from '@pierre/diffs/react'

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
      <div className="rounded border border-amber-900/60 bg-amber-950/40 p-4 text-amber-100">
        Unable to compute a diff for this file (it may be too large or not text-based).
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded border border-slate-800 bg-slate-950 p-2">
      <FileDiff
        fileDiff={fileDiff}
        options={{
          theme: 'pierre-dark',
          diffStyle: 'unified',
          overflow: 'wrap',
        }}
      />
    </div>
  )
}
