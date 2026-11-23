import { describe, expect, it } from 'vitest'
import { DEFAULT_OFF_PROXY, getOffProxy, setOffProxy } from '../../src/db/off'
import { freshDb } from './helpers'

describe('proxy de búsqueda en internet', () => {
  it('sin configurar usa el de fábrica', async () => {
    const db = await freshDb()
    expect(await getOffProxy(db)).toBe(DEFAULT_OFF_PROXY)
    expect(DEFAULT_OFF_PROXY).toMatch(/^https:\/\//)
  })

  it('una URL propia reemplaza la de fábrica', async () => {
    const db = await freshDb()
    await setOffProxy(db, 'https://otro.workers.dev')
    expect(await getOffProxy(db)).toBe('https://otro.workers.dev')
  })

  it('quitarla la apaga y no vuelve a la de fábrica', async () => {
    const db = await freshDb()
    await setOffProxy(db, null)
    expect(await getOffProxy(db)).toBeNull()
  })
})
