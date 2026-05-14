import { WorkerPoolContextProvider } from '@pierre/diffs/react'
import type { ReactNode } from 'react'

/**
 * Per Diffs docs: Vite needs `worker.format: 'es'` and a worker factory.
 * @see https://diffs.com/docs — Worker Pool → Vite + React
 */
function createDiffWorker(): Worker {
  return new Worker(new URL('@pierre/diffs/worker/worker.js', import.meta.url), {
    type: 'module',
  })
}

export function DiffWorkerProvider({ children }: { children: ReactNode }) {
  return (
    <WorkerPoolContextProvider
      poolOptions={{
        workerFactory: createDiffWorker,
        poolSize: 1,
      }}
      highlighterOptions={{
        preferredHighlighter: 'shiki-js',
        langs: ['text'],
        lineDiffType: 'none',
        maxLineDiffLength: 0,
        tokenizeMaxLineLength: 200,
        useTokenTransformer: false,
      }}
    >
      {children}
    </WorkerPoolContextProvider>
  )
}
