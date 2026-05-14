import { contextBridge, ipcRenderer } from 'electron'

export type AdoRequestPayload = {
  organization: string
  pathAfterOrg: string
  method?: string
  body?: unknown
  accept?: string
}

export type AdoResponse =
  | { status: number; contentType: string | null; kind: 'json'; json: unknown }
  | { status: number; contentType: string | null; kind: 'text'; text: string }

contextBridge.exposeInMainWorld('azrev', {
  auth: {
    setConnection: (payload: { organization: string; pat: string }) =>
      ipcRenderer.invoke('auth:set-connection', payload) as Promise<{ ok: true }>,
    clearConnection: () => ipcRenderer.invoke('auth:clear-connection') as Promise<{ ok: true }>,
    getStatus: () =>
      ipcRenderer.invoke('auth:get-status') as Promise<{
        configured: boolean
        organization?: string
      }>,
  },
  ado: {
    request: (payload: AdoRequestPayload) =>
      ipcRenderer.invoke('ado:request', payload) as Promise<AdoResponse>,
  },
})
