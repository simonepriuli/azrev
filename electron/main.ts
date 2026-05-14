import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Buffer } from 'node:buffer'
import { app, BrowserWindow, ipcMain, safeStorage } from 'electron'

const hardwareAccelerationEnabled = process.env.AZREV_ENABLE_HARDWARE_ACCELERATION === '1'
const nativeVibrancyEnabled =
  process.platform === 'darwin' &&
  process.env.AZREV_DISABLE_NATIVE_VIBRANCY !== '1'

// Keep the default renderer path boring and software-rendered. The native macOS
// transparent/vibrancy path can make Chromium's GPU process take the renderer down.
if (!hardwareAccelerationEnabled) {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

const AUTH_FILE = () => path.join(app.getPath('userData'), 'pat.enc')
const SETTINGS_FILE = () => path.join(app.getPath('userData'), 'settings.json')

type Settings = {
  organization: string
}

const MAX_TEXT_RESPONSE_BYTES = 2 * 1024 * 1024

type LimitedTextResult =
  | { ok: true; text: string }
  | { ok: false; bytesRead: number }

function readSettings(): Settings | null {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE(), 'utf-8')
    return JSON.parse(raw) as Settings
  } catch {
    return null
  }
}

function writeSettings(settings: Settings) {
  fs.mkdirSync(path.dirname(SETTINGS_FILE()), { recursive: true })
  fs.writeFileSync(SETTINGS_FILE(), JSON.stringify(settings, null, 2), 'utf-8')
}

function clearSettings() {
  try {
    fs.unlinkSync(SETTINGS_FILE())
  } catch {
    /* ignore */
  }
}

function readPat(): string | null {
  try {
    const buf = fs.readFileSync(AUTH_FILE())
    if (!safeStorage.isEncryptionAvailable()) {
      return buf.toString('utf-8')
    }
    return safeStorage.decryptString(buf)
  } catch {
    return null
  }
}

function writePat(pat: string) {
  fs.mkdirSync(path.dirname(AUTH_FILE()), { recursive: true })
  if (!safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(AUTH_FILE(), pat, 'utf-8')
    return
  }
  const encrypted = safeStorage.encryptString(pat)
  fs.writeFileSync(AUTH_FILE(), encrypted)
}

function clearPat() {
  try {
    fs.unlinkSync(AUTH_FILE())
  } catch {
    /* ignore */
  }
}

/**
 * Builds https://dev.azure.com/{org}/{path...} with query string applied correctly.
 * `pathAfterOrg` may include `?foo=bar` — that part must not be URL-encoded into the path
 * (ADO returns HTTP 400 "dangerous Request.Path" when `?` ends up inside the path).
 */
function buildAdoUrl(organization: string, pathAfterOrg: string): URL {
  const trimmed = pathAfterOrg.replace(/^\/+/, '')
  const q = trimmed.indexOf('?')
  const pathOnly = q === -1 ? trimmed : trimmed.slice(0, q)
  const queryPart = q === -1 ? '' : trimmed.slice(q + 1)

  const segments = [organization, ...pathOnly.split('/').filter(Boolean)]
  const encodedPath = segments.map((s) => encodeURIComponent(s)).join('/')
  const url = new URL(`https://dev.azure.com/${encodedPath}`)

  if (queryPart.length > 0) {
    const incoming = new URLSearchParams(queryPart)
    incoming.forEach((value, key) => {
      url.searchParams.set(key, value)
    })
  }

  return url
}

function assertSafePath(pathAfterOrg: string) {
  if (!pathAfterOrg) {
    throw new Error('Invalid path')
  }
  const pathOnly = pathAfterOrg.split('?')[0] ?? ''
  if (pathOnly.includes('..')) {
    throw new Error('Invalid path')
  }
  const lower = pathAfterOrg.toLowerCase()
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    throw new Error('Invalid path')
  }
}

function basicAuthHeader(pat: string): string {
  const token = Buffer.from(`:${pat}`, 'utf-8').toString('base64')
  return `Basic ${token}`
}

