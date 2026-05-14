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
  | { success: true; status: number; contentType: string | null; kind: 'json'; json: unknown }
  | { success: true; status: number; contentType: string | null; kind: 'text'; text: string }
  | { success: false; status: number; message: string }

declare global {
  interface Window {
    azrev: {
      platform: NodeJS.Platform
      nativeVibrancyEnabled: boolean
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
