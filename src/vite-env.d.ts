/// <reference types="vite/client" />

declare global {
  interface Window {
    azrev?: {
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
        }) => Promise<
          | { status: number; contentType: string | null; kind: 'json'; json: unknown }
          | { status: number; contentType: string | null; kind: 'text'; text: string }
        >
      }
    }
  }
}

export {}