async function readLimitedText(res: Response): Promise<LimitedTextResult> {
  const contentLength = Number.parseInt(res.headers.get('content-length') ?? '', 10)
  if (Number.isFinite(contentLength) && contentLength > MAX_TEXT_RESPONSE_BYTES) {
    return { ok: false, bytesRead: contentLength }
  }

  if (!res.body) {
    const text = await res.text()
    const bytesRead = Buffer.byteLength(text, 'utf-8')
    return bytesRead > MAX_TEXT_RESPONSE_BYTES
      ? { ok: false, bytesRead }
      : { ok: true, text }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  const parts: string[] = []
  let bytesRead = 0

  let next = await reader.read()
  while (!next.done) {
    const { value } = next
    bytesRead += value.byteLength
    if (bytesRead > MAX_TEXT_RESPONSE_BYTES) {
      await reader.cancel()
      return { ok: false, bytesRead }
    }
    parts.push(decoder.decode(value, { stream: true }))
    next = await reader.read()
  }

  parts.push(decoder.decode())
  return { ok: true, text: parts.join('') }
}

let win: BrowserWindow | null

function createWindow() {
  const isDarwin = process.platform === 'darwin'
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: nativeVibrancyEnabled ? '#00000000' : '#f8fafc',
    icon: path.join(process.env.VITE_PUBLIC!, 'electron-vite.svg'),
    ...(isDarwin
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { x: 14, y: 14 },
          ...(nativeVibrancyEnabled
            ? {
                transparent: true,
                vibrancy: 'sidebar' as const,
              }
            : {}),
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('[AzRev] renderer process gone', details)
  })

  win.webContents.on('unresponsive', () => {
    console.error('[AzRev] renderer became unresponsive')
  })

  if (VITE_DEV_SERVER_URL) {
    void win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    void win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.handle(
  'auth:set-connection',
  async (_event, payload: { organization: string; pat: string }) => {
    const organization = payload.organization.trim()
    const pat = payload.pat.trim()
    if (!organization || !pat) {
      throw new Error('Organization and PAT are required')
    }
    writeSettings({ organization })
    writePat(pat)
    return { ok: true as const }
  },
)

ipcMain.handle('auth:clear-connection', async () => {
  clearPat()
  clearSettings()
  return { ok: true as const }
})

ipcMain.handle('auth:get-status', async () => {
  const settings = readSettings()
  const pat = readPat()
  return {
    configured: Boolean(settings?.organization && pat),
    organization: settings?.organization,
  }
})

ipcMain.handle(
  'ado:request',
  async (
    _event,
    payload: {
      organization: string
      pathAfterOrg: string
      method?: string
      body?: unknown
      accept?: string
    },
  ) => {
    const pat = readPat()
    const settings = readSettings()
    if (!pat || !settings?.organization) {
      throw new Error('Not authenticated')
    }
    const organization = payload.organization.trim()
    if (organization !== settings.organization) {
      throw new Error('Organization mismatch')
    }
    assertSafePath(payload.pathAfterOrg)
    const url = buildAdoUrl(organization, payload.pathAfterOrg)
    if (url.hostname !== 'dev.azure.com') {
      throw new Error('Unexpected host')
    }
    if (!url.searchParams.has('api-version')) {
      url.searchParams.set('api-version', '7.1')
    }
    const method = payload.method ?? 'GET'
    const headers: Record<string, string> = {
      Authorization: basicAuthHeader(pat),
      Accept: payload.accept ?? 'application/json',
    }
    const init: RequestInit = { method, headers }
    if (payload.body !== undefined && method !== 'GET' && method !== 'HEAD') {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(payload.body)
    }
    const res = await fetch(url, init)
    const contentType = res.headers.get('content-type')
    if (!res.ok) {
      const raw = await res.text()
      let msg = `Azure DevOps request failed (${res.status})`
      try {
        const j = JSON.parse(raw) as { message?: string }
        if (typeof j.message === 'string' && j.message.length > 0) {
          msg = j.message
        }
      } catch {
        if (raw.trim().length > 0) {
          msg = raw.slice(0, 500)
        }
      }
      return { success: false as const, status: res.status, message: msg }
    }
    if (contentType?.includes('application/json')) {
      const json = (await res.json()) as unknown
      return {
        success: true as const,
        status: res.status,
        contentType,
        kind: 'json' as const,
        json,
      }
    }
    const textResult = await readLimitedText(res)
    if (!textResult.ok) {
      return {
        success: false as const,
        status: 413,
        message: `File response is too large to display safely (${textResult.bytesRead} bytes, limit ${MAX_TEXT_RESPONSE_BYTES} bytes).`,
      }
    }
    return {
      success: true as const,
      status: res.status,
      contentType,
      kind: 'text' as const,
      text: textResult.text,
    }
  },
)

app.whenReady().then(() => {
  createWindow()
})
