/** Pide a Safari/el navegador que no borre los datos por falta de uso. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.()
    if (!e || e.usage == null || e.quota == null) return null
    return { usage: e.usage, quota: e.quota }
  } catch {
    return null
  }
}
