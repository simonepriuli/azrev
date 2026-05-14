import { parseDiffFromFile, setLanguageOverride } from '@pierre/diffs'
import { FileDiff, Virtualizer } from '@pierre/diffs/react'
import { useMemo } from 'react'

type Props = {
  displayPath: string
  oldText: string
  newText: string
}

export function FileDiffPane({ displayPath, oldText, newText }: Props) {
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

  if (!fileDiff) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
        Unable to compute a diff for this file.
      </div>
    )
  }

  return (
    <Virtualizer
      className="min-h-0 min-w-0 flex-1 overflow-auto bg-white"
      contentClassName="min-h-full min-w-full"
      config={{
        overscrollSize: 300,
      }}
    >
      <FileDiff
        key={fileDiff.cacheKey ?? displayPath}
        fileDiff={fileDiff}
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
        }}
      />
    </Virtualizer>
  )
}
