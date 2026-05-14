import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

export function ConnectForm() {
  const qc = useQueryClient()
  const [organization, setOrganization] = useState('')
  const [pat, setPat] = useState('')
  const [error, setError] = useState<string | null>(null)

  const connect = useMutation({
    mutationFn: async () => {
      setError(null)
      if (!window.azrev) {
        throw new Error('Electron bridge unavailable')
      }
      await window.azrev.auth.setConnection({
        organization: organization.trim(),
        pat: pat.trim(),
      })
    },
    onSuccess: async () => {
      setPat('')
      await qc.invalidateQueries({ queryKey: ['auth'] })
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : 'Connection failed')
    },
  })

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Connect to Azure DevOps</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create a PAT with <strong className="text-slate-800">Code (Read)</strong> and{' '}
          <strong className="text-slate-800">Project and team (Read)</strong>, then paste it here.
          It is stored encrypted with the OS keychain when available.
        </p>
      </div>
      <label className="block text-sm">
        <span className="text-slate-700">Organization</span>
        <input
          className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none ring-slate-400/40 focus:ring-2"
          placeholder="e.g. contoso"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          autoComplete="off"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-700">Personal access token</span>
        <input
          className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm outline-none ring-slate-400/40 focus:ring-2"
          type="password"
          placeholder="••••••••••••••••••••"
          value={pat}
          onChange={(e) => setPat(e.target.value)}
          autoComplete="off"
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-600 disabled:opacity-50"
        disabled={connect.isPending || !organization.trim() || !pat.trim()}
        onClick={() => connect.mutate()}
      >
        {connect.isPending ? 'Saving…' : 'Save and continue'}
      </button>
    </div>
  )
}
