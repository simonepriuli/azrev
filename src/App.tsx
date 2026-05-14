import { useQueryClient } from '@tanstack/react-query'
import { ConnectForm } from './components/ConnectForm'
import { MainWorkspace } from './components/MainWorkspace'
import { useAuthStatus } from './queries/adoQueries'

const electronMacVibrancy =
  typeof window !== 'undefined' && window.azrev?.platform === 'darwin'

const appShellBg = electronMacVibrancy ? 'bg-white' : 'bg-slate-50'

export default function App() {
  const qc = useQueryClient()
  const auth = useAuthStatus()

  if (auth.isLoading) {
    return (
      <div className={`flex h-screen items-center justify-center text-slate-500 ${appShellBg}`}>
        Starting…
      </div>
    )
  }

  if (auth.error) {
    return (
      <div
        className={`flex h-screen flex-col items-center justify-center gap-2 px-4 text-center text-red-600 ${appShellBg}`}
      >
        <p>Could not read connection status.</p>
        <button
          type="button"
          className="text-sm font-medium text-cyan-700 hover:underline"
          onClick={() => void qc.invalidateQueries({ queryKey: ['auth'] })}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!auth.data?.configured) {
    return (
      <div className={`flex min-h-screen items-center justify-center p-6 ${appShellBg}`}>
        <ConnectForm />
      </div>
    )
  }

  return <MainWorkspace />
}
