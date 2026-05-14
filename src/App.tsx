import { useQueryClient } from '@tanstack/react-query'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ConnectForm } from './components/ConnectForm'
import { MainWorkspace } from './components/MainWorkspace'
import { authStatusQueryKey, useAuthStatus } from './queries/adoQueries'

const electronMacVibrancy =
  typeof window !== 'undefined' && window.azrev?.nativeVibrancyEnabled === true

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
          onClick={() => void qc.invalidateQueries({ queryKey: authStatusQueryKey })}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!auth.data?.configured) {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <div className={`app-region-drag flex min-h-screen items-center justify-center p-6 ${appShellBg}`}>
              <ConnectForm />
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<MainWorkspace />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
