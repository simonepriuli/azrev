function getAzrev() {
  const api = window.azrev
  if (!api) {
    throw new Error('AzRev must run inside the Electron shell (window.azrev missing).')
  }
  return api
}

export async function adoGetJson<T>(organization: string, pathAfterOrg: string): Promise<T> {
  const res = await getAzrev().ado.request({ organization, pathAfterOrg, method: 'GET' })
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
  if (res.kind === 'text') {
    return res.text
  }
  return JSON.stringify(res.json)
}
