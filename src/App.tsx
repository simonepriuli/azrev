import { useQueryClient } from '@tanstack/react-query'
import { ConnectForm } from './components/ConnectForm'
import { MainWorkspace } from './components/MainWorkspace'
import { useAuthStatus } from './queries/adoQueries'

export default function App() {
  const qc = useQueryClient()
  const auth = useAuthStatus()

  if (auth.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        Starting…
      </div>
    )
  }

  if (auth.error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-slate-950 px-4 text-center text-red-400">
        <p>Could not read connection status.</p>
        <button
          type="button"
          className="text-sm text-cyan-400 hover:underline"
          onClick={() => void qc.invalidateQueries({ queryKey: ['auth'] })}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!auth.data?.configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <ConnectForm />
      </div>
    )
  }

  return <MainWorkspace />
}
