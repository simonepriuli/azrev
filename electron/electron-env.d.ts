/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string
    VITE_PUBLIC: string
  }
}

type AzrevAdoRequestPayload = {
  organization: string
  pathAfterOrg: string
  method?: string
  body?: unknown
  accept?: string
}

type AzrevAdoResponse =
  | { status: number; contentType: string | null; kind: 'json'; json: unknown }
  | { status: number; contentType: string | null; kind: 'text'; text: string }

declare global {
  interface Window {
    azrev: {
      auth: {
        setConnection: (payload: {
          organization: string
          pat: string
        }) => Promise<{ ok: true }>
        clearConnection: () => Promise<{ ok: true }>
        getStatus: () => Promise<{ configured: boolean; organization?: string }>
      }
      ado: {
        request: (payload: AzrevAdoRequestPayload) => Promise<AzrevAdoResponse>
      }
    }
  }
}

export {}
