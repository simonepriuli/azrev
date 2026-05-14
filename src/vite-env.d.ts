/// <reference types="vite/client" />

declare global {
  interface Window {
    azrev?: {
      platform?: NodeJS.Platform
      nativeVibrancyEnabled?: boolean
      auth: {
        setConnection: (payload: {
          organization: string
          pat: string
        }) => Promise<{ ok: true }>
        clearConnection: () => Promise<{ ok: true }>
        getStatus: () => Promise<{ configured: boolean; organization?: string }>
      }
      ado: {
        request: (payload: {
          organization: string
          pathAfterOrg: string
          method?: string
          body?: unknown
          accept?: string
          service?: 'dev' | 'vssps'
        }) => Promise<
          | { success: true; status: number; contentType: string | null; kind: 'json'; json: unknown }
          | { success: true; status: number; contentType: string | null; kind: 'text'; text: string }
          | { success: false; status: number; message: string }
        >
      }
    }
  }
}

export {}
