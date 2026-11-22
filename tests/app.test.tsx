import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../src/app/routes'
import { TABS } from '../src/app/tabs'

// Las rutas con carga diferida (lazy) se resuelven antes de renderizar.
async function render(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  if (!router.state.initialized) {
    await new Promise<void>((done) => {
      const off = router.subscribe((st) => {
        if (st.initialized) {
          off()
          done()
        }
      })
    })
  }
  return renderToString(<RouterProvider router={router} />)
}

describe('app shell', () => {
  it('muestra las 5 tabs en orden', async () => {
    expect(TABS.map((t) => t.label)).toEqual(['Hoy', 'Entreno', 'Comida', 'Progreso', 'Perfil'])
    const html = await render('/hoy')
    for (const { path } of TABS) expect(html).toContain(`href="${path}"`)
  })

  it.each([
    ['/hoy', 'Hoy'],
    ['/entreno', 'Entreno'],
    ['/comida', 'Comida'],
    ['/progreso', 'Progreso'],
    ['/perfil', 'Perfil'],
  ])('%s abre la pantalla %s y marca su tab', async (path, title) => {
    const html = await render(path)
    expect(html).toContain(`<h1>${title}</h1>`)
    expect(html).toMatch(new RegExp(`aria-current="page"[^>]*href="${path}"|href="${path}"[^>]*aria-current="page"`))
  })

  it('las rutas desconocidas no truenan', async () => {
    await expect(render('/no-existe')).resolves.toBeTypeOf('string')
  })
})
