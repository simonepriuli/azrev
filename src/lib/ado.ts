function getAzrev() {
  const api = window.azrev
  if (!api) {
    throw new Error('AZrev must run inside the Electron shell (window.azrev missing).')
  }
  return api
}

/** Git item missing at a commit (add/delete/rename/cross-repo) — treat as empty file for diffs. */
export function isMissingGitItemError(status: number, message: string): boolean {
  if (status === 404) return true
  if (message.includes('TF401174')) return true
  const lower = message.toLowerCase()
  if (lower.includes('could not be found')) return true
  return false
}

type AdoGetJsonOptions = {
  service?: 'dev' | 'vssps'
}

export async function adoGetJson<T>(
  organization: string,
  pathAfterOrg: string,
  options?: AdoGetJsonOptions,
): Promise<T> {
  const res = await getAzrev().ado.request({
    organization,
    pathAfterOrg,
    method: 'GET',
    service: options?.service,
  })
  if (!res.success) {
    throw new Error(res.message)
  }
  if (res.kind !== 'json') {
    throw new Error('Expected JSON from Azure DevOps')
  }
  return res.json as T
}

export async function adoPatchJson<T>(organization: string, pathAfterOrg: string, body: unknown): Promise<T> {
  const res = await getAzrev().ado.request({
    organization,
    pathAfterOrg,
    method: 'PATCH',
    body,
  })
  if (!res.success) {
    throw new Error(res.message)
  }
  if (res.kind !== 'json') {
    throw new Error('Expected JSON from Azure DevOps')
  }
  return res.json as T
}

export async function adoPutJson<T>(organization: string, pathAfterOrg: string, body: unknown): Promise<T> {
  const res = await getAzrev().ado.request({
    organization,
    pathAfterOrg,
    method: 'PUT',
    body,
  })
  if (!res.success) {
    throw new Error(res.message)
  }
  if (res.kind !== 'json') {
    throw new Error('Expected JSON from Azure DevOps')
  }
  return res.json as T
}

export async function adoGetText(organization: string, pathAfterOrg: string): Promise<string> {
  const res = await getAzrev().ado.request({
    organization,
    pathAfterOrg,
    method: 'GET',
    accept: 'text/plain, application/octet-stream;q=0.9, */*;q=0.8',
  })
  if (!res.success) {
    if (isMissingGitItemError(res.status, res.message)) {
      return ''
    }
    throw new Error(res.message)
  }
  if (res.kind === 'text') {
    return res.text
  }
  return JSON.stringify(res.json)
}
